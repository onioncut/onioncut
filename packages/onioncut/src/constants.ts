export const constants = {
  // The gap between the stage and the row of steps under it. Preview only — in recording mode there is no
  // panel at all.
  PANEL_GAP: 20,
  // The room above a row of step tabs that the playhead's marker sits in.
  PLAYHEAD_MARKER_HEIGHT: 12,

  // Everything is laid out against a fixed stage and only scaled to fit the window, so a position
  // set on a laptop is the same position in a 1080p capture.
  STAGE: { width: 1920, height: 1080 },

  // A marketing take is taller than the stage on purpose: a 16:9 stage with a row of steps under it
  // cannot sit in a 16:9 frame with the same black on every side — the arithmetic comes out negative.
  MARKETING_FRAME: { width: 1920, height: 1200 },
};
