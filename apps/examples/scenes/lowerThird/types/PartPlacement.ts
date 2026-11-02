// What one piece of the badge looks like in a given state. Kept as a type rather than inlined, because
// every piece is placed by the same function and they have to stay comparable.
export type PartPlacement = {
  transform: string;
  opacity: number;
  clipPath: string;
};
