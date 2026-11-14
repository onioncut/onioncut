export const constants = {
  // The gap between the stage and the row of steps under it. Preview only — in recording mode there is no
  // panel at all.
  PANEL_GAP: 20,
  // The room above a row of step tabs that the playhead's marker sits in.
  PLAYHEAD_MARKER_HEIGHT: 12,
  // The filmstrip over the steps is a timeline in the manner of an editor's: one track, a fixed number of
  // pixels per second, scrolled sideways and zoomed in and out. Frames are FILMSTRIP_FRAME_HEIGHT tall and
  // as wide as the stage's shape makes them, side by side, so how far apart in time they are follows from the
  // zoom; the moment each shows is rounded to FILMSTRIP_TIME_STEP milliseconds. The ruler labels the seconds at the
  // first of FILMSTRIP_RULER_STEPS that leaves FILMSTRIP_RULER_MIN_GAP pixels between labels. Zoom runs up to
  // FILMSTRIP_MAX_PX_PER_SECOND and down to the whole cut fitting the width.
  FILMSTRIP_FRAME_HEIGHT: 144,
  // How far the timeline's top edge can be dragged, as the height of its frames.
  FILMSTRIP_FRAME_MIN_HEIGHT: 48,
  FILMSTRIP_FRAME_MAX_HEIGHT: 400,
  // Where the timeline's height and each scene's zoom are remembered across reloads.
  FILMSTRIP_PREFERENCE_KEY: 'onioncut-filmstrip',
  // Empty room before zero, so the start of the cut sits clear of the timeline's left edge rather than against it.
  FILMSTRIP_LEAD: 200,
  FILMSTRIP_RULER_HEIGHT: 28,
  FILMSTRIP_STEP_HEIGHT: 36,
  FILMSTRIP_TIME_STEP: 10,
  FILMSTRIP_RULER_STEPS: [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60],
  FILMSTRIP_RULER_MIN_GAP: 64,
  FILMSTRIP_MAX_PX_PER_SECOND: 2000,
  // Frames are only asked for this far either side of what is in view, so a long cut zoomed in does not
  // photograph hundreds of frames nobody scrolls to.
  FILMSTRIP_OVERSCAN: 600,
  FILMSTRIP_ROUTE: '/__onioncut/filmstrip',
  FILMSTRIP_STALE_EVENT: 'onioncut:filmstrip-stale',
  // Where the timeline asks the dev server to put the moment under the playhead on the clipboard, and how
  // long the button says it did.
  FILMSTRIP_COPY_ROUTE: '/__onioncut/copy',
  FILMSTRIP_COPIED_FOR: 1500,
  // The frame rate the timeline's timecode counts in: the recorder's, so a timecode is a frame of the clip.
  FILMSTRIP_TIMECODE_FPS: 30,

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
