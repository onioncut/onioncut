<!-- ───────────────────────────────────────────────────────────────────────────────────────────────
     BRAND-NOT-SET-UP

     This file still describes the starter brand the tool ships with — a warm paper palette that
     belongs to nobody. It is a placeholder, not a recommendation.

     Replace what is below with your own project's colours, type and motion, then DELETE THIS COMMENT.
     Its presence is how anyone — a person or an agent — can tell at a glance that nobody has been
     here yet, so it has to go on the first real edit, not the second.
     ─────────────────────────────────────────────────────────────────────────────────────────────── -->

# Brand

How a scene in this tool is allowed to look. `tailwind.config.ts` holds the values; this file holds
the intent, which is the part a config cannot carry.

Read it before drawing anything. A scene that invents its own colour, its own radius or its own easing
is the thing this file exists to prevent — three scenes tuned by eye is how a set of videos stops
looking like one set.

## Palette

Every colour is a token in `tailwind.config.ts`. Nothing in a scene is a hex code.

| Token           | Value     | What it is for                                                        |
| --------------- | --------- | --------------------------------------------------------------------- |
| `stage`         | `#F3EEE6` | The paper the stage is made of. The only brand colour the tool itself refers to by name |
| `ink-900`       | `#1C1A16` | Headings, and the fill of a panel laid over footage                    |
| `ink-700`       | `#3D3931` | Body text                                                              |
| `ink-400`       | `#8C857A` | Anything secondary — labels, captions                                  |
| `ink-100`       | `#E8E3DA` | The bars that stand in for text, dividers, empty states                |
| `accent-coral`  | `#E4674B` | The first accent, and the one a lone highlight uses                    |
| `accent-amber`  | `#E8A33D` | Second accent                                                          |
| `accent-sage`   | `#6E9B6B` | Third accent                                                           |
| `accent-sky`    | `#4E86B5` | Fourth accent                                                          |

- **The four accents are a set, used in order.** A scene that needs a dozen coloured things cycles
  through them rather than reaching for a fifth colour.
- **Accents colour a detail, never a surface.** A strip along the top of a card, a tag, a bar down the
  side of a panel. A card is white; the stage is `stage`.
- **Opacity is for depth, not for new colours.** `bg-accent-amber/25` is the sun behind the hills.
  A flat 60% of a brand colour to get a lighter one is how a palette turns into nine.

## Type

- **Figtree**, loaded in `index.html` with `display=block` and never `swap` — see CLAUDE.md for why a
  render must not photograph a fallback face.
- Two weights carry everything: `font-semibold` for anything that is read, regular for anything that is
  merely there.
- Set at stage scale, not at screen scale: a card title is 22px against a 1920 × 1080 stage, a lower
  third is 46px. Type tuned in a small window is type tuned at the wrong size.
- Uppercase with `tracking-[0.18em]` is for a label of two or three words. Never for a sentence.

## Surfaces

- **Cards are white**, `rounded-2xl`, with one long soft shadow —
  `shadow-[0_18px_40px_-12px_rgba(28,26,22,0.35)]`. Paper on paper: the shadow is what separates them,
  not a border.
- **Panels laid over footage** are `ink-900` at 95%, square-ish corners, with an accent bar down the
  leading edge.
- **The backdrop** is `src/scenes/backdrop/SceneBackdrop.tsx`: the stage colour, a sun and two soft
  hills, all drawn in CSS. It is deliberately quiet — it is the thing a scene stands on, not the thing
  anyone looks at.

## Motion

Motion is as much the brand as the colour is, and it is the part that is easiest to let drift.

- **One easing curve: `cubic-bezier(0.2, 0.8, 0.2, 1)`.** Fast out, settles slowly. Every transition in
  every scene uses it. A second curve needs a reason written down here.
- **Durations sit between 480ms and 800ms.** Something arriving takes longer than something leaving:
  an entrance is ~700ms, an exit ~500ms.
- **Things arrive in a stagger, 30–60ms apart**, and leave in the reverse order. One block of twelve
  cards moving together reads as a slide; the same twelve staggered read as a deck.
- **Something that arrives moves and fades at once**, never only fades. A fade on its own reads as a
  glitch at 30fps.
- **Every beat lands inside its own state.** Duration plus the last stagger has to fit in the hold the
  state declares, or the movement is still running when the next one starts.
- **Half a second of nothing at each end of a cut.** A video that opens mid-movement has nowhere to be
  cut into.

## Writing this file for your own project

Keep the four headings — palette, type, surfaces, motion. They are what a scene has to decide before
it can be drawn, and the reason they are written down is that the answers are otherwise re-invented per
scene.

Say what things are **for**, not only what they are. `#E4674B` belongs in the config; "the accent a
lone highlight uses" belongs here, because that is the sentence that settles an argument about a
fifth colour.
