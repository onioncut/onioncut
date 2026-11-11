import { SceneRenderVariants } from './SceneRenderVariants';

export type SceneRenderDefinition = {
  // Optional. Where the clips land when not in the project's `<outDir>/<folder>-<scene>/` — a long video
  // keeping its clips beside its script. `~` and absolute paths are taken as they are; a relative path is
  // resolved from the root of the project.
  outputPath?: string;
  variants: SceneRenderVariants;
};
