import { SceneRenderDefinition } from './SceneRenderDefinition';
import { ScrubPosition } from './ScrubPosition';

// The surface the recorder script talks to. It steps states — the animation itself is CSS, caught and
// stepped by the recorder rather than by anything in here — and the filmstrip seeks through it.
export type OnioncutRecordApi = {
  isReady: () => boolean;
  // The size the scene is laid out against, and the frame a marketing take is shot in. The recorder reads
  // both from here rather than keeping its own copy, so the viewport it photographs is always the box the
  // scene was built in. A marketing take is as wide as `marketingWidth`; its height is measured off the page
  // laid out at that width, because it depends on how many rows the steps wrap onto.
  stage: { width: number; height: number };
  marketingWidth: number;
  marketingFrame: () => { width: number; height: number };
  states: { id: string; hold: number }[];
  render: SceneRenderDefinition;
  // The name the clips are written under, without extension or suffix: animation-<folder>-<scene>.
  fileName: string;
  // The scene's music as a URL on the preview server, for the recorder to fetch and mix under the cut.
  music?: string;
  setState: (stateId: string) => void;
  // Hold the stage at a moment inside a step, the way scrubbing the timeline does. The preview's filmstrip
  // photographs the scene through it.
  seek: (position: ScrubPosition) => void;
};

// An interface, not a type: extending the global Window is only possible through declaration merging.
declare global {
  // eslint-disable-next-line no-restricted-syntax
  interface Window {
    __onioncut?: OnioncutRecordApi;
  }
}
