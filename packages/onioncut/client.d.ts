// The ambient types a scene needs: importing an image, an AVIF still or a stylesheet, and the shape of
// import.meta.env. They are Vite's own, re-exported rather than restated — a project that declares
// `*.avif` by hand ends up with a second, slightly different set that drifts from what Vite actually
// does with the import.
//
// Vite is this package's dependency, not the project's, so a project cannot reference vite/client
// itself. It references this instead, in a d.ts of its own:
//
//   /// <reference types="onioncut/client" />

/// <reference types="vite/client" />
