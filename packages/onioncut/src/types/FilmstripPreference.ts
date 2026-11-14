// What the timeline remembers across reloads: how tall its frames are, and each scene's zoom in pixels per
// second — null where the scene is shown whole.
export type FilmstripPreference = {
  frameHeight?: number;
  zoom?: Record<string, number | null>;
};
