export type SceneCard = {
  id: string;
  label: string;
  // A Tailwind background class, so the palette stays in tailwind.config.ts rather than in the data.
  accent: string;
  // 0 at the front of the pile, 1 at the back.
  depth: number;
  // Where the card lies in the pile, and where it belongs once the grid is packed.
  pile: { left: number; top: number; rotate: number };
  grid: { left: number; top: number };
  // Which arrival this card is, counted from 0 — not its index, see data/cards.ts.
  order: number;
  // How many lines of body the card draws. Varying it keeps the grid from reading as one card repeated.
  lines: number;
};
