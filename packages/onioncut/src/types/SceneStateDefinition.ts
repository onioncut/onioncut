export type SceneStateDefinition = {
  id: string;
  label: string;
  // Seconds this state is held in an export. Declared per state rather than per video, because the
  // pacing is part of the scene: a half-second top and tail around beats that need a full second.
  hold: number;
};
