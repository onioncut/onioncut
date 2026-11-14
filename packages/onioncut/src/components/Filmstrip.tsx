import { FC, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Div } from './Div';
import { constants } from '../constants';
import { FilmstripPreference } from '../types/FilmstripPreference';
import { FilmstripStep } from '../types/FilmstripStep';
import { RegisteredScene } from '../types/RegisteredScene';
import { ScrubPosition } from '../types/ScrubPosition';

export type FilmstripProps = {
  scene: RegisteredScene;
  stateId: string;
  isPlaying: boolean;
  // Where the timeline is held, or null; playback that started from it carries on from there.
  scrub: ScrubPosition | null;
  onStateChange: (stateId: string) => void;
  onSeek: (position: ScrubPosition) => void;
};

const stepsOf = (scene: RegisteredScene) => {
  return scene.states.reduce<FilmstripStep[]>((all, state) => {
    const previous = all[all.length - 1];

    return [
      ...all,
      {
        id: state.id,
        start: previous ? previous.start + previous.hold : 0,
        hold: state.hold * 1000,
      },
    ];
  }, []);
};

// The step a moment falls in and how far into it; past the end, the end of the last step.
const positionAt = ({ steps, time }: { steps: FilmstripStep[]; time: number }) => {
  const step = [...steps].reverse().find((candidate) => candidate.start <= time) ?? steps[0];

  return {
    stateId: step.id,
    time: Math.min(step.hold, Math.max(0, time - step.start)),
  };
};

// The first value of a list that is at least the one asked for, or the last one.
const atLeast = ({ values, minimum }: { values: number[]; minimum: number }) => {
  return values.find((value) => value >= minimum) ?? values[values.length - 1];
};

const readPreference = (): FilmstripPreference => {
  try {
    return JSON.parse(window.localStorage.getItem(constants.FILMSTRIP_PREFERENCE_KEY) ?? '{}') as FilmstripPreference;
  } catch {
    return {};
  }
};

const writePreference = (preference: FilmstripPreference) => {
  try {
    window.localStorage.setItem(constants.FILMSTRIP_PREFERENCE_KEY, JSON.stringify(preference));
  } catch {
    // A preview that cannot remember the preference still works; nothing here is worth failing over.
  }
};

// An editor's timecode — minutes, seconds and frames at the recorder's frame rate — so a moment read off the
// preview is the moment in the clip.
const formatTimecode = (milliseconds: number) => {
  const totalFrames = Math.floor((milliseconds / 1000) * constants.FILMSTRIP_TIMECODE_FPS);
  const pad = (value: number) => {
    return String(value).padStart(2, '0');
  };

  return `${pad(Math.floor(totalFrames / constants.FILMSTRIP_TIMECODE_FPS / 60))}:${pad(Math.floor(totalFrames / constants.FILMSTRIP_TIMECODE_FPS) % 60)}:${pad(
    totalFrames % constants.FILMSTRIP_TIMECODE_FPS,
  )}`;
};

const formatTime = (seconds: number) => {
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(seconds * 10 === Math.round(seconds * 10) ? 1 : 2)}s`;
};

// The cut as a timeline in the manner of an editor's: one track at a fixed number of pixels per second,
// scrolled sideways, zoomed in and out (⌘ or Ctrl with the wheel, or the buttons), with a ruler of seconds,
// a lane of the steps — each as long as it holds, named, and opened with a click — and a frame of the scene
// wherever there is room for one. A click or a drag puts
// the playhead there and holds the stage at that moment. The frames are photographs the dev server takes
// and keeps until a file changes; then it says so and they are asked for again.
export const Filmstrip: FC<FilmstripProps> = ({ scene, stateId, isPlaying, scrub, onStateChange, onSeek }) => {
  const steps = useMemo(() => stepsOf(scene), [scene]);
  // As wide as whatever it is put in, measured, since the zoom that fits the whole cut follows from it.
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const activeStep = steps.find((step) => step.id === stateId) ?? steps[0];
  const playedFrom = scrub?.stateId === stateId ? scrub.time : 0;
  // How far into the step on screen the cut is while it plays. The state it belongs to is kept with it, so
  // the first render after playback moves on does not draw the new step with the old step's progress.
  const [played, setPlayed] = useState({ stateId, time: 0 });
  const length = steps.reduce((total, step) => total + step.hold, 0) / 1000;
  const stage = scene.stage ?? constants.STAGE;
  const [frameHeight, setFrameHeight] = useState(() => readPreference().frameHeight ?? constants.FILMSTRIP_FRAME_HEIGHT);
  const frameWidth = (frameHeight * stage.width) / stage.height;
  const fitPxPerSecond = length === 0 ? 1 : Math.max(1, width - constants.FILMSTRIP_LEAD) / length;
  const [pxPerSecond, setPxPerSecond] = useState<number | null>(() => readPreference().zoom?.[scene.key] ?? null);
  const maxPxPerSecond = Math.max(fitPxPerSecond, constants.FILMSTRIP_MAX_PX_PER_SECOND);
  const zoom = Math.min(constants.FILMSTRIP_MAX_PX_PER_SECOND, Math.max(fitPxPerSecond, pxPerSecond ?? fitPxPerSecond));
  const [view, setView] = useState({ left: 0, width });
  const [version, setVersion] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // The cut itself, inset by FILMSTRIP_LEAD inside the track: every position on the timeline is measured from it.
  const cutRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  // Where a zoom wants the timeline scrolled to once it is laid out at its new width: the moment under the
  // pointer stays under the pointer.
  const anchorRef = useRef<{ seconds: number; offset: number } | null>(null);

  useEffect(() => {
    const handleStale = (data: { version: number }) => {
      setVersion(data.version);
    };

    import.meta.hot?.on(constants.FILMSTRIP_STALE_EVENT, handleStale);

    return () => import.meta.hot?.off(constants.FILMSTRIP_STALE_EVENT, handleStale);
  }, []);

  // The height and the zoom are kept across reloads, the zoom per scene: they are preferences, and having them
  // spring back on every refresh while tuning a scene is the small friction the sidebar's state is kept for too.
  useEffect(() => {
    const preference = readPreference();

    writePreference({
      frameHeight,
      zoom: { ...preference.zoom, [scene.key]: pxPerSecond },
    });
  }, [frameHeight, pxPerSecond, scene.key]);

  // Dragging the timeline's top edge makes its frames taller or shorter; the stage above takes what is left.
  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startY = event.clientY;
    const startHeight = frameHeight;
    const handle = event.currentTarget;

    // The drag runs over the stage, and without this it selects the scene's text on the way.
    event.preventDefault();
    document.body.style.userSelect = 'none';
    handle.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      setFrameHeight(Math.min(constants.FILMSTRIP_FRAME_MAX_HEIGHT, Math.max(constants.FILMSTRIP_FRAME_MIN_HEIGHT, Math.round(startHeight + startY - moveEvent.clientY))));
    };
    const handleUp = () => {
      document.body.style.userSelect = '';
      handle.removeEventListener('pointermove', handleMove);
      handle.removeEventListener('pointerup', handleUp);
      handle.removeEventListener('pointercancel', handleUp);
    };

    handle.addEventListener('pointermove', handleMove);
    handle.addEventListener('pointerup', handleUp);
    handle.addEventListener('pointercancel', handleUp);
  };

  // While the cut plays, the playhead runs across the step on screen over its hold, frame by frame — it
  // restarts with every step, and in the preview a per-frame update costs nothing that matters.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = () => {
      setPlayed({
        stateId,
        time: Math.min(activeStep.hold, playedFrom + performance.now() - startedAt),
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [activeStep.hold, isPlaying, playedFrom, stateId]);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => setWidth(root.clientWidth));

    resizeObserver.observe(root);
    setWidth(root.clientWidth);

    return () => resizeObserver.disconnect();
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    if (anchorRef.current) {
      track.scrollLeft = constants.FILMSTRIP_LEAD + anchorRef.current.seconds * zoom - anchorRef.current.offset;
      anchorRef.current = null;
    }

    setView({ left: track.scrollLeft, width: track.clientWidth });
  }, [zoom, width]);

  const zoomTo = ({ next, offset }: { next: number; offset: number }) => {
    const track = trackRef.current;

    if (track) {
      anchorRef.current = {
        seconds: (track.scrollLeft + offset - constants.FILMSTRIP_LEAD) / zoom,
        offset,
      };
    }

    setPxPerSecond(Math.min(constants.FILMSTRIP_MAX_PX_PER_SECOND, Math.max(fitPxPerSecond, next)));
  };

  // A pinch on a trackpad arrives as a wheel with Ctrl held, and ⌘ with the wheel is how editors zoom. Any
  // other wheel scrolls the timeline sideways, an up-and-down wheel included.
  const handleWheel = (event: WheelEvent) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    // Taken over entirely: a pinch would otherwise zoom the whole page, and a wheel scroll it.
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      zoomTo({
        next: zoom * Math.exp(-event.deltaY * 0.01),
        offset: event.clientX - track.getBoundingClientRect().left,
      });

      return;
    }

    // The default was prevented above, so a sideways swipe has to be applied here as well as an up-and-down one.
    track.scrollLeft += Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  };

  // The wheel is listened to directly rather than through React, whose wheel listener is passive and so cannot
  // keep a pinch from zooming the page. The listener is added once and always calls the latest handler.
  const wheelRef = useRef<(event: WheelEvent) => void>(() => undefined);

  useEffect(() => {
    wheelRef.current = handleWheel;
  });

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const handle = (event: WheelEvent) => wheelRef.current(event);

    root.addEventListener('wheel', handle, { passive: false });

    return () => root.removeEventListener('wheel', handle);
  }, []);

  const seekToPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const cut = cutRef.current;

    if (!cut) {
      return;
    }

    const seconds = (event.clientX - cut.getBoundingClientRect().left) / zoom;

    onSeek(positionAt({ steps, time: Math.min(length, Math.max(0, seconds)) * 1000 }));
  };

  // How far into the step on screen the stage is. A step picked rather than scrubbed has run to its end — that
  // pose is what is on the stage — so the playhead, the readout and a copy all stand there, not at its start.
  const timeInStep = isPlaying && played.stateId === stateId ? played.time : scrub?.stateId === stateId ? scrub.time : activeStep.hold;
  const time = activeStep.start + timeInStep;

  const activeIndex = steps.indexOf(activeStep);
  const momentText = `${activeIndex + 1} ${scene.states[activeIndex].label} · ${(time / 1000).toFixed(2)}s (${((time - activeStep.start) / 1000).toFixed(2)}s into the step)`;
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyMoment = () => {
    fetch(constants.FILMSTRIP_COPY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: scene.key,
        stateId,
        time: Math.round(timeInStep),
        text: `${scene.title} — ${formatTimecode(time)} — step ${momentText}`,
      }),
    })
      .then((response) => setCopyState(response.ok ? 'copied' : 'failed'))
      .catch(() => setCopyState('failed'))
      .finally(() => window.setTimeout(() => setCopyState('idle'), constants.FILMSTRIP_COPIED_FOR));
  };

  // Frames side by side, each whole at the stage's shape, so a frame stands for the moment at its left edge
  // and the spacing follows from the zoom. Moments are rounded to FILMSTRIP_TIME_STEP, so scrolling asks for
  // the same photographs again rather than ones a millisecond apart.
  // The view in the cut's own coordinates, past the lead-in.
  const viewLeft = view.left - constants.FILMSTRIP_LEAD;
  const firstFrame = Math.max(0, Math.floor((viewLeft - constants.FILMSTRIP_OVERSCAN) / frameWidth));
  const lastFrame = Math.min(Math.ceil((length * zoom) / frameWidth) - 1, Math.ceil((viewLeft + view.width + constants.FILMSTRIP_OVERSCAN) / frameWidth));
  const frames = Array.from({ length: Math.max(0, lastFrame - firstFrame + 1) }, (_, index) => ({
    left: (firstFrame + index) * frameWidth,
    time: Math.round(((firstFrame + index) * frameWidth * 1000) / zoom / constants.FILMSTRIP_TIME_STEP) * constants.FILMSTRIP_TIME_STEP,
  }));
  const rulerStep = atLeast({
    values: constants.FILMSTRIP_RULER_STEPS,
    minimum: constants.FILMSTRIP_RULER_MIN_GAP / zoom,
  });
  const ticks = Array.from({ length: Math.floor(length / rulerStep) + 1 }, (_, index) => Math.round(index * rulerStep * 1000) / 1000).filter(
    (seconds) => seconds * zoom >= viewLeft - constants.FILMSTRIP_OVERSCAN && seconds * zoom <= viewLeft + view.width + constants.FILMSTRIP_OVERSCAN,
  );

  return (
    <Div ref={rootRef} className="relative flex w-full select-none flex-col font-sans">
      {/* The grip along the top edge: dragged up, the frames grow. */}
      <Div className="absolute inset-x-0 -top-3 h-3 cursor-ns-resize" title="Drag to resize the timeline" onPointerDown={handleResizeStart} />
      <Div className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-gray-400">
        {/* Where the playhead is: the step and the second, in the cut and in the step. A click puts that and the
            frame itself on the clipboard, to be pasted wherever the scene is being talked about. */}
        <button
          type="button"
          title={`${momentText} — copy the step, the time and the frame`}
          onClick={copyMoment}
          className="mr-auto flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-2 py-0.5 tabular-nums hover:border-gray-600 hover:text-gray-200"
        >
          <span className="text-gray-200">{formatTimecode(time)}</span>
          {/* Two sheets, a tick once the copy is in, a cross when it failed. */}
          <svg
            viewBox="0 0 16 16"
            className={['size-3.5', copyState === 'failed' ? 'text-red-400' : copyState === 'copied' ? 'text-emerald-400' : 'text-gray-500'].join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {copyState === 'idle' && (
              <>
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                <path d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
              </>
            )}
            {copyState === 'copied' && <path d="M3 8.5l3 3 7-7" />}
            {copyState === 'failed' && <path d="M4 4l8 8M12 4l-8 8" />}
          </svg>
        </button>
        {/* The zoom as a slider, on a log scale so every stretch of it zooms by the same factor: all the way left
            is the whole cut fitting the width (100 %), all the way right FILMSTRIP_MAX_PX_PER_SECOND. */}
        <Div className="flex items-center gap-2">
          <span className="text-gray-500">−</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={maxPxPerSecond <= fitPxPerSecond ? 0 : Math.log(zoom / fitPxPerSecond) / Math.log(maxPxPerSecond / fitPxPerSecond)}
            onChange={(event) => {
              const next = fitPxPerSecond * (maxPxPerSecond / fitPxPerSecond) ** Number(event.target.value);

              if (Number(event.target.value) === 0) {
                setPxPerSecond(null);

                return;
              }

              zoomTo({ next, offset: view.width / 2 });
            }}
            title="Zoom"
            className="w-40 accent-gray-300"
          />
          <span className="text-gray-500">+</span>
          <Div className="w-12 text-right tabular-nums">{Math.round((zoom / fitPxPerSecond) * 100)} %</Div>
        </Div>
      </Div>

      <Div
        ref={trackRef}
        className="relative overflow-x-auto overflow-y-hidden border-t border-gray-800 bg-gray-900"
        onScroll={(event) =>
          setView({
            left: event.currentTarget.scrollLeft,
            width: event.currentTarget.clientWidth,
          })
        }
      >
        <Div
          className="relative cursor-default"
          style={{
            width: constants.FILMSTRIP_LEAD + length * zoom,
            height: constants.FILMSTRIP_RULER_HEIGHT + constants.FILMSTRIP_STEP_HEIGHT + frameHeight,
          }}
          onPointerDown={(event) => {
            isDraggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            seekToPointer(event);
          }}
          onPointerMove={(event) => isDraggingRef.current && seekToPointer(event)}
          onPointerUp={() => {
            isDraggingRef.current = false;
          }}
        >
          {/* The ruler's bottom line runs through the lead-in too, so the empty start still reads as the timeline. */}
          <Div className="absolute inset-x-0 top-0 border-b border-gray-800" style={{ height: constants.FILMSTRIP_RULER_HEIGHT }} />
          <Div
            ref={cutRef}
            // Clipped to the cut, so the last frame, which starts before its end, does not run past it and leave the
            // whole cut a little wider than the track it is fitted to.
            className="absolute inset-y-0 right-0 overflow-clip"
            style={{ left: constants.FILMSTRIP_LEAD }}
          >
            {/* The ruler of seconds. */}
            <Div className="absolute inset-x-0 top-0 border-b border-gray-800" style={{ height: constants.FILMSTRIP_RULER_HEIGHT }}>
              {ticks.map((seconds) => (
                <Div key={seconds} className="absolute top-0 h-full border-l border-gray-700 pl-1 text-[12px] leading-[26px] tabular-nums text-gray-500" style={{ left: seconds * zoom }}>
                  {formatTime(seconds)}
                </Div>
              ))}
            </Div>

            {/* The steps, each as long as it holds, with its number and label: a click opens it, as picking a
              step always has, and the one on screen is lit. */}
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                title={`${index + 1} ${scene.states[index].label} · ${step.hold / 1000}s`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onStateChange(step.id)}
                className={[
                  // Clipped rather than overflow-hidden, which would make the button its own scroll box and unstick
                  // the label inside it.
                  'absolute flex items-center overflow-clip border-r border-gray-950 text-left text-[13px] whitespace-nowrap',
                  step.id === stateId ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                ].join(' ')}
                style={{
                  left: (step.start / 1000) * zoom,
                  width: (step.hold / 1000) * zoom,
                  top: constants.FILMSTRIP_RULER_HEIGHT,
                  height: constants.FILMSTRIP_STEP_HEIGHT,
                }}
              >
                {/* Kept at the left edge of the view while the step runs on past it, so a step zoomed into is still named. */}
                <span className="sticky left-0 flex min-w-0 items-center gap-1 px-1.5">
                  <span className="tabular-nums text-gray-500">{index + 1}</span>
                  <span className="truncate">{scene.states[index].label}</span>
                </span>
              </button>
            ))}

            {frames.map((frame) => (
              <img
                key={frame.left}
                src={`${constants.FILMSTRIP_ROUTE}?scene=${encodeURIComponent(scene.key)}&t=${frame.time}&v=${version}`}
                alt=""
                // At the stage's own shape, whole and undistorted.
                className="pointer-events-none absolute border-r border-gray-950"
                style={{
                  left: frame.left,
                  top: constants.FILMSTRIP_RULER_HEIGHT + constants.FILMSTRIP_STEP_HEIGHT,
                  width: frameWidth,
                  height: frameHeight,
                }}
              />
            ))}

            {/* Where every step starts, carried down through the frames. */}
            {steps.map((step) => (
              <Div
                key={step.id}
                className="pointer-events-none absolute bottom-0 border-l border-sky-400/60"
                style={{
                  left: (step.start / 1000) * zoom,
                  top: constants.FILMSTRIP_RULER_HEIGHT,
                }}
              />
            ))}
          </Div>

          {/* Outside the clipped cut, so at zero half of it is not cut away. */}
          <Div className="pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(3,7,18)]" style={{ left: constants.FILMSTRIP_LEAD + (time / 1000) * zoom }} />
        </Div>
      </Div>
    </Div>
  );
};
