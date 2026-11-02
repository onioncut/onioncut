# Using this in another repository

This tool is installed into a project and run from it. The app shell — the stage, the step timeline,
the sidebar, the recorder — is this package; the scenes belong to the project and live wherever its
videos live. One copy of the tool serves every repository.

What the tool knows about a project, it reads from one file at the project's root:
`onioncut.config.json`.

## Set it up

### 1. Install

```jsonc
// package.json in the project
{
  "dependencies": {
    // React is the project's own: its scenes import it.
    "react": "^19.0.0",
    "onioncut": "^0.1.0"
  },
  "scripts": {
    "video:dev": "onioncut dev",
    "video:record": "onioncut record"
  }
}
```

Then `pnpm install`.

The `file:` path is relative to the project. pnpm **copies** the package rather than linking to it,
so after the tool itself changes, run `pnpm install` again in the project — a changed file is picked
up, a new one is not.

### 2. Scaffold

```bash
pnpm exec onioncut init
```

It writes what is missing and leaves alone whatever already exists:

- `onioncut.config.json`
- `tools/onioncut/tailwind.config.ts` — or, if the config already names one somewhere else,
  nothing: the one the project names is the one that counts
- `tools/onioncut/shared/` — where components the videos share live
- `tools/onioncut/env.d.ts` — the ambient types for importing an image or a stylesheet

It prints the two things it will not write for you: the `package.json` scripts, and the `paths` entry
for `tsconfig.json`. It never edits a file that exists.

### 3. The config

```jsonc
// onioncut.config.json, at the root of the project
{
  // Globs naming the scene FOLDERS; `*` and `**` both work. A scene is a folder with a
  // sceneDefinitions.ts in it, and anything else the glob matches is ignored. It is a list, so
  // scenes kept with each video and scenes kept in one folder both work, together.
  "scenes": [
    "tools/onioncut/scenes/*",
    "videos/*/animations/*"
  ],

  // Optional. Folders of components the videos share. A scene's own neighbours are scanned anyway;
  // this is for what videos in different folders have in common. Each folder is imported by its own
  // name: tools/onioncut/shared is `#shared`.
  "shared": ["tools/onioncut/shared"],

  // Optional. The project's palette and type. TypeScript is fine, here and in whatever it imports,
  // because Tailwind loads this file itself. Left out, the scenes are drawn in the tool's starter
  // palette, which is enough to see a scene move and wrong for anything that ships.
  "tailwind": "tools/onioncut/tailwind.config.ts",

  // Optional. The web fonts the scenes are set in. `display=block` is appended to a Google Fonts URL
  // that does not already say otherwise, and every face the URL names is loaded before the recorder
  // is told the page is ready.
  "fonts": [
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600"
  ],

  // Optional. A stylesheet of the project's own, loaded into the page.
  "css": "tools/onioncut/animations.css"
}
```

The config is looked for in the current folder and every folder above it, so the tool can be run from
a subfolder the way git can. `--config=<path>` points it somewhere else.

### 4. The project's Tailwind config

```ts
// tools/onioncut/tailwind.config.ts
import preset from "onioncut/tailwind-preset";

// No `content`: which files are scanned is worked out from the scene folders and from `shared`, so
// this file never has to know where the tool keeps its own components.
export default {
  presets: [preset],
  theme: {
    extend: {
      colors: { stage: "#0E0D0B" }
    }
  }
};
```

`stage` is the paper the stage is made of, and it is the only colour the tool itself refers to by
name. Everything else is the project's.

### 5. TypeScript

```jsonc
// tsconfig.json in the project
{
  "compilerOptions": {
    "paths": { "#shared/*": ["./tools/onioncut/shared/*"] }
  },
  "include": [
    "videos/*/animations/*",
    "tools/onioncut"
  ]
}
```

`tools/onioncut/env.d.ts` carries `/// <reference types="onioncut/client" />`, which
is how a scene gets the types for importing a `.avif`, a `.png` or a `.css`. They are Vite's own
types, reached through the tool because Vite is the tool's dependency rather than the project's —
never restated by hand, which is how a project ends up with declarations that drift from what Vite
actually does with the import.

## Make a scene

```bash
pnpm exec onioncut new videos/my-video/animations/intro
```

It writes the four files a scene is, in the shape every scene has:

```
<scene>/
  sceneDefinitions.ts  the folder's id and title and its scenes
  states.ts            its steps and how long each is held
  constants.ts         every value it is tuned by — durations, sizes, positions
  Scene.tsx            the scene component, always exported as Scene
  components/          the components only this scene draws
  types/               the types only this scene uses, one per file
  data/                its fixtures and computed data
  assets/              its images, imported in code — never referenced as a /path string
```

- `--group=<id>` names the heading the scene sits under in the sidebar. Left off, it is taken from
  the nearest folder above that names something; `animations`, `scenes` and `src` are skipped as
  containers, so `videos/my-video/animations/intro` gives the key `my-video-intro`.
- `--out=<dir>` sets where its clips go.

**A scene imports from `'onioncut'` and nothing deeper.** The public surface is
`defineScenes`, `constants`, `Div`, and the types `SceneComponentProps`, `SceneStateDefinition`,
`SceneDefinition`, `SceneGroup`, `SceneRenderDefinition`, `SceneRenderVariants`, `DefineScenesArgs`,
`ClassNameInput`, `ClassNameValue`.

### The key

The folder's id and the scene's own make one key, `<folder>-<scene>`. It is what the preview opens
the scene by (`?scene=`), what the recorder takes (`--scene=`), and what its clips are named after
(`animation-<folder>-<scene>.mov`).

### Where the clips go

Declared by the scene, not by the command line:

```ts
render: {
  // Relative to the root of the project; `~` and absolute paths are taken as they are.
  outputPath: 'videos/my-video/sources',
  variants: { fullCut: true, stepClips: true }
}
```

## Shared components

What one set of scenes shares sits beside them, in the folder they are in. What videos in _different_
folders share goes in a folder the project lists as `shared`, and is imported by that folder's name:

```ts
import { Watermark } from "#shared/Watermark";
```

Tailwind scans the scene folders, their parent and the `shared` folders — and nothing further out. A
shared component kept anywhere else has its classes purged, and the scene still records, just without
it. That failure is silent and only shows in the clip, so it is worth knowing.

## Run it

```bash
pnpm video:dev                      # --port, --host, --config
pnpm video:record --scene=<key>     # --only, --transparent, --marketing, --out, --record-port
```

Both `--port=5300` and `--port 5300` work, and an unknown flag is refused rather than ignored.

| Flag            | Default          | Meaning                                                        |
| --------------- | ---------------- | -------------------------------------------------------------- |
| `--scene`       | `cards-cards`    | Which video to record, by `<folder>-<scene>`                   |
| `--only`        | —                | Render only this step's clip, by state id. Deletes nothing     |
| `--out`         | the scene's own  | Write this run elsewhere, deleting nothing — to check a render |
| `--transparent` | off              | Keep the alpha channel, for laying over footage                |
| `--marketing`   | off              | The framed view of the tool in use, onto the desktop           |
| `--hold`        | each state's own | Overrides every state's declared hold                          |
| `--step-hold`   | `2`              | Seconds a step clip holds after its last transition            |
| `--record-port` | `5201`           | The recorder's own server; the next free port if taken         |
| `--workers`     | `4`              | How many clips to record at once; memory is the limit, not cores |

A run writes what the scene's `variants` turn on: the full cut, and one clip per step — its
transition, then 2 s of the finished state. Clips that did not change are left untouched, a changed
one is written over the existing file so an edit keeps its link, and a step the scene no longer has
is removed. Never move or rename an `animation-` file by hand; re-run the recorder.

**Every render is `.mov`, 3840 × 2160, ProRes 4444, and there is no way to go lower.** A four-minute
cut is around 6 GB.

## What it needs on the machine

- Node 20+ and pnpm
- **ffmpeg** on the `PATH` (`brew install ffmpeg`)
- **Chrome, Chromium or Edge** installed. The recorder drives the browser already on the machine; the
  paths it looks in are `CHROME_CANDIDATES` at the top of `packages/onioncut/src/cli/record.mjs`, and they are macOS
  paths — on Linux or Windows, add the machine's own.
- Port 5200 for the preview. The recorder takes 5201 or the next one free.

## Things that will catch you out

- **`pnpm install` again after the tool changes.** pnpm copies a `file:` dependency; edits to files
  that already existed reach the project, a new file does not.
- **A shared component outside the scanned folders loses its Tailwind classes** and the scene records
  without it, with no error.
- **The step timeline is built for a handful of steps.** A video of sixty beats wraps it into a dozen
  rows; it scrolls instead of pushing the stage off the window, but it is cramped.
- **A render photographs the page one frame at a time**, which is why the result is exact. Several
  clips are recorded at once (`--workers`, four by default); each one is a browser page at 4K and an
  ffmpeg, so what runs out first is memory.
- **Tuning happens in the browser, never in exports.** Open the scene and change a number. An
  exported video cannot be pointed at.
