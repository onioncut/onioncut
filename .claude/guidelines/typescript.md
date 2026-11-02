# TypeScript Code Guidelines

Most of these rules are enforced by `eslint.config.mjs` (`pnpm lint`); the rest are how the code is
written anyway. Where a scene's files go and what goes in its `constants.ts` is in
[`CLAUDE.md`](../../CLAUDE.md).

## onioncut Exceptions

- **The CLI is plain ESM JavaScript** (`packages/onioncut/bin/*.mjs`, `packages/onioncut/src/cli/*.mjs`),
  because Node runs it before anything can transpile. It has no types and ESLint does not lint it, but
  every rule below that is not about types still applies. See **The CLI** at the end.
- **A scene's component is always `export const Scene: FC<SceneComponentProps>`**, typed by the API,
  with no `Props` type of its own.
- **`packages/onioncut/src/api.ts` is the only multi-export file** of the package: it is the public
  API, not a re-export file.
- **`tailwind.preset.js` and its `.d.ts` use a default export**, because Tailwind reads a config that
  way.

## Exports and Files

Quick description: Only named exports. A file exports one thing and is named after it.

✅ DO:

```typescript
// packages/onioncut/src/utils/defineScenes.ts
export const defineScenes = ({ id, title, scenes }: DefineScenesArgs) => {
  // …
};
```

❌ DON'T:

```typescript
// packages/onioncut/src/utils/scenes.ts
export default function defineScenes(args: DefineScenesArgs) {}
export const sceneKey = (folderId: string, sceneId: string) => {};
```

### Key Points:

- No `export default` (exceptions above)
- One exported symbol per file, named after it
- A private helper that only this file uses may stay in it, above the export — `cardTransform` and
  `cardTiming` in a scene's `Scene.tsx`, `flattenClassName` in `Div.tsx`. Once a second file needs it,
  it moves to a file of its own
- The function's own `XxxArgs` / `XxxProps` type stays in its file, right above it

## Types vs Interfaces

**IMPORTANT**: Never `interface`, always `type`. Enforced by ESLint.

✅ DO:

```typescript
export type SceneStateDefinition = {
  id: string;
  label: string;
  hold: number;
};
```

❌ DON'T:

```typescript
interface SceneStateDefinition {
  id: string;
  label: string;
  hold: number;
}
```

## One Type per File

Quick description: A standalone type gets its own file under `types/`, named after the type. Never
several types in one shared file.

✅ DO:

```typescript
// packages/onioncut/src/types/SceneRenderDefinition.ts
export type SceneRenderDefinition = { … };

// packages/onioncut/src/types/SceneRenderVariants.ts
export type SceneRenderVariants = { … };
```

❌ DON'T:

```typescript
// packages/onioncut/src/types.ts
export type SceneRenderDefinition = { … };
export type SceneRenderVariants = { … };
export type SceneStateDefinition = { … };
```

### Key Points:

- Applies to the tool (`packages/onioncut/src/types/`) and to every scene (`<scene>/types/`) alike
- **Exception — component props**: `XxxProps` stays in the component's file, right above it
- **Exception — function args**: `XxxArgs` stays in the function's file, right above it — unless a
  scene's helper inside `Scene.tsx` uses it, in which case it goes to the scene's `types/`
  (`CardTransformArgs`)
- Do not introduce a shared `Base` type to save repeating two or three fields

## Function Definitions

Quick description: Arrow functions with `export const`, never `function` declarations.

✅ DO:

```typescript
export const stateIndex = (stateId: string) => {
  return states.findIndex((state) => state.id === stateId);
};
```

❌ DON'T:

```typescript
export function stateIndex(stateId: string): number {
  return states.findIndex((state) => state.id === stateId);
}
```

## Always a Block Body with `return`

Quick description: A named function or component always has a block body and an explicit `return`.

The body is then always in the same place, an early return can be added without rewriting the
signature, and a diff that adds one line stays one line.

✅ DO:

```tsx
export const Div: FC<DivProps> = ({ className, ...args }) => {
  return <div {...args} className={flattenClassName(className).join(" ")} />;
};
```

❌ DON'T:

```tsx
export const Div: FC<DivProps> = ({ className, ...args }) => (
  <div {...args} className={flattenClassName(className).join(" ")} />
);
```

- **Inline callbacks are exempt**: `.map()`, `.filter()`, `.sort()` and event handlers keep the concise
  form
- This is about the body, not the return type — see **Return Types**

## Object Arguments

Quick description: A function takes one object and destructures it in the parameter list, so a call
reads as named arguments and a new field never shifts the others.

✅ DO:

```typescript
const cardTransform = ({ card, stateId }: CardTransformArgs) => {
  // …
};

cardTransform({ card, stateId });
```

❌ DON'T:

```typescript
const cardTransform = (card: SceneCard, stateId: string) => {};

const cardTransform = (args: CardTransformArgs) => {
  const { card, stateId } = args;
};
```

- A function of a single obvious value may take it directly (`stateIndex(stateId)`, `slugify(text)`)
- When a destructured parameter has to be transformed, take the rest as `...args` and read
  `args.value`, rather than shadowing it with `parsedValue`

## Type Names

Quick description: `XxxArgs` for function arguments, `XxxProps` for components and hooks, named after
the function. Never a bare `Args`, `Props` or `Options` (ESLint warns). Prefer `Pick<>` of an existing
type over a new one that copies its fields.

✅ DO: `export type UseSceneMusicArgs = { states: SceneStateDefinition[]; stateIndex: number; … };`

❌ DON'T: `export type Args = { states: SceneStateDefinition[]; stateIndex: number; … };`

## Return Types

Quick description: Let TypeScript infer return types. Spell one out only where it cannot be inferred —
a recursive function (`flattenClassName`) — and say so in a comment.

## Never `any`

Quick description: Use a specific type, a generic, a union or `unknown` narrowed at runtime. `any`
switches the checker off, and the error it hides shows up in a render.

## Inline Single-Use Values

Quick description: A value used once is written where it is used. Static data is read straight from its
source (`constants.CARD.width`), never copied into a local first.

✅ DO:

```typescript
return {
  duration: constants.ENTER_DURATION,
  delay: card.order * constants.ENTER_STAGGER,
};
```

❌ DON'T:

```typescript
const duration = constants.ENTER_DURATION;
const stagger = constants.ENTER_STAGGER;

return { duration, delay: card.order * stagger };
```

A local is fine when it is used more than once, or when its name says something the expression does not
(`pileOffset`, `isFocused`).

## Constants

Quick description: A package's or scene's tuning values live in one `export const constants = { … }`
object in its `constants.ts`, keys in `SCREAMING_SNAKE_CASE`, read as `constants.NAME`, never
destructured.

- A scene's `constants.ts` spreads the tool's own (`...toolConstants`), so scene code reads
  `constants.STAGE` and its own values from one import (see `CLAUDE.md`)
- A CLI module that is a single file may keep its own `const constants = { … }` at the top
  (`record.mjs`)
- Every number says its unit, in the name or in the comment above it. Transition durations and delays
  are milliseconds; a state's `hold` is seconds. A bare `700` with nothing saying which is a bug waiting
  to happen

## Branching on a Value

Quick description: No `switch` (ESLint warns). Branch with early-return `if`s, one per case, or look the
value up in an object keyed by it.

✅ DO:

```typescript
if (stateId === "pile") {
  return {
    duration: constants.ENTER_DURATION,
    delay: card.order * constants.ENTER_STAGGER,
  };
}

if (stateId === "leave") {
  return { duration: constants.LEAVE_DURATION, delay: 0 };
}

return { duration: constants.FOCUS_DURATION, delay: 0 };
```

❌ DON'T:

```typescript
switch (stateId) {
  case 'pile':
    return { … };
  case 'leave':
    return { … };
}
```

Never nest ternaries. One ternary choosing between two values is fine.

## Strings

Quick description: Template literals, never `+` concatenation.

✅ DO: `` `animation-${id}-${scene.id}` ``

❌ DON'T: `'animation-' + id + '-' + scene.id`

## Names

- **Full words in callbacks**, never single letters: `(state) => state.id`, `(error) => …`,
  `(first, second) => first - second`. An argument that is not used is named `unused`.
- **One name for one value across layers**: a state's id is `stateId` from the URL to the recorder,
  `hold` is `hold` everywhere, not `duration` in one place and `length` in another. A search for the
  name then finds every place it is used.
- Object shorthand when the property and the variable have the same name: `{ id, title }`.

## Blank Lines

Quick description: A blank line before every `return` (unless it is the only statement of the block)
and around every `if`. `if` always has braces. Enforced by ESLint.

✅ DO:

```typescript
if (to === undefined) {
  return Number.isNaN(from) ? [400] : [from];
}

return [...new Set([from, …, to])];
```

❌ DON'T:

```typescript
if (to === undefined) return Number.isNaN(from) ? [400] : [from];
return [...new Set([from, …, to])];
```

A statement that spans several lines gets a blank line before and after it.

## Imports

Quick description: Builtins and packages first, then the repository's own files, alphabetical, no blank
lines between groups. Enforced by ESLint (`import/order`).

✅ DO:

```typescript
import { FC } from "react";
import { Div, SceneComponentProps } from "onioncut";
import { StageCard } from "./components/StageCard";
import { constants } from "./constants";
```

- A scene imports from `'onioncut'` and nothing deeper (see `CLAUDE.md`)
- Builtins with the `node:` prefix: `import { join } from 'node:path'`

## No 1:1 Re-export Files

Quick description: Never create a file that only re-exports something from elsewhere. Import from the
source. The one public entry, `api.ts`, is the package's API and the only exception.

## Dead Data Cleanup Upstream

Quick description: When nothing reads a field any more, remove it from the type and from the code that
produces it, not only from the consumer. TypeScript never reports a field that is still being filled
in.

**Exception — external contracts**: keep it when it is part of what projects depend on: the exports of
`api.ts`, the fields of `SceneDefinition` and the types around it, the keys of `onioncut.config.json`,
the CLI flags and the clip file names. Removing one of those is a breaking change with a changeset
(see [`changelog.md`](./changelog.md)).

## Environment Variables

Quick description: `process.env` is read only in the CLI (`CHROME_PATH` in `record.mjs`). The app and
the scenes never read it — ESLint rejects it in TypeScript — and get what they need from the project's
config through the CLI.

## The CLI

- Plain ESM: `.mjs`, `import`/`export`, top-level `await` where it helps.
- External programs (ffmpeg, ffprobe, Chrome) are started with `execFile` / `spawn` and an argument
  array, never a shell string.
- A failure the user can fix is a thrown `Error` whose message says what is missing and what to run
  or write, as `readProjectConfig.mjs` does. No silent fallback (see "When something is missing" in
  `CLAUDE.md`).
- Output for the user goes through `console.info`, failures through `console.error` — the same split
  the ESLint rule allows in TypeScript.
