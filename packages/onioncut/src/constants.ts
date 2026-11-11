export const constants = {
  // The gap between the stage and the row of steps under it. Preview only — in recording mode there is no
  // panel at all.
  PANEL_GAP: 20,
  // The room above a row of step tabs that the playhead's marker sits in.
  PLAYHEAD_MARKER_HEIGHT: 12,

  // Everything is laid out against a fixed stage and only scaled to fit the window, so a position
  // set on a laptop is the same position in a 1080p capture.
  STAGE: { width: 1920, height: 1080 },

  // A marketing take is the tool in use: the stage with the row of steps under it, shot this wide. Its height
  // is not set anywhere — it follows from the stage, the room around it and however many rows the steps
  // take, measured on the page, so a scene with more steps simply makes a taller video.
  MARKETING_WIDTH: 1920,
  // The room around everything in a marketing take — left, right, top and bottom.
  MARKETING_PADDING: 50,
  // The room between the stage and the steps under it in a marketing take.
  MARKETING_STEPS_GAP: 50,
  // The steps in a marketing take are sized for a video shrunk into a post, not for a desk: tall tabs and
  // large type, so a step still reads on a phone.
  MARKETING_STEP_HEIGHT: 100,
  MARKETING_STEP_FONT_SIZE: 48,
  // The room above a row of steps that the playhead's marker sits in, in a marketing take — and so the gap
  // between the rows.
  MARKETING_PLAYHEAD_MARKER_HEIGHT: 24,
};
