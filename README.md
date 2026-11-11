# Onioncut

Animated scenes built as a web page and rendered into 4K ProRes clips.

**It is installed into a project and run from it.** The app shell — the stage, the timeline, the
sidebar, the recorder — is this package; the scenes belong to the project, and live wherever its
videos live. So one copy of the tool serves every repository, and a video's scenes sit next to the
script they illustrate instead of in a tool somewhere else.

Every movement in a scene **is** a CSS transition, so a scene is tuned in the browser like any other
page — open it, change a number, see it. The recorder then turns it into video by stopping the clock
and photographing the page one frame at a time. Why it works that way, and not like a screen recorder,
is in [Why stop-motion](#why-stop-motion-not-a-screen-recorder).

Two example scenes come with it under `apps/examples/scenes/`, both drawn in CSS with no images, as
something to copy from:

| Scene         | Length | What it is                                                                    |
| ------------- | ------ | ----------------------------------------------------------------------------- |
| `cards`       | 5.9s   | A deck dealt onto the stage, packed into a grid, then one card pulled in front |
| `lower-third` | 4.5s   | A name badge wiping in over nothing — the one to record with `--transparent`   |

## Requirements

- Node 20+ and a package manager
- **ffmpeg** on the `PATH` (`brew install ffmpeg`)
- **Chrome, Chromium or Edge** installed. The recorder drives the browser already on the machine
  through `puppeteer-core` rather than downloading one of its own; the paths it looks in are
  `CHROME_CANDIDATES` at the top of `packages/onioncut/src/cli/record.mjs`, and they are macOS paths — on Linux or
  Windows, change them.

**Setting it up in another repository is written out in [`INSTRUCTIONS.md`](https://github.com/onioncut/onioncut/blob/main/INSTRUCTIONS.md)** —
install, config, scenes, shared components, recording, and what catches people out. What follows here
is the short version.

## Install it into a project

```jsonc
// package.json — React is the project's own, because its scenes import it
{
  "dependencies": {
    "react": "^19.0.0",
    "onioncut": "^0.1.0"
  },
  "scripts": {
    "dev": "onioncut dev",
    "record": "onioncut record"
  }
}
```

```jsonc
// onioncut.config.json, at the root of the project
{
  // Globs naming the scene FOLDERS, `*` and `**` both work. A scene is a folder with a
  // sceneDefinitions.ts in it; anything else matched is ignored.
  "scenes": ["videos/*/animations/*"],
  // Optional. Where renders land, relative to this file; `output` when left out. A scene goes to
  // <outDir>/<folder>-<scene>/ unless it names an outputPath of its own.
  "outDir": "output",
  // Optional. Left out, the scenes are drawn in the tool's own starter palette. TypeScript is fine,
  // here and in whatever it imports: a config Node cannot load is handed to Tailwind's own loader.
  "tailwind": "tailwind.config.ts",
  // Optional. The web fonts the scenes are set in, added to the page. `display=block` is appended to
  // a Google Fonts URL that does not already say otherwise, and every face the URL names is loaded
  // before the recorder is told the page is ready — a render must not photograph a fallback face.
  "fonts": ["https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600"],
  // Optional. A stylesheet of the project's own, loaded into the page.
  "css": "animations.css"
}
```

```ts
// tailwind.config.ts — TypeScript is fine, here and in whatever it imports, because Tailwind loads
// this file itself through `@config`. No `content`: which files are scanned is worked out from the
// scene folders, so the project never has to know where the tool keeps its own components.
import preset from 'onioncut/tailwind-preset';

export default {
  presets: [preset],
  theme: { extend: { colors: { stage: '#0E0D0B' } } },
};
```

```ts
// tools/onioncut/env.d.ts — written by init. A scene imports images, AVIF stills and
// stylesheets, and those are Vite's ambient types. Vite is the tool's dependency rather than the
// project's, so the project reaches them through the tool rather than restating them and drifting.
/// <reference types="onioncut/client" />
```

The config is looked for in the current folder and every folder above it, so the tool can be run from
a subfolder the way git can. `--config=<path>` points it somewhere else.

## Preview

```bash
pnpm install
pnpm dev          # --port, --host, --config; --port=5300 and --port 5300 both work
```

Then open <http://localhost:5200>. The stage is always 1920 × 1080 and only scaled to fit the window,
so a position tuned in a small window is the same position in a full-size capture.

## States are the unit of work

Buttons under the stage switch between a scene's states. Build one state until it is right, then step
to the next; give feedback against a state ("the cards sit too high in 3"), never against a timestamp.

- The active state is in the URL (`?scene=cards-cards&state=grid`), so any moment can be linked to and
  reloaded into.
- `←`/`→` step between states, `↓`/`↑` jump to the first or last, `R` hides everything for a clean
  screen capture.
- **Space plays the cut from the selected step**, holding every state for exactly as long as the export
  does, and a playhead runs across the active step as its hold runs down. What plays here is the cut,
  not an impression of it. Picking a state by hand stops playback.

Each step in the timeline is as wide as it is long, so the row reads as the timeline of the picture
above it.

## Scenes

One tool, several videos. A scene owns its states and what it draws in them; the stage, the player and
the recorder are shared. Pick one with `?scene=` in the preview or `--scene=` when recording.

A new video is **a new folder matching the project's `scenes` globs**, in the shared shape, and
nothing else — the registry collects every matched folder that has a `sceneDefinitions.ts`, so nothing
is registered by hand and two scenes built on two branches never meet in the same file:

```
.claude/long-videos/<video>/animations/<scene>/
  sceneDefinitions.ts  the folder's id and title and its scenes, declared through defineScenes(): each with id, title, states, Scene, render and optionally music
  states.ts            its steps and how long each is held
  constants.ts         every value it is tuned by — durations, sizes, positions
  Scene.tsx            the scene component, always exported as Scene
  components/          the components only this scene draws
  types/               the types only this scene uses, one per file
  data/                its fixtures and computed data
  assets/              its images, imported in code — never referenced as a /path string
```

Everything a scene imports comes from `'onioncut'` and nothing deeper: `defineScenes`,
`constants`, `Div`, and the types. A scene's `constants.ts` spreads the tool's own constants into its
object, so scene code reads `constants.STAGE` and its own values from one import.

**What a set of scenes shares goes in a folder beside them**, inside the same parent — `backdrop/` in
the examples, with no `sceneDefinitions.ts`, so it is not a scene. Tailwind scans the scene folders
and the folder they sit in, which is exactly that much and no more: a shared component kept somewhere
else has its classes purged, and the scene then records perfectly well without its background.

## How a scene animates

Both demo scenes follow the same rules, and they are the rules the recorder depends on:

- **Everything is in the DOM in every state.** The markup never changes; only `transform`, `opacity`,
  `filter` and `z-index` do. An element that leaves the DOM cannot animate away.
- **Position from one origin.** A card is placed at its grid slot and moved from there, so the grid
  state is `translate(0, 0)` and there is never a second set of coordinates to keep in step.
- **Two layers when something is blurred.** The outer element owns position and opacity, the inner one
  owns the blur and nothing else. Anything animating in the same `filter` makes the browser re-blur
  every element on every frame of that transition, and the whole scene stutters.
- **Timings live in the scene's `constants.ts`.** Nothing else times anything.
- **Stagger walks the set with a coprime stride**, not in grid order: staggering by column sends a
  visible wave across the stage instead of a scatter.

Assets belong to the scene that draws them — `<scene>/assets/`, imported in code
(`import hills from './assets/hills.png'`), never as a `/path` string. Vite turns the import into the
right URL in the preview and in the build, so moving or deleting a scene takes its images with it.

## Record

```bash
# the full cut and every step as its own clip — one run, both
pnpm record --scene=cards-cards

# re-cut a single step after changing it
pnpm record --scene=cards-cards --only=pile

# keep the alpha channel, to lay the clip over footage
pnpm record --scene=lower-third-lower-third --transparent

# the same scene as the tool looks in use — framed, with the row of steps — for marketing
pnpm record --scene=cards-cards --marketing
```

**Where a render lands is `<outDir>/<folder>-<scene>/`** — `outDir` is the project's, `output` when
the config leaves it out, gitignored and deletable whole without thinking about what else might be in
it. A scene that names a `render.outputPath` of its own goes there instead; `~` and absolute paths are
taken as they are, a relative one is resolved from the project root. The run ends by listing every file
by its full path and `Saved to <folder>`.

Each run writes what the scene's `variants` turn on:

- `animation-<folder>-<scene>.mov` — the full cut, each state held for the length its scene declares
  (`fullCut`)
- `animation-<folder>-<scene>-step-<n>-<state>.mov` — one clip per step: its transition, then
  **2 seconds** of the finished state (`stepClips`)

**Music goes under the full cut only.** A scene that sets `music` to an imported track
(`import music from './assets/music.mp3'`) hears it in the preview, in step with the timeline from
wherever playback starts, and gets it mixed under `animation-<folder>-<scene>.mov` as 24-bit PCM, cut
to the length of the video and faded out over its last 1.5 s. Step clips stay silent — the edit runs
one track under all of them — and so does a `--marketing` take.

The name comes from the folder's `id` and the scene's `id`, which together are also the key the preview
and the recorder open the scene by: `?scene=cards-cards`, `--scene=cards-cards`.

**Always `.mov`, always 4K at maximum quality**: 3840 × 2160 in ProRes 4444, colour at full
resolution, transparent or not. H.264 `.mp4` keeps colour at half the resolution in both directions,
which chews up every sharp coloured edge — a hill over footage, a dot on dark cloth.

Each step clip is its transition followed by a fixed 2 s hold, counted from the moment the step's last
transition lands — known before the first frame, because the recorder has already caught and paused
every transition the state started. A slow build and an instant one get the same room to trim, and
nothing is padded with dead frames. Each clip starts exactly where the previous state ended, which is
why the steps do not add up to the full cut and are not joined into it.

**Re-rendering disturbs an edit as little as it can**, because the clips may already be cut in:

- Everything is rendered into a temporary folder first, so a render that dies half-way never leaves a
  half-written clip where the edit can see it.
- A clip whose picture has not changed is **not written at all** — compared by the hash of the decoded
  frames, not by file bytes.
- A clip that did change is written **over the existing file**, same path and same inode, so the edit
  picks up the new version instead of losing its link.
- Clips the scene no longer has (a removed step) are deleted. `--only` never deletes anything.
- The `animation-` prefix is how the recorder tells its own files apart. It never touches anything else in
  the folder.

| Flag            | Default             | Meaning                                                          |
| --------------- | ------------------- | ---------------------------------------------------------------- |
| `--scene`       | `cards-cards`       | Which video to record, by `<folder>-<scene>`                     |
| `--hold`        | each state's own    | Overrides every state's declared hold                            |
| `--step-hold`   | `2`                 | Seconds a step clip holds after its last transition              |
| `--marketing`   | off                 | Record the framed view into `<outDir>/marketing`, as `.mp4`       |
| `--transparent` | off                 | Keep the alpha channel, for laying over footage                  |
| `--only`        | —                   | Render only this step's clip, by state id                        |
| `--workers`     | `4`                 | How many clips to record at once                                 |
| `--out`         | the scene's own     | Write this run elsewhere, deleting nothing — to check a render   |
| `--record-port` | `5201`              | The recorder's own preview server; the next free port if taken   |

### Why stop-motion, not a screen recorder

There are two ways to turn an animated page into video, and this recorder deliberately takes the one
that looks slower.

**A screen recorder films the page while it plays.** The animation runs in real time and a camera
tries to grab a frame every 1/30 or 1/60 of a second. That is what
[agent-browser](https://github.com/vercel-labs/agent-browser) does — it captures a live CDP screencast,
JPEG by JPEG, at whatever rate the machine keeps up with.

**This recorder does stop-motion.** The page never plays; it is posed. After each state change the
recorder catches the CSS transitions the change created and pauses them. Then, for every frame, it
sets each transition's `currentTime` to exactly that frame's moment, takes a PNG screenshot and pipes
it into ffmpeg.

The rest of the tool is built on that choice. Stop-motion gives three things a screen recorder cannot:

- **The quality does not depend on the machine.** A busy machine makes a render slower, never worse.
  One render ran at a load of 18 on 10 cores: it took three minutes instead of one, and every frame
  came out right. Filmed live, those are exactly the moments frames get dropped — in the middle of the
  movement, where it shows.
- **Re-rendering does not disturb the edit.** Posing the same state twice gives byte-identical frames,
  so an unchanged scene re-renders into byte-identical clips and the recorder can tell precisely which
  clips changed. A live recording never comes out the same twice: every clip would be rewritten on
  every render.
- **Lengths are exact.** "The transition plus 2 seconds" is an exact number of frames. A live
  recording gets roughly that, depending on what it managed to capture.

The frames also go into the encoder losslessly — PNG, not JPEG — so the picture is compressed once, by
ProRes, instead of twice.

The one thing a screen recorder offers beyond this is 60 fps, and that is a constant here (`FPS` in
`packages/onioncut/src/cli/record.mjs`), still deterministic. Because holds are free (below), 60 fps only doubles the
frames in which something actually moves.

**When a screen recorder is the right tool:** filming a real app — clicking through it, waiting on a
server. Time cannot be stopped there, so there is nothing to pose. The scenes in this tool are
entirely under your control, so their clock can be stopped.

### How the recorder does it

- **Pausing and seeking.** `startState` switches the state and calls `document.getAnimations()`, which
  forces the style recalc that creates the new transitions, so they can all be paused before a single
  frame has passed. Whatever was still running belongs to the state being left and is parked on its
  last frame. `seekState` then sets every transition to the frame's moment, clamped to its own end,
  because delays and durations differ from element to element.
- **Holds cost nothing to render.** Once a state's last transition has landed, every remaining frame is
  the same picture, so the recorder takes it once and writes it as many times as the state still
  needs. Only frames where something moves are screenshotted — the output is byte for byte what
  shooting every frame gives, for about a third of the work. The recorder prints how many screenshots
  a run took.
- **A fresh page per clip.** One page carried through a full cut and then the step clips died around
  its six-hundredth screenshot with a detached frame. Each clip now opens its own page, and a step clip
  reaches its starting point by stepping through the states before it, unrecorded.
- **`--marketing` records the tool, not just the scene.** The stage keeps its frame and the row of
  steps stays under it, the playhead running across the active step. It writes a single
  `animation-<folder>-<scene>-marketing.mp4` into `<outDir>/marketing/` and no step clips, because nobody cuts this one.
  It is made to be posted, so it is 1920 wide at 1× and H.264 without sound — what X takes as it is. It is
  `MARKETING_WIDTH` wide with `MARKETING_PADDING` around everything, and as tall as its steps make it: the
  recorder lays the page out at that width and measures it, so a scene whose steps wrap onto three rows
  gives a taller video than one that fits on one. The steps are large on purpose —
  `MARKETING_STEP_HEIGHT` and `MARKETING_STEP_FONT_SIZE` — so they still read in a timeline on a phone.

Tried and dropped:

- **Chrome's virtual-time policy.** The obvious way to stop the clock, and the wrong one: with the
  clock stopped the compositor stops producing frames, and `page.screenshot` times out part-way
  through a render — at around frame 90.
- **Real-time screen capture** — for the reasons above.

Frame counts come from where each state **ends** on the timeline, not from rounding its own length.
Four 0.75s beats between half-second holds is 22.5 frames a beat: rounded per state that totals 4.07s,
rounded against the timeline it is exactly 4.00s.

## Making it yours

- **Start with [`BRAND.md`](https://github.com/onioncut/onioncut/blob/main/packages/onioncut/BRAND.md)** — the palette, type, surfaces and motion a scene is allowed to
  use. It ships describing the starter brand and carries a comment saying so; write your own in its
  place and delete the comment.
- **The palette** is the project's own `tailwind.config.ts`, built on `onioncut/tailwind-preset`
  — `stage` is the paper the stage is made of, and it is the only colour the tool itself refers to by
  name.
- **The background** is the project's, beside its scenes; `apps/examples/scenes/backdrop/SceneBackdrop.tsx`
  is one drawn in CSS to copy from.
- **The example scenes** live in this repository's `apps/examples/` and are not in the npm package, so
  a project has nothing to delete to be rid of them.
- **The font** is loaded in `index.html` with `display=block`, never `swap`: a render must not
  photograph a fallback face while the real one loads.

## License

MIT.
