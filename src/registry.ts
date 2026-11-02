import { sceneGroups as loadedGroups } from 'virtual:onioncut-scenes';
import { RegisteredScene } from './types/RegisteredScene';
import { SceneGroup } from './types/SceneGroup';

// Every video the project holds, collected from the folders themselves: anything with a
// sceneDefinitions.ts is a scene. Nothing is registered by hand, so adding a video is adding its folder
// — and two videos built on two branches never meet in the same file.
//
// Each scene folder has the same shape — sceneDefinitions.ts, states.ts, constants.ts and Scene.tsx at
// its root, components/, types/, data/ and assets/ under it.
export const sceneGroups: SceneGroup[] = loadedGroups;

export const scenes = sceneGroups.flatMap((group) => group.scenes);

export const findScene = (sceneKey: string | null) => {
  return scenes.find((scene) => scene.key === sceneKey) ?? scenes[0];
};

export const findSceneGroup = (scene: RegisteredScene) => {
  return sceneGroups.find((group) => group.scenes.includes(scene)) ?? sceneGroups[0];
};
