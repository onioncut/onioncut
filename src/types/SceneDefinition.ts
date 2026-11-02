import { FC } from 'react';
import { SceneComponentProps } from './SceneComponentProps';
import { SceneRenderDefinition } from './SceneRenderDefinition';
import { SceneStateDefinition } from './SceneStateDefinition';

export type SceneDefinition = {
  // Names the scene inside its folder. With the folder's id in front of it, it is the key the preview
  // opens the scene by and the name its clips are written under: animation-<folder>-<scene>.
  id: string;
  title: string;
  states: SceneStateDefinition[];
  Scene: FC<SceneComponentProps>;
  // What the recorder makes of the scene and where it puts it, declared by every scene: a render that
  // has to guess its destination ends up in a downloads folder nobody looks in.
  render: SceneRenderDefinition;
  // A track laid under the full cut, imported like any other asset (`import music from
  // './assets/music.mp3'`). It plays along with the preview's timeline and is mixed under the full cut
  // when it is recorded; step clips stay silent, because the edit runs one track under all of them.
  music?: string;
  // The stage the scene is laid out on and recorded at, when it is not the usual 1920×1080 — 1080×1920
  // for a take of the video on its side, for a phone. Recorded at twice the pixel density like any other.
  stage?: { width: number; height: number };
};
