export type SceneComponentProps = {
  stateId: string;
  // Recorded with an alpha channel, to be laid over footage in the edit. A scene that has nothing to
  // show through simply ignores it.
  isTransparent: boolean;
};
