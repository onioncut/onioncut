// Where the timeline is being held: a step, and how far into that step's hold, in milliseconds. The
// step's own animations are paused at that time, so the stage shows the moment rather than the state.
export type ScrubPosition = {
  stateId: string;
  time: number;
};
