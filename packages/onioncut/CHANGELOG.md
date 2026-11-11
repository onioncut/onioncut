# onioncut

## 0.2.0

### Minor Changes

- d920896: `onioncut record` records the full cut on one page, state after state as the preview plays it, and every step clip walks to its start from the first state, so a clip no longer jumps where a state begins. `--workers` is gone and is now refused as an unknown flag: remove it from your scripts.

### Patch Changes

- 76832b5: `onioncut record --marketing` writes a silent 1920-wide H.264 `.mp4` into `<outDir>/marketing/` instead of a ProRes `.mov` on the desktop, with large light step tabs, and its height is measured from the page, so a scene with more rows of steps makes a taller video.
- 76832b5: Renders land in one folder per project, `outDir` in `onioncut.config.json` (`output` when left out), each scene in `<outDir>/<folder>-<scene>/`; `render.outputPath` is now optional and still wins when a scene names it, and `onioncut record` ends by listing every file it wrote by its full path and `Saved to <folder>`.
