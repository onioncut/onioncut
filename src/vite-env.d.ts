/// <reference types="vite/client" />

// Written at startup by the tool's own Vite plugin, from the scene folders the project names in its
// onioncut.config.json — there is no file on disk for TypeScript to look at.
declare module 'virtual:onioncut-scenes' {
  import type { SceneGroup } from './types/SceneGroup';

  export const sceneGroups: SceneGroup[];
}

// Also written at startup: the faces the page will need, worked out from the Google Fonts URLs in the
// tool's index.html and in the project's config.
declare module 'virtual:onioncut-fonts' {
  export const fontSpecs: string[];
}
