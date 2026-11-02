# React Code Guidelines

How the app shell (`packages/onioncut/src/components/`) and the scenes are written. How a scene
animates — what stays in the DOM, what may change, where blur goes — is in
[`CLAUDE.md`](../../CLAUDE.md), and how it looks is in `BRAND.md`.

## onioncut Exceptions

- A scene's component is `export const Scene: FC<SceneComponentProps>`, typed by the API. It has no
  `Props` type of its own.
- The UI has no i18n: labels are plain English strings.

## Props Types Declaration

Quick description: Props are an exported type right above the component, named `XxxProps` after it
(never a bare `Props`), and the component is `export const Xxx: FC<XxxProps>`.

✅ DO:

```tsx
export type StageCardProps = {
  card: SceneCard;
};

export const StageCard: FC<StageCardProps> = ({ card }) => {
  return <Div className="size-full rounded-2xl bg-white">…</Div>;
};
```

❌ DON'T:

```tsx
type Props = { card: SceneCard };

export const StageCard = ({ card }: { card: SceneCard }) => {};
```

## Group Props of One Inner Element into an Object

Quick description: When a component passes several props through to one of its inner elements, take
them as one object named after that element, not as a row of prefixed props.

✅ DO: `label?: { text: string; className?: ClassNameInput }`

❌ DON'T: `labelText?: string; labelClassName?: ClassNameInput`

Props of the component itself (`isActive`, `onClick`) stay flat.

## Conditional Rendering

Quick description: Show or hide one element with `{condition && <X />}`. When the output depends on
which state the scene is in, compute it in a function above the JSX (`cardTransform({ card, stateId })`)
with one early-return `if` per state, and keep the JSX itself free of branches. Never a nested ternary
in JSX.

✅ DO:

```tsx
{
  !isTransparent && <SceneBackdrop />;
}

const placement = cardTransform({ card, stateId });

<Div style={{ transform: placement.transform, opacity: placement.opacity }} />;
```

❌ DON'T:

```tsx
<Div
  style={{
    transform:
      stateId === "pile"
        ? pileTransform
        : stateId === "grid"
        ? "none"
        : leaveTransform,
  }}
/>
```

In a scene this is not only style: every element stays in the DOM in every state, so "which state" is
a question of style values, never of which elements are rendered.

## Conditional CSS Classes

Quick description: `Div` takes `className` as an array, so a conditional class is
`condition && 'class'`. On other elements, build the same array and `.filter(Boolean).join(' ')`. Never
a template literal with a ternary in it.

✅ DO:

```tsx
<Div className={['relative shrink-0 select-none', !isRecording && 'cursor-ew-resize']} />

<button
  className={['rounded-lg border', isActive && 'border-gray-400 bg-gray-800', !isActive && 'border-gray-800 bg-gray-900']
    .filter(Boolean)
    .join(' ')}
/>
```

❌ DON'T:

```tsx
<div className={`relative shrink-0 ${isRecording ? "" : "cursor-ew-resize"}`} />
```

A class built at runtime from parts (`` `bg-${colour}-500` ``) is never found by Tailwind's scan and is
purged. Write every class name out in full.

## Layout and Spacing

Quick description: In the app shell, space siblings with `flex` / `grid` and `gap-*` on the parent,
never with `mt-*` / `mb-*` on the children.

✅ DO:

```tsx
<Div className="flex flex-col gap-4 p-6">
  <Div className="text-[22px] font-semibold">{card.label}</Div>
  <Div className="flex flex-col gap-2.5">…</Div>
</Div>
```

❌ DON'T:

```tsx
<Div className="p-6">
  <Div className="mb-4 text-[22px] font-semibold">{card.label}</Div>
  <Div className="mt-2">…</Div>
</Div>
```

On the stage, elements are placed absolutely against the fixed stage size and moved with `transform`;
spacing between them comes from the scene's `constants.ts`, not from margins.

## Hooks

### Keep a Hook's Result Whole

Quick description: A hook that returns several values is kept as one named value and read from, so the
source stays visible where each value is used. `useState` and `useReducer` keep their usual
`[value, setValue]`.

✅ DO:

```tsx
const sceneMusic = useSceneMusic({ states, stateIndex, isPlaying, timeInState });

<audio ref={sceneMusic.audioRef} />;
```

❌ DON'T:

```tsx
const { audioRef, isMuted, toggleMute } = useSceneMusic({
  states,
  stateIndex,
  isPlaying,
  timeInState,
});
```

A hook that returns a single value may be destructured.

### Effects and the Recorder

- An animation a scene starts in an effect runs after the commit, so the recorder has to catch it late
  (see "The recorder" in `CLAUDE.md`). Prefer a CSS transition driven by the state over an animation
  started from an effect.
- When `react-hooks/exhaustive-deps` is disabled for a line, the comment above it says which value is
  left out on purpose and why (`useSceneMusic` reads `timeInState` only when playback starts).

## Refs Over State for What Is Not Drawn

Quick description: A value that only event handlers read (a drag in progress, the last position) is a
`useRef`, not state. A re-render between two events would lose state the second event needs, and
nothing on screen depends on it.
