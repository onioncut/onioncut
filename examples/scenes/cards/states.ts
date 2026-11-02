import { SceneStateDefinition } from 'onioncut';

// Half a second of backdrop at each end, and the beats in between long enough that a movement lands
// before the next one starts. The holds here are the cut: what plays in the preview is what is exported.
export const states: SceneStateDefinition[] = [
  { id: 'backdrop', label: 'Backdrop', hold: 0.5 },
  { id: 'pile', label: 'Cards arrive', hold: 1.6 },
  { id: 'grid', label: 'Into a grid', hold: 1.4 },
  { id: 'focus', label: 'One in front', hold: 1.6 },
  { id: 'leave', label: 'Empty again', hold: 0.8 },
];

export const stateIndex = (stateId: string) => {
  return states.findIndex((state) => state.id === stateId);
};
