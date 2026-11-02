import { SceneDefinition } from './SceneDefinition';

// A scene as the registry holds it: what its folder declared, plus what defineScenes() worked out from the
// folder's id and its own — the key the preview opens it by, and the name its clips are written under.
export type RegisteredScene = SceneDefinition & {
  key: string;
  fileName: string;
};
