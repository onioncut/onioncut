import { SceneRenderVariants } from './SceneRenderVariants';

export type SceneRenderDefinition = {
  // Where the clips land. `~` and absolute paths are taken as they are; a relative path is resolved from
  // the root of the project, so a scene names its folder under output/.
  outputPath: string;
  variants: SceneRenderVariants;
};
