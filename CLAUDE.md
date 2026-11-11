# Onioncut

Rules for working in this repository. How the tool works is in [`README.md`](./README.md); this file
is how it is used.

How a project installs and uses this is [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) — point anyone setting
it up in another repository at that file rather than explaining it again.

`onioncut init` sets a project up and `onioncut new <path>` scaffolds a scene; neither
overwrites anything that is already there. Use them rather than writing the four files by hand, so a
scene is never a file named almost right.

This is the tool, not a project that uses it. It is installed into a project — the scenes are written
there, under whatever folders that project's `onioncut.config.json` names, and the clips land
where that project's `outDir` (or a scene's own `render.outputPath`) says. Work here is work on the tool; `apps/examples/scenes/` is the
only place in this repository where a scene lives, and it exists to be copied from.

## Where things live

- The repository is a pnpm workspace. `packages/onioncut/` is the one package published to npm;
  everything under `apps/` is private and never published. `apps/examples/` uses the tool exactly the
  way a project does — its own `package.json`, `onioncut.config.json` and Tailwind config — so
  `pnpm dev` and `pnpm record` at the root run there.
- `apps/site/` — the website. Static, private, not part of the package.
- `.changeset/` — releases. A change to `packages/onioncut` comes with a changeset; how a release is
  cut is in [`.changeset/README.md`](./.changeset/README.md) and `/prepare-release`.
- `.claude/guidelines/` — how code is written here; `.claude/commit-rules.md` — the scopes and the
  checks that run before every commit, the leak check among them.
- `packages/onioncut/src/api.ts` — everything a project can import. A scene writes `from 'onioncut'` and nothing
  deeper, so the inside can be rearranged without breaking a video recorded a year ago. Adding to this
  file is a decision; reaching around it is a bug.
- `packages/onioncut/src/cli/` — the command line: reading the project's config, building the Vite config around it, the
  virtual module that collects the scenes, and the recorder.
- `packages/onioncut/bin/onioncut.mjs` — `dev`, `build`, `record`.
- `packages/onioncut/src/components/` — the tool itself: the app shell, the step timeline, the sidebar, `Div`. Nothing
  that belongs to one particular video goes here.
- `packages/onioncut/src/types/` — the types the tool itself is built on (`SceneDefinition`, `SceneStateDefinition`, …),
  one per file.
- `packages/onioncut/src/constants.ts` — only what the tool itself needs: the stage, the marketing frame, the panel gap.
- `apps/examples/scenes/` — the example videos, every one of them in a folder of the same shape
  (`sceneDefinitions.ts`, `states.ts`, `constants.ts`, `Scene.tsx`, then `components/`, `types/`,
  `data/`, `assets/`). The shape is spelled out in the README; keep the four root files named the same
  in every scene, so any scene is read the same way. A project's own scenes have this shape too,
  wherever it keeps them.
- `apps/examples/scenes/backdrop/` is not a scene — it is the background those scenes share. What one set
  of scenes shares sits **beside** them, inside the folder they are in; what videos in _different_
  folders share goes in a folder the project lists as `shared`, imported by that folder's own name:
  `#shared/Watermark`. Tailwind scans the scene folders, their parent and those — and nothing further
  out, so a shared component kept anywhere else has its classes purged and the scene records without
  it.
- `apps/examples/output/` — what a render of the examples produces. Gitignored. Never commit a clip. A project
  renders wherever its scenes say, which for a long-form video is that video's own folder.
- [`BRAND.md`](./packages/onioncut/BRAND.md) — how a scene is allowed to look: the palette, the type, the surfaces, the
  motion. **Read it before drawing anything.** If it still carries the `BRAND-NOT-SET-UP` comment at
  the top, nobody has replaced the starter brand yet: say so, and offer to write it from the project's
  real colours before building a scene rather than quietly drawing in someone else's palette.

`Scene.tsx` is named after what it exports, and not `scene.ts`, because a file cannot differ from
`Scene.tsx` only in case on macOS.

## Building a scene

- **Tuning happens in the browser, not in exports** — `pnpm dev` in the project, then
  `http://localhost:5200/?scene=<folder>-<scene>`. When someone wants to give feedback on a scene, open it
  there for them; an exported video cannot be pointed at.
- **Work state by state.** Build one until it is right, then step to the next. Adding a state is a line
  in the scene's `states.ts` plus a branch in its transform and timing functions.
- **Every element stays in the DOM in every state.** Only `transform`, `opacity`, `filter` and
  `z-index` change. Something that leaves the DOM cannot animate away — collapse it instead (a
  `grid-template-rows` wrapper going from `1fr` to `0fr` animates a height to zero without knowing it).
- **Blur belongs on a layer of its own**, inside the element that moves. Animating a transform in the
  same `filter` re-blurs everything on every frame and the scene stutters.
- **Every value a scene is tuned by lives in its `constants.ts`** — durations, distances, sizes.
  Nothing is timed anywhere else.
- **Colours, type, radii and easing come from [`BRAND.md`](./packages/onioncut/BRAND.md)**, never from taste. One easing
  curve across every scene is what makes a set of videos look like a set.

## Rendering a video

- **Always deliver the full cut and every step.** One run does both:

  ```bash
  pnpm record --scene=<folder>-<scene>
  ```

  It writes what the scene declares in its `render` — which variants, and optionally where:

  ```ts
  render: {
    variants: { fullCut: true, stepClips: true },
  },
  ```

  - `fullCut` — `animation-<folder>-<scene>.mov`, the whole scene, each state held for the length the
    scene declares
  - `stepClips` — `animation-<folder>-<scene>-step-<n>-<state>.mov`, one clip per step: its transition,
    then **2 s** of the finished state

  Without an `outputPath` the clips go to `<outDir>/<folder>-<scene>/`, `outDir` being the project's
  (`onioncut.config.json`, `output` when left out). A scene that names an `outputPath` — a long video
  keeping its clips beside its script — goes there instead; `~` and absolute paths are taken as they
  are, a relative one is resolved from the project root. The recorder ends by printing every file it
  wrote by its full path and `Saved to <folder>`; read the folder from there rather than working it out. The file name and the key the preview and the recorder open the scene by (`?scene=`,
  `--scene=`) both come from the folder's `id` and the scene's `id`: `<folder>-<scene>`. A variant the
  scene turns off is treated like a removed step: its files are removed on the next run.

- **Step clips are the transition plus a fixed 2 s hold** (`--step-hold`). Keep them as video — a still
  of the last frame is not a substitute. Do not pad them to a fixed length either: long clips were
  tried and were only dead frames to scroll past.
- **Never delete, rename or copy over `animation-` files by hand.** They may already be in an edit. The
  recorder leaves unchanged clips untouched, overwrites changed ones in place so the edit keeps its
  link, and removes only the steps the scene no longer has. Just re-run it.
- Re-render one step with `--only=<state>`. It updates that step's clip and deletes nothing.
- **`--out=<dir>` sends one run somewhere else** and deletes nothing, for checking a render without
  touching the folder an edit is already linked to. The scene's own folder is where the cut
  comes from; a test render never goes there.
- **`--marketing` is a different video, not a setting of the same one.** It records the framed view —
  stage in its frame, row of steps underneath — and writes a single `animation-<folder>-<scene>-marketing.mp4`
  into `<outDir>/marketing/` and no step clips. Use it when the ask is about showing the tool; never for the cut itself.
- **A marketing take is sized by constants, never by hand.** It is `MARKETING_WIDTH` wide, with
  `MARKETING_PADDING` around everything and `MARKETING_STEPS_GAP` between the stage and the steps; the
  steps are drawn large (`MARKETING_STEP_HEIGHT`, `MARKETING_STEP_FONT_SIZE`) so they read once the video
  is shrunk into a post. Its height is not set anywhere — the recorder lays the page out at that width,
  asks it how tall it came out and shoots exactly that, so more rows of steps make a taller video. Tune
  the constants; never pin a height in a scene.
- **Every render is `.mov`, 4K, at maximum quality — transparent or not. Never offer or add a way to go
  lower, and never produce `.mp4`.** 3840 × 2160, ProRes 4444, colour at full resolution. **The one
  exception is `--marketing`, fixed and not an option:** a marketing take is made to be posted, so it is
  always 1920 wide at 1× and H.264 `.mp4` (CRF 16, `yuv420p`, `+faststart`), and always silent. Never make
  a marketing take 4K, ProRes or with sound, and never make the cut anything but 4K ProRes.
- **`--transparent` keeps the alpha channel**, so what a scene leaves empty stays see-through and the
  clip can sit over footage.
- **After every render, verify it:** read the recorder's list of what was `new`, `updated`,
  `unchanged` and `removed`, check the durations with `ffprobe`, and pull a frame from the **middle of
  a transition** — a still of the end state does not prove the transition was captured.

## Things that cost time to find out

Every line here was paid for once. None of it is obvious from the code, and most of it looks like a
bug worth fixing until you know why it is there.

### Tailwind

- **Tailwind 4, configured from CSS, which is why the entry stylesheet is generated.** `@config` and
  `@source` take paths, and the paths — the project's config, its scene folders — are only known once
  the project's config has been read. So the CLI writes `packages/onioncut/src/tailwind.entry.css` on every run, with an
  absolute `@config` and one `@source` per folder, and `main.tsx` imports it before `index.css`. It is
  gitignored and never edited by hand.
- **That is also why `vite build` on its own does not work any more**, and nothing should be made to
  work that way: the entry does not exist until the CLI has written it. `dev`, `build` and `record` all
  go through the CLI, which writes it first.
- **A project's config can be TypeScript, and can import TypeScript**, because Tailwind loads it
  itself rather than Node loading it. That is the whole reason it goes in through `@config` instead of
  being read and passed to the PostCSS plugin as an object.
- **The preset is a Tailwind 3-style JavaScript config and that is on purpose** — `@config` is exactly
  the compatibility path for one, and a project that spreads its brand into `theme.extend` keeps
  working.

### A project's TypeScript

- **`onioncut/client` is how a project gets the ambient types for an asset import.** A scene
  imports a `.avif` or a `.css`; those declarations are Vite's, and Vite is this package's dependency,
  not the project's, so the project cannot reference `vite/client` itself. It references ours, which
  is one line pointing at Vite's — never a second, hand-written set of `declare module '*.avif'` that
  drifts from what Vite actually does with the import.
- **`init` writes files; it never edits one that exists.** The `#shared` alias needs a `paths` entry
  in the project's `tsconfig.json`, and that is printed rather than written: a tsconfig can have
  comments, an `extends` chain and a shape that is the project's business.
- **A scene's libraries come from the package the tool is run from**, the nearest `package.json` above
  the working directory. A monorepo keeps its scenes in the repository root and runs the tool from
  `tools/<something>`, whose `node_modules` no folder above a scene passes through, so a bare import
  that Vite cannot find from the scene is looked up again from that package. Not a config option: the
  package that runs the tool is the one that installs what its scenes import.
- **The preset ships a `.d.ts`** so a project can build on it without taking `tailwindcss` as a
  dependency of its own just to name the type of its config.

### Formats

- **Alpha only survives as ProRes 4444 in a `.mov`.** H.264 has no alpha channel at all, and it stores
  colour at half resolution in both directions, which chews up every sharp coloured edge. So
  `--transparent` and `.mp4` are not two settings that could be combined — there is no flag to add.
  This is the reason the format is fixed rather than an option.
- **ffmpeg prints `Incompatible pixel format 'yuv444p12le' for codec 'prores_ks', auto-selecting
'yuv444p10le'` on every non-transparent render.** It is noise, not a downgrade to chase: the frames
  arrive as 8-bit PNG, so a 10-bit intermediate loses nothing, and the finished file still reads back
  as `yuv444p12le` because ProRes 4444 is a 12-bit format. Do not "fix" it by changing the pixel
  format.
- **Check a transparent render with `ffprobe`**: `pix_fmt` comes back `yuva444p12le`, against
  `yuv444p12le` for an ordinary one. That is the whole test of whether `--transparent` worked.
- **To look at the alpha itself**, the `format` filter has to come first:
  `-vf "format=rgba,alphaextract,format=gray"`. `alphaextract` on its own fails with _"The following
  filters could not choose their formats"_.
- **4K ProRes 4444 is enormous** — a six-second cut is about 60 MB, one scene's full run a few hundred.
  That is why `output/` is gitignored and why a clip is never committed or attached anywhere.

### The recorder

- **Chrome's virtual-time policy is the obvious way to stop the clock and the wrong one.** With the
  clock stopped the compositor stops producing frames and `page.screenshot` times out part-way through
  a render, at around frame 90. The transitions are paused and seeked instead.
- **A page once died at around its six-hundredth screenshot** with a detached frame, when the full cut
  and every step clip ran on one page. Each clip has a page of its own now; a full cut of 912
  screenshots records on one without trouble. Should it come back on a longer scene, the way out is a
  fresh page that walks to where the last one stopped, never one opened straight at a state.
- **`setState` has to run inside `flushSync`.** The recorder catches the new transitions the moment the
  state changes; a normal `setState` commits a frame later, by which time they are already running.
- **`document.getAnimations()` is what forces the style recalc** that creates the transitions. Calling
  it is not an inspection, it is the step that makes them exist so they can be paused.
- **Catching them in that one tick is not enough, and the failure is silent.** What a scene starts a
  moment later — an animation begun in an effect, which runs after the commit — is not there yet. A
  missed animation shortens the clip (its length is the last transition's end plus the hold) and
  settles the picture early, freezing a frame that is still moving. Whether it is missed depends on
  timing, so the same scene renders differently from one run to the next and the clip already in an
  edit quietly changes length. So the animations are caught twice: straight away, because a
  transition shorter than a frame would otherwise be over and gone, and again after two frames.
- **Reach a state by walking through the ones before it, never by opening the page on it.** A scene
  is not a pure function of its state: it carries things from one state into the next — where the
  cursor last clicked, a menu item still lit — and a page opened straight at a state has none of them,
  so the clip jumps where it starts. Every state walked through is finished before the next one
  starts, so none of its animations is left around to be counted into how long the step lasts.
- **Animations from the state being left are `finish()`ed, never rewound.** Rewinding plays the old
  state backwards underneath the new one.
- **Before the first frame:** decode every image, await `document.fonts.ready`, then wait another
  1.5 s. Without it the layout re-packs itself in the middle of the recording.
- **Holds cost nothing.** Once the last transition has landed every frame is the same picture, taken
  once and written as many times as needed — the `cards` scene is 599 frames from 250 screenshots.
- **Clips are compared by the hash of their decoded frames, not by file bytes**, which is what makes an
  unchanged clip detectable and leaves an edit's links intact.

### One clip at a time

- **The full cut is recorded on one page, state after state, as the preview plays it.** It was once cut
  into a part per state, each recorded on its own page opened at the state before it and all of them
  at once, then joined. Every join was a page that had never played the states before it, and every
  one of them could jump: a cursor where nothing had moved it, a menu without the item the cursor had
  lit. Faster, and wrong in a way no check catches reliably — so clips are recorded one after another.

### Verifying a render

- **A still of the end state proves nothing.** Pull a frame from the _middle_ of a transition:
  `ffmpeg -ss <seconds> -i <clip> -frames:v 1 out.png`. A scene whose transitions were never captured
  produces perfectly good-looking end frames.
- Read the recorder's own list of `new` / `updated` / `unchanged` / `removed`, and check durations with
  `ffprobe -show_entries format=duration`.

### Drawing

- **Scattering on a circle gives a ring with a hole in the middle.** The radius has to vary per item,
  or twelve cards land on one orbit and the pile reads as a wreath.
- **Reveal a panel with `clip-path`, not by animating its width.** The text inside keeps its own
  layout, so nothing reflows while the panel opens.
- **An element that leaves the DOM cannot animate away.** Collapse it instead — a
  `grid-template-rows` wrapper going from `1fr` to `0fr` animates a height to zero without knowing it.
- **Fonts are loaded with `display=block`, never `swap`.** A render must not photograph a fallback
  face while the real one is still loading; `block` holds the text invisible instead of showing the
  wrong one. The CLI appends it to a project's Google Fonts URL that does not already say otherwise.
- **`document.fonts.ready` is not enough, and this one costs a whole re-record to find.** A browser
  fetches a web font only when something is laid out in it, so a face that first appears in the
  twelfth beat is still unrequested when the first frame is taken — and the clip comes back with that
  line in the fallback. Every face named by the Google Fonts URLs, the tool's own and the project's,
  is asked for with `document.fonts.load()` before `isReady()` returns true. Which faces those are is
  read out of the URLs rather than listed in a scene, because a list in a scene goes stale the moment
  someone sets a heading in a weight that is not in it.
- **Something arriving moves and fades at once.** A fade on its own reads as a glitch at 30 fps.

## When something is missing

This tool leans on things that live outside the repository — ffmpeg, a browser, a free port. When one
of them is not there, **say what is missing and give the exact command to install it, then wait.**
Never quietly work around it: a render without ffmpeg is not a slower render, it is no render, and a
fallback that produces a worse file is worse than an error.

- **`ffmpeg` or `ffprobe` not on the PATH** — nothing can be encoded or checked.
  `brew install ffmpeg` on macOS, the distribution's package on Linux.
- **"No Chrome found"** — the recorder drives the browser already on the machine rather than
  downloading one. It looks in `CHROME_CANDIDATES` at the top of `packages/onioncut/src/cli/record.mjs`, and those paths
  are macOS ones. Offer to install Chrome, or to add the machine's own path to that list — do not
  switch the project to full `puppeteer` to dodge it.
- **`node_modules` missing or out of date** — `pnpm install`. If the package manager itself is not
  there, say which one the lockfile is for rather than swapping it for another.
- **Port 5200 already taken** — the preview. Name what is holding it rather than picking another
  silently; `--port` moves it. The recorder's own server starts at 5201 and takes the next free port
  on its own, because another checkout's leftover preview is no reason a render cannot happen.
- **A dependency the work genuinely needs** — propose it with the command and what it buys, and wait
  for a yes. Do not add one to `package.json` on your own initiative.

The same holds for anything else that blocks: name it, name the fix, and let the user decide.

## Code style

- Follow the style of the file you are in. Don't invent new patterns.
- Before creating a file, open a similar one and mirror its structure.
- One type per file under `types/`.
- Comments explain **why**, and earn their place: a comment that restates the line below it is noise.
