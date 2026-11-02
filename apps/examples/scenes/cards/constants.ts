import { constants as toolConstants } from 'onioncut';

export const constants = {
  // The stage every scene is laid out against, so scene code reads constants.STAGE next to its own
  // values from a single import.
  ...toolConstants,

  CARD: { width: 340, height: 230 },
  GRID: { columns: 4, rows: 3, gap: 40 },

  // How far a card still waiting below the frame sits, and how it travels.
  ENTER_DISTANCE: 560,
  ENTER_DURATION: 700,
  // The stagger between two arrivals. Twelve cards at 60ms is 660ms of stagger over a 1.2s beat, so the
  // last card still lands inside its own step.
  ENTER_STAGGER: 60,

  SETTLE_DURATION: 760,
  FOCUS_DURATION: 800,
  LEAVE_DURATION: 560,
  LEAVE_STAGGER: 34,

  // The card the fourth state pulls out of the grid, and how much bigger it gets.
  FOCUS_CARD_ID: 'card-6',
  FOCUS_SCALE: 1.9,
  // The rest are pushed away from the centre rather than hidden, so the focused card is read as being in
  // front of them instead of alone on the stage.
  FOCUS_SPREAD: 1.5,
  FOCUS_BLUR: 8,

  // Depth in the pile, 0 at the front and 1 at the back, spent on all four at once — blur, opacity,
  // scale and z-index. Driving only one of them makes a flat pile of overlapping rectangles.
  DEPTH_BLUR: 5,
  DEPTH_SCALE: 0.14,
  DEPTH_FADE: 0.45,
};
