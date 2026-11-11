import { FC, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Div } from './Div';
import { constants } from '../constants';
import { RegisteredScene } from '../types/RegisteredScene';
import { ScrubPosition } from '../types/ScrubPosition';
import { TabBox } from '../types/TabBox';

export type StateSwitcherProps = {
  scene: RegisteredScene;
  stateId: string;
  isPlaying: boolean;
  isRecording: boolean;
  // A marketing take: the steps are drawn large, sized by the MARKETING_STEP_* constants, so they still read
  // once the video is shrunk into a post.
  isMarketing: boolean;
  // The row spans exactly the stage above it, so the timeline reads as the timeline of that picture.
  width: number;
  // Counts every step the recorder starts, so the playhead runs again even when the step it is asked for is
  // the one already on screen.
  stateRun: number;
  // Where the scrub sits, in milliseconds into its step, or null when nothing is scrubbed. Playback that
  // started from a scrub carries the same offset, so the playhead picks up where it was let go.
  scrub: ScrubPosition | null;
  onStateChange: (stateId: string) => void;
  onScrub: (position: ScrubPosition) => void;
};

// A plain click still means "play this step". Only past this many pixels is the pointer taken as a drag
// along the timeline, so the two never fight over the same gesture.
const DRAG_THRESHOLD = 4;

// The whole point of the preview: build one state until it is right, then step to the next. Feedback
// is given against a state — "the iPad sits too low in 3" — never against a timestamp. The row is laid out
// as a timeline: every step is as wide as it is long, a playhead runs across it, and it can be dragged.
export const StateSwitcher: FC<StateSwitcherProps> = ({ scene, stateId, isPlaying, isRecording, isMarketing, width, stateRun, scrub, onStateChange, onScrub }) => {
  const markerHeight = isMarketing ? constants.MARKETING_PLAYHEAD_MARKER_HEIGHT : constants.PLAYHEAD_MARKER_HEIGHT;
  // The playhead is drawn for the preview; a marketing take scales it up along with its room above the row
  const markerScale = markerHeight / constants.PLAYHEAD_MARKER_HEIGHT;

  // The state the progress belongs to is kept alongside it. Without that, the first render after
  // playback moves on still carries the previous state's progress, and the playhead jumps to the end of
  // the step that just started before running from its beginning.
  const [progress, setProgress] = useState({ stateId, value: 0 });
  const [tabBoxes, setTabBoxes] = useState<TabBox[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  // Whether the pointer has travelled far enough to be a drag. Read by the click handler, so it is a ref
  // rather than state: a re-render between the pointer going up and the click arriving would lose it.
  const dragRef = useRef<{ startX: number; startY: number; isDragging: boolean } | null>(null);

  const stateIndex = scene.states.findIndex((state) => state.id === stateId);
  const hold = (scene.states[stateIndex]?.hold ?? 0) * 1000;
  // Playback that began mid-step runs the rest of the step, and the playhead has to start from there.
  const playedFrom = scrub?.stateId === stateId ? scrub.time : 0;

  // While the cut plays, the playhead runs across the active step over the state's own hold. Driven frame
  // by frame rather than by a CSS transition, because it has to restart every time the state changes — and
  // in the preview a per-frame update costs nothing that matters.
  useEffect(() => {
    if (!isPlaying || isRecording) {
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = () => {
      setProgress({ stateId, value: Math.min(1, (playedFrom + performance.now() - startedAt) / hold) });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [hold, isPlaying, isRecording, playedFrom, stateId]);

  // The playhead is placed against the tabs as they are actually laid out — gaps and rounding included —
  // rather than against the holds, so it never drifts off the edge of the step it belongs to.
  useLayoutEffect(() => {
    const measure = () => {
      setTabBoxes(tabRefs.current.map((tab) => ({ left: tab?.offsetLeft ?? 0, top: tab?.offsetTop ?? 0, width: tab?.offsetWidth ?? 0, height: tab?.offsetHeight ?? 0 })));
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    tabRefs.current.forEach((tab) => tab && resizeObserver.observe(tab));

    return () => resizeObserver.disconnect();
  }, [scene.states, width]);

  // With the row scrolling, the selected step can be on a line that is not in view — stepping with the
  // arrow keys would then move a selection nobody can see. Not while dragging: the pointer is already on
  // the row, and scrolling it under the pointer moves the thing being aimed at.
  useEffect(() => {
    if (isRecording || dragRef.current?.isDragging) {
      return;
    }

    tabRefs.current[stateIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isRecording, stateIndex]);

  // Which step the pointer is over and how far into it, read off the tabs as they are laid out. The row
  // wraps, so the row is found first by the vertical position and only then the step along it.
  const positionAt = (event: ReactPointerEvent) => {
    const row = rowRef.current;

    if (!row || tabBoxes.length === 0) {
      return null;
    }

    const bounds = row.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    const rowTops = [...new Set(tabBoxes.map((tabBox) => tabBox.top))].sort((first, second) => first - second);
    const nearestRowTop = rowTops.reduce((closest, top) => (Math.abs(top - y) < Math.abs(closest - y) ? top : closest), rowTops[0]);
    const onRow = tabBoxes.map((tabBox, index) => ({ tabBox, index })).filter(({ tabBox }) => tabBox.top === nearestRowTop);

    if (onRow.length === 0) {
      return null;
    }

    // Past the end of a row the nearest step is the one being aimed at, so the drag never falls into a gap.
    const hit = onRow.find(({ tabBox }) => x >= tabBox.left && x <= tabBox.left + tabBox.width) ?? (x < onRow[0].tabBox.left ? onRow[0] : onRow[onRow.length - 1]);
    const state = scene.states[hit.index];
    const fraction = hit.tabBox.width === 0 ? 0 : Math.min(1, Math.max(0, (x - hit.tabBox.left) / hit.tabBox.width));

    return { stateId: state.id, time: fraction * state.hold * 1000 };
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (isRecording || event.button !== 0) {
      return;
    }

    dragRef.current = { startX: event.clientX, startY: event.clientY, isDragging: false };
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    if (!drag.isDragging && Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD && Math.abs(event.clientY - drag.startY) < DRAG_THRESHOLD) {
      return;
    }

    if (!drag.isDragging) {
      drag.isDragging = true;
      // Captured once the gesture is a drag, so it keeps following the pointer past the edge of the row.
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const position = positionAt(event);

    if (position) {
      onScrub(position);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent) => {
    if (dragRef.current?.isDragging) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Cleared after the click that follows, not before it — the click is what has to know.
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  const activeTab = tabBoxes[stateIndex] ?? { left: 0, top: 0, width: 0, height: 0 };
  // Once the tabs wrap, the last row is not stretched to the full width — like the last line of justified
  // text. A lone step there would otherwise span the whole stage and read as the longest one. Growing does
  // not change where the rows break (that depends on each label's width alone), so this never flips back.
  const lastRowTop = Math.max(0, ...tabBoxes.map((tabBox) => tabBox.top));
  const isWrapped = new Set(tabBoxes.map((tabBox) => tabBox.top)).size > 1;
  // The playhead sits on the row of the step it belongs to, its marker in the space just above that row.
  const playheadTop = activeTab.top - markerHeight;

  const isScrubbed = !isPlaying && scrub?.stateId === stateId;
  const fraction = isScrubbed ? (hold === 0 ? 0 : scrub.time / hold) : isPlaying && progress.stateId === stateId ? progress.value : 0;

  // Recording runs on a stopped clock, so there the run across the step is a CSS animation the recorder can
  // seek — one driven frame by frame would stand still between screenshots. An animation rather than a
  // transition, and restarted for every step, because the tabs wrap: a transition would slide the playhead
  // back across a whole row to reach a step that starts a new one.
  const playheadStyle = isRecording
    ? {
        height: activeTab.height + markerHeight,
        '--playhead-from': `${activeTab.left}px`,
        '--playhead-to': `${activeTab.left + activeTab.width}px`,
        '--playhead-top': `${playheadTop}px`,
        animation: `playhead-run ${hold}ms linear both`,
      }
    : {
        height: activeTab.height + markerHeight,
        transform: `translate(${activeTab.left + activeTab.width * fraction}px, ${playheadTop}px)`,
      };

  return (
    // When even the labels alone are wider than the stage — a narrow window, a scene with many steps — the
    // tabs wrap onto more rows rather than being cut off, and every row still grows its steps by their holds.
    <Div
      ref={rowRef}
      className={['relative shrink-0 select-none font-sans', !isRecording && 'cursor-ew-resize']}
      style={{ width, paddingTop: markerHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* The same gap between tabs as between rows, and a row gap that leaves room for the playhead's marker. */}
      <Div className="flex flex-wrap justify-center" style={{ gap: markerHeight + 4 * markerScale }}>
        {scene.states.map((state, index) => (
          <button
            key={state.id}
            ref={(tab) => {
              tabRefs.current[index] = tab;
            }}
            type="button"
            // A drag that ended on this tab is not a click on it: the scrub has already said where to be.
            onClick={() => !dragRef.current?.isDragging && onStateChange(state.id)}
            title={`${state.label} · ${state.hold}s`}
            // A marketing take follows the light, quiet timeline of a product video: white tabs with a thin
            // border and the label alone, the active one only a shade stronger — a row of heavy dark blocks
            // outweighs the picture above it.
            className={[
              'min-w-0 overflow-hidden border transition-colors',
              !isMarketing && 'rounded-lg',
              !isMarketing && state.id === stateId && 'border-gray-400 bg-gray-800 text-white',
              !isMarketing && state.id !== stateId && 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600',
              isMarketing && 'rounded-xl',
              isMarketing && state.id === stateId && 'border-gray-400 bg-gray-100 text-gray-900',
              isMarketing && state.id !== stateId && 'border-gray-300 bg-white text-gray-600',
            ]
              .filter(Boolean)
              .join(' ')}
            // Grows with its hold, but never below the width of its own label, so a half-second step still
            // reads in full. The playhead is placed against the laid-out tabs, so over a widened short step
            // it simply moves slower.
            style={{ flex: `${isWrapped && tabBoxes[index]?.top === lastRowTop ? 0 : state.hold} 1 0px`, minWidth: 'max-content' }}
          >
            {/* The step's number comes from where it sits, never from its label, so renumbering a scene is
                impossible to get wrong. Every tab uses the same type size and keeps its label on one line. A
                marketing take shows the label alone — the numbers are for talking about a step while tuning it. */}
            {isMarketing ? (
              <Div
                className="pointer-events-none flex items-center justify-center whitespace-nowrap font-medium"
                style={{ height: constants.MARKETING_STEP_HEIGHT, paddingInline: constants.MARKETING_STEP_FONT_SIZE * 0.75, fontSize: constants.MARKETING_STEP_FONT_SIZE }}
              >
                {state.label}
              </Div>
            ) : (
              <Div className="pointer-events-none flex items-center justify-center gap-2 whitespace-nowrap px-3 py-2 text-[13px]">
                <Div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-950 text-[11px] tabular-nums text-gray-300">
                  {index + 1}
                </Div>
                <Div>{state.label}</Div>
              </Div>
            )}
          </button>
        ))}
      </Div>

      {/* The playhead: a marker above the row and a line through it. The line keeps a dark edge so it stays
          visible where it crosses the highlighted step. It is there while the cut runs and while a step is
          scrubbed — standing at the start of a step it would read as something to drag, and it is not. */}
      {(isPlaying || isRecording || isScrubbed) && (
        <Div key={isRecording ? `${stateId}-${stateRun}` : 'playhead'} aria-hidden className="pointer-events-none absolute left-0 top-0 will-change-transform" style={playheadStyle}>
          <Div
            className={['absolute left-0 top-0 size-0 -translate-x-1/2 border-x-transparent', isMarketing ? 'border-t-gray-900' : 'border-t-white']}
            style={{ borderLeftWidth: 7 * markerScale, borderRightWidth: 7 * markerScale, borderTopWidth: 9 * markerScale }}
          />
          <Div
            className={['absolute bottom-0 left-0 -translate-x-1/2', isMarketing ? 'bg-gray-900' : 'bg-white shadow-[0_0_0_1px_rgb(3,7,18)]']}
            style={{ top: 8 * markerScale, width: 2 * markerScale }}
          />
        </Div>
      )}
    </Div>
  );
};
