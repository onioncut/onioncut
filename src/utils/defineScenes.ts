import { DefineScenesArgs } from '../types/DefineScenesArgs';

// The scenes of one folder, declared through this rather than as a plain object, so they get their shape
// checked and completed where they are written. The title names
// the folder as a whole; a folder with several takes of one video groups them under it in the sidebar.
// The folder's id and the scene's own make the scene's key and the name of its clips.
export const defineScenes = ({ id, title, scenes }: DefineScenesArgs) => {
  return {
    id,
    title,
    scenes: scenes.map((scene) => ({ ...scene, key: `${id}-${scene.id}`, fileName: `animation-${id}-${scene.id}` })),
  };
};
