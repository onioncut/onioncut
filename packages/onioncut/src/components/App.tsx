import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { fontSpecs } from 'virtual:onioncut-fonts';
import { SceneSidebar } from './SceneSidebar';
import { StateSwitcher } from './StateSwitcher';
import { constants } from '../constants';
import { Div } from './Div';
import { useSceneMusic } from '../hooks/useSceneMusic';
import { findScene } from '../registry';
import { ScrubPosition } from '../types/ScrubPosition';

const urlParams = () => {
  return new URLSearchParams(window.location.search);
};

// Kept across reloads: the sidebar is a preference, and having it spring back open on every refresh
// while tuning a scene is exactly the kind of small friction that adds up.
const readSidebarPreference = () => {
  try {
    return window.localStorage.getItem('onioncut-sidebar') !== 'closed';
  } catch {
    return true;
  }
};

export const App: FC = () => {
  const scene = useMemo(() => findScene(urlParams().get('scene')), []);
  const [areFontsReady, setAreFontsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [stateId, setStateId] = useState<string>(() => scene.states.find((state) => state.id === urlParams().get('state'))?.id ?? scene.states[0].id);
  const [isRecording, setIsRecording] = useState(() => urlParams().get('recording') === '1');
  // A recording that keeps the frame around the stage and the row of steps under it — the tool as it
  // looks in use, for marketing. The sidebar stays out of it either way.
  const isMarketing = useMemo(() => urlParams().get('marketing') === '1', []);
  const isTransparent = useMemo(() => urlParams().get('transparent') === '1', []);
  const [isPlaying, setIsPlaying] = useState(false);
  // Counted rather than derived from the state id, because the recorder asks for the first step while the
  // page is already showing it: the id does not change, and without this the playhead would keep the run it
  // started on load — which the recorder then parks at its end, so the step opens where it should close.
  const [stateRun, setStateRun] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(readSidebarPreference);
  // Where the timeline is being held, and the animations paused there. Kept in a ref as well as in state
  // because playback has to let exactly these go again, and a re-render must not lose them.
  const [scrub, setScrub] = useState<ScrubPosition | null>(null);
  // The paused animations and the step they belong to. Kept together, because after playback has moved on
  // they are the previous step's and seeking them would pose the wrong picture.
  const scrubbed = useRef<{ stateId: string; animations: Animation[] }>({ stateId: '', animations: [] });
  // When the step on screen started playing, and how far into it that was, so pausing can freeze the
  // picture where it actually is rather than at the start of the step.
  const playedSince = useRef({ at: 0, from: 0 });
  const [layout, setLayout] = useState({ scale: 1, margin: 0 });

  const stateIndex = scene.states.findIndex((state) => state.id === stateId);
  const sceneMusic = useSceneMusic({ states: scene.states, stateIndex, isPlaying, timeInState: scrub?.stateId === stateId ? scrub.time : 0 });
  // The scene's own stage when it declares one, a phone's upright frame for instance; otherwise the usual one.
  const stage = scene.stage ?? constants.STAGE;
  // How tall a marketing take of this scene is, worked out with the layout below and read by the recorder
  const marketingHeightRef = useRef(0);
  // The row of steps keeps room above itself for the playhead's marker, so that room is taken out of the gap:
  // the steps then sit MARKETING_STEPS_GAP under the stage, the same as the room under them.
  const marketingStepsGap = constants.MARKETING_STEPS_GAP - constants.MARKETING_PLAYHEAD_MARKER_HEIGHT;

  // The stage is 1920×1080 unless the scene says otherwise, and only scaled to fit, so a position tuned in a small window is
  // the same position in a full-size capture. The scale is worked out against the room left once the
  // panel has taken its own, and the box around the stage is then given the size the stage actually
  // appears at — a transform leaves the layout box at full size, which is what used to leave the panel
  // stranded at the bottom of the window instead of sitting under the video.
  useLayoutEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) {
        return;
      }

      const stepsHeight = switcherRef.current?.offsetHeight ?? 0;

      // A marketing take keeps a fixed room around everything and spans the stage across the width that is
      // left; the frame then grows downwards by whatever the steps take — measured, so two or three rows of
      // steps simply make a taller video. The height is kept for the recorder, which shoots exactly that.
      if (isMarketing) {
        const scale = (window.innerWidth - 2 * constants.MARKETING_PADDING) / stage.width;

        // Rounded up to an even number of pixels — H.264, which a marketing take is encoded to, takes no other
        marketingHeightRef.current = Math.ceil((constants.MARKETING_PADDING * 2 + stage.height * scale + marketingStepsGap + stepsHeight) / 2) * 2;
        setLayout({ margin: constants.MARKETING_PADDING, scale });

        return;
      }

      const gap = switcherRef.current ? constants.PANEL_GAP : 0;
      const availableHeight = containerRef.current.clientHeight - stepsHeight - gap;

      setLayout({ margin: 0, scale: Math.min(containerRef.current.clientWidth / stage.width, availableHeight / stage.height) });
    };

    const resizeObserver = new ResizeObserver(updateScale);

    [containerRef.current, switcherRef.current].forEach((element) => element && resizeObserver.observe(element));
    updateScale();

    return () => resizeObserver.disconnect();
  }, [isRecording, isMarketing, stage, marketingStepsGap]);

  // Playback: each state is held for exactly as long as it is held in the export, so what plays here is
  // the cut, not an impression of it.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const isLastState = stateIndex === scene.states.length - 1;
    const timeout = window.setTimeout(() => {
      // The cut stops on its last state and stays there — that final frame is what the video ends on, and
      // snapping back to the first state would hide it the moment it arrived.
      if (isLastState) {
        setIsPlaying(false);

        return;
      }

      setStateId(scene.states[stateIndex + 1].id);
      // Playback that began mid-step only has the rest of that step to run.
    }, Math.max(0, scene.states[stateIndex].hold * 1000 - (scrub?.stateId === scene.states[stateIndex].id ? scrub.time : 0)));

    return () => window.clearTimeout(timeout);
  }, [isPlaying, scene.states, scrub, stateIndex]);

  useEffect(() => {
    if (isPlaying) {
      playedSince.current = { at: performance.now(), from: scrub?.stateId === stateId ? scrub.time : 0 };
    }
    // scrub is deliberately not a dependency: it is read once, when this step starts playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, stateId]);

  useEffect(() => {
    document.body.dataset.recording = isRecording ? '1' : '0';
    document.body.dataset.transparent = isTransparent ? '1' : '0';
  }, [isRecording, isTransparent]);

  useEffect(() => {
    try {
      window.localStorage.setItem('onioncut-sidebar', isSidebarOpen ? 'open' : 'closed');
    } catch {
      // A preview that cannot remember the preference still works; nothing here is worth failing over.
    }
  }, [isSidebarOpen]);

  // A browser fetches a web font only when something is laid out in it, so a face that first appears
  // in a later step is still unrequested when the recorder takes its first frame — and gets
  // photographed in the fallback. Asked for up front, every face the page can need is in before the
  // recorder is told the page is ready.
  useEffect(() => {
    let isCurrent = true;

    Promise.all(fontSpecs.map((spec) => document.fonts.load(spec)))
      .catch(() => undefined)
      .then(() => {
        if (isCurrent) {
          setAreFontsReady(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  // The recorder drives the scene through this: it steps the state between frames, so the states are
  // held for an exact number of frames instead of whatever the machine managed in three seconds.
  useEffect(() => {
    window.__onioncut = {
      isReady: () => areFontsReady,
      stage,
      marketingWidth: constants.MARKETING_WIDTH,
      marketingFrame: () => ({ width: constants.MARKETING_WIDTH, height: marketingHeightRef.current }),
      states: scene.states.map((state) => ({ id: state.id, hold: state.hold })),
      render: scene.render,
      fileName: scene.fileName,
      music: scene.music,
      // flushSync, because the recorder pauses every transition the moment it is created: a normal
      // setState would commit a frame later, after the transition had already been caught.
      setState: (nextStateId: string) =>
        flushSync(() => {
          setStateId(nextStateId);
          setStateRun((currentRun) => currentRun + 1);
        }),
    };
  }, [areFontsReady, scene, stage]);

  // Only the scene's own animations, never the preview's: the playhead and the tab colours animate too,
  // and finishing or seeking those would move the furniture instead of the picture.
  const stageAnimations = useCallback(() => {
    const stageElement = document.querySelector('[data-stage]');

    return document.getAnimations().filter((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;

      return target instanceof Element && stageElement?.contains(target) === true;
    });
  }, []);

  // An animation that never ends cannot be finished — finish() throws on one — and a scene is allowed to
  // have a spinner in it.
  const finishIfFinite = (animation: Animation) => {
    const timing = animation.effect?.getComputedTiming();

    if (!timing || timing.iterations === Infinity || !Number.isFinite(Number(timing.activeDuration ?? Infinity))) {
      return;
    }

    animation.finish();
  };

  // Jump to a moment inside a step: reach the pose the step starts from, let the step's transitions be
  // created, then pause them and move them to that moment. It is what the recorder does between frames —
  // the clock is stopped and the animations are seeked rather than waited out.
  const seekTo = useCallback(
    ({ stateId: targetStateId, time }: ScrubPosition) => {
      const targetIndex = scene.states.findIndex((state) => state.id === targetStateId);

      if (targetIndex === -1) {
        return;
      }

      setIsPlaying(false);

      if (scrubbed.current.stateId !== targetStateId) {
        // The step before it, with everything it starts landed — the same way a step clip reaches its
        // start by stepping through the states before it.
        flushSync(() => setStateId(scene.states[Math.max(0, targetIndex - 1)].id));
        stageAnimations().forEach(finishIfFinite);

        const before = new Set(stageAnimations());

        flushSync(() => setStateId(targetStateId));
        // Calling getAnimations() is not an inspection: it forces the style recalc that creates the
        // transitions, which is the only reason they exist to be caught.
        scrubbed.current = { stateId: targetStateId, animations: stageAnimations().filter((animation) => !before.has(animation)) };
      }

      scrubbed.current.animations.forEach((animation) => {
        const timing = animation.effect?.getComputedTiming();
        const ends = Number(timing?.delay ?? 0) + Number(timing?.activeDuration ?? 0);

        animation.pause();
        animation.currentTime = Number.isFinite(ends) ? Math.min(time, ends) : time;
      });

      setScrub({ stateId: targetStateId, time });
      window.history.replaceState(null, '', `?scene=${scene.key}&state=${targetStateId}`);
    },
    [scene.key, scene.states, stageAnimations],
  );

  // Leaving a scrubbed step lands its animations first, so the next step starts from the pose the cut
  // would have left behind rather than from half a transition.
  const releaseScrub = useCallback(() => {
    scrubbed.current.animations.forEach(finishIfFinite);
    scrubbed.current = { stateId: '', animations: [] };
    setScrub(null);
  }, []);

  // Playing from a step, or picking the step already in front of you, means seeing its transition — and a
  // transition only runs when the state changes, so a step whose transition has already landed is first put
  // back where it started: the previous state is rendered and every transition that creates is jumped to
  // its end, the way the recorder skips the steps before the one it records, and only then is the step set
  // again so its transition runs from the top.
  const restartState = useCallback(() => {
    if (stateIndex === 0) {
      return;
    }

    flushSync(() => setStateId(scene.states[stateIndex - 1].id));

    document.getAnimations().forEach((animation) => {
      animation.finish();
    });

    setStateId(scene.states[stateIndex].id);
  }, [scene.states, stateIndex]);

  // Picking a state by hand stops playback — carrying on from a state nobody chose is disorienting.
  const handleStateChange = useCallback(
    (nextStateId: string) => {
      setIsPlaying(false);
      releaseScrub();

      if (nextStateId === stateId) {
        restartState();

        return;
      }

      setStateId(nextStateId);
      window.history.replaceState(null, '', `?scene=${scene.key}&state=${nextStateId}`);
    },
    [releaseScrub, restartState, scene.key, stateId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();

        // Pausing freezes the picture where it is, rather than stopping the clock and leaving the
        // transition to land on its own — what is on screen is then what the playhead says.
        if (isPlaying) {
          const elapsed = playedSince.current.from + performance.now() - playedSince.current.at;

          setIsPlaying(false);
          seekTo({ stateId, time: Math.min(elapsed, scene.states[stateIndex].hold * 1000) });

          return;
        }

        // Carrying on from a scrubbed moment: the animations are already there and paused, so they are
        // simply let go. Restarting the step would throw away the moment that was chosen.
        if (scrub?.stateId === stateId) {
          scrubbed.current.animations.forEach((animation) => animation.play());
          setIsPlaying(true);

          return;
        }

        restartState();
        setIsPlaying(true);

        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        setIsRecording((currentIsRecording) => !currentIsRecording);

        return;
      }

      if (event.key === 'ArrowLeft') {
        handleStateChange(scene.states[Math.max(0, stateIndex - 1)].id);
      }

      if (event.key === 'ArrowRight') {
        handleStateChange(scene.states[Math.min(scene.states.length - 1, stateIndex + 1)].id);
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        handleStateChange(scene.states[0].id);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        handleStateChange(scene.states[scene.states.length - 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStateChange, isPlaying, restartState, scene.states, scrub, seekTo, stateId, stateIndex]);

  const showsSteps = !isRecording || isMarketing;

  return (
    <Div className={['flex h-screen overflow-hidden', !isTransparent && (isMarketing ? 'bg-gray-50' : 'bg-gray-950')]}>
      {/* Not while recording: the recorder mixes the track under the cut itself, and a page photographed
          frame by frame has no clock for it to play against. */}
      {!isRecording && scene.music && <audio ref={sceneMusic.audioRef} src={scene.music} preload="auto" />}
      {!isRecording && <SceneSidebar scene={scene} isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />}

      <Div className={['flex min-w-0 flex-1 flex-col', !isRecording && !isMarketing && 'px-6 py-5']} style={isMarketing ? { padding: layout.margin } : undefined}>
        <Div ref={containerRef} className="flex min-h-0 flex-1 flex-col items-center justify-center" style={{ gap: showsSteps ? (isMarketing ? marketingStepsGap : constants.PANEL_GAP) : 0 }}>
          {/* Marked so the recorder can tell the scene's own transitions from the panel's. */}
          <Div
            data-stage
            className={['relative shrink-0 overflow-hidden', !isTransparent && 'bg-stage', isMarketing && 'rounded-xl ring-1 ring-gray-300']}
            style={{ width: stage.width * layout.scale, height: stage.height * layout.scale }}
          >
            <Div className="absolute left-0 top-0 origin-top-left" style={{ width: stage.width, height: stage.height, transform: `scale(${layout.scale})` }}>
              <scene.Scene stateId={stateId} isTransparent={isTransparent} />
            </Div>
          </Div>

          {/* The stage keeps its height and the steps take what is left, scrolling inside it. A video of
              sixty beats wraps the row into a dozen lines, and a row that cannot shrink pushes the stage
              clean off the top of the window — the scene is then simply not there to look at. The
              marketing take keeps the old behaviour: its frame is a fixed size the recorder measures. */}
          {showsSteps && (
            <Div ref={switcherRef} className={['flex w-full justify-center', isMarketing ? 'shrink-0' : 'min-h-[88px] max-h-[40%] shrink overflow-y-auto']}>
              <StateSwitcher
                scene={scene}
                stateId={stateId}
                isPlaying={isPlaying}
                isRecording={isRecording}
                isMarketing={isMarketing}
                width={stage.width * layout.scale}
                stateRun={stateRun}
                scrub={scrub}
                onStateChange={handleStateChange}
                onScrub={seekTo}
              />
            </Div>
          )}
        </Div>
      </Div>
    </Div>
  );
};
