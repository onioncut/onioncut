// Which files a render of the scene produces: the whole scene as one clip, and each step as a clip of
// its own. A marketing take is not one of them — it is asked for on the command line, never declared.
export type SceneRenderVariants = {
  fullCut: boolean;
  stepClips: boolean;
};
