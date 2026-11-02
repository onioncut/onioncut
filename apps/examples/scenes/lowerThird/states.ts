import { SceneStateDefinition } from 'onioncut';

export const states: SceneStateDefinition[] = [
  { id: 'empty', label: 'Nothing', hold: 0.5 },
  { id: 'panel', label: 'Panel wipes in', hold: 0.9 },
  { id: 'name', label: 'Name', hold: 1.0 },
  { id: 'role', label: 'Role', hold: 1.4 },
  { id: 'out', label: 'And out', hold: 0.7 },
];

export const stateIndex = (stateId: string) => {
  return states.findIndex((state) => state.id === stateId);
};
