import { constants } from '../constants';
import { SceneCard } from '../types/SceneCard';

const COUNT = constants.GRID.columns * constants.GRID.rows;

const accents = ['bg-accent-coral', 'bg-accent-amber', 'bg-accent-sage', 'bg-accent-sky'];
const labels = ['Inbox', 'Notes', 'Photos', 'Links', 'Drafts', 'Archive', 'Reading', 'Shared', 'Pinned', 'Today', 'Later', 'Done'];

const gridWidth = constants.GRID.columns * constants.CARD.width + (constants.GRID.columns - 1) * constants.GRID.gap;
const gridHeight = constants.GRID.rows * constants.CARD.height + (constants.GRID.rows - 1) * constants.GRID.gap;
const gridLeft = (constants.STAGE.width - gridWidth) / 2;
const gridTop = (constants.STAGE.height - gridHeight) / 2;

// Scattered by a formula rather than by a table of numbers, so changing the count does not mean placing a
// card by hand. Irrational-ish steps around the circle keep two neighbours from landing on each other.
const pilePlacement = (index: number) => {
  const angle = index * 2.399;
  // How far out along that angle the card lies. Without it every card sits at the same radius and the pile
  // comes out as a ring with a hole in the middle.
  const spread = 0.4 + (((index * 5) % COUNT) / (COUNT - 1)) * 0.6;

  return {
    left: Math.round(constants.STAGE.width / 2 - constants.CARD.width / 2 + Math.sin(angle) * 470 * spread),
    top: Math.round(constants.STAGE.height / 2 - constants.CARD.height / 2 + Math.cos(angle) * 240 * spread),
    rotate: ((index * 37) % 15) - 7,
  };
};

// Arrival order walks the deck with a stride coprime to the count, never in grid order: staggering by
// column sends a visible wave left to right across the stage instead of a scatter.
const STRIDE = 5;

export const cards: SceneCard[] = Array.from({ length: COUNT }, (unused, index) => ({
  id: `card-${index + 1}`,
  label: labels[index % labels.length],
  accent: accents[index % accents.length],
  depth: ((index * 7) % COUNT) / (COUNT - 1),
  pile: pilePlacement(index),
  grid: {
    left: gridLeft + (index % constants.GRID.columns) * (constants.CARD.width + constants.GRID.gap),
    top: gridTop + Math.floor(index / constants.GRID.columns) * (constants.CARD.height + constants.GRID.gap),
  },
  order: (index * STRIDE) % COUNT,
  lines: 2 + (index % 2),
}));

export const focusCard = cards.find((card) => card.id === constants.FOCUS_CARD_ID) ?? cards[0];
