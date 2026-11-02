# Common Code Guidelines

Rules that hold everywhere in the repository. What a scene must look like, how the recorder works and
what to do when ffmpeg or Chrome is missing are in [`CLAUDE.md`](../../CLAUDE.md); they are not repeated
here.

## Security Risk Assessment

- **MANDATORY**: Review every change for security problems and data leaks, and alert the developer
  immediately when you find one.
- onioncut runs on someone else's machine, inside someone else's project. Watch for:
  - A shell command built from a string. ffmpeg, ffprobe and Chrome are started with `execFile` /
    `spawn` and an array of arguments, never through a shell, so a scene id or a path with a space,
    a quote or a `;` in it is just a name
  - Files written or deleted outside the folder they belong to. The recorder removes only the
    `animation-` files it owns in a scene's `outputPath`; anything that deletes must check it owns
    the file first (see `ownsFile` in `packages/onioncut/src/cli/record.mjs`)
  - A path from `onioncut.config.json` or a CLI flag used without being resolved against the project
    root
  - Tokens, keys or personal paths committed into the repository or shipped in the npm package
- When a risk is found, stop the current task, name the problem and suggest the fix.

## Public Repository

The repository and the npm package are public. Everything committed is read by strangers.

- No personal or machine-specific paths (an absolute path into a home folder, a host name) in code,
  comments, docs or examples. Write `~`, a relative path, or a made-up one.
- No names of clients, companies, products or people other than the author's copyright line. Example
  scenes draw made-up content.
- Rules in `CLAUDE.md` and `.claude/` describe onioncut on its own terms. State the rule itself, not
  where it came from.

✅ DO: `outputPath: '~/Movies/onioncut/cards'`

❌ DON'T: an absolute `outputPath` into one person's home folder and a client's project

## Typo Checking

- Check for typos in code, comments and documentation, with extra care for identifiers, CLI flags and
  config keys: a misspelt flag is silently ignored.
- Keep spelling consistent across the codebase. The repository writes British English in prose
  (`colour`, `centre`); identifiers follow the API they talk to (`color` in CSS and Tailwind).

## Critical Code Review

- **MANDATORY**: Be critically observant of every change, and point out errors, inconsistencies and
  likely bugs as soon as you see them. Never assume the developer meant it.
- Mistakes that are easy to make here:
  - A scene's `id` where its key (`<folder>-<scene>`) is expected, or the other way round
  - Milliseconds where seconds are expected: transition durations are milliseconds, a state's `hold`
    is seconds
  - A scene importing from `onioncut/src/…` instead of `'onioncut'`, or a new export added to
    `packages/onioncut/src/api.ts` without deciding it is public API
  - Something the preview gets right and the recorder does not: an animation started in an effect, a
    font not yet loaded, an element that leaves the DOM (all in `CLAUDE.md`)
- When you find one, stop, name it and suggest the correction.

## Code Comments

- Comments are in English and explain **why**: the constraint, the failure it prevents, the thing that
  was tried and did not work. A comment that restates the line below it is noise.
- No `// TODO` comments. Open work goes into a GitHub issue, not into the code.
- Remove temporary notes before committing.

## Dependency Management

- **MANDATORY**: Verify usage whenever `package.json` changes.
- Everything `packages/onioncut/src` or `packages/onioncut/bin` imports at runtime is in that package's
  `dependencies`. A `devDependency` is not installed in the project that uses onioncut, so the tool
  breaks there and works here.
- When removing a dependency, grep for its imports first. When adding one, check it is really used.
- Never add a dependency on your own initiative; propose it and wait, as `CLAUDE.md` says.

## Function Parameters and Types

- **MANDATORY**: Read a function's signature before calling it: the implementation for code in this
  repository, the `.d.ts` for a library.
- Never guess parameters or behaviour. Pay attention to optional vs required fields and to units.

## Package Manager

- **MANDATORY**: `pnpm`, nothing else. Never create `package-lock.json` or `yarn.lock`.
- Run the root scripts from the repository root: `pnpm dev`, `pnpm record`, `pnpm lint`, `pnpm tsc`.
- Scope a command to one package with `--filter` (`pnpm --filter onioncut add …`).

## Before Committing

- `pnpm lint` and `pnpm tsc` pass. The ESLint config is the source of truth for formatting rules; the
  guidelines only explain them.

## Changesets Only From Staged Changes

- A `.changeset/*.md` is written only by `/commit-fast` (or on an explicit request), from what is
  staged. Never while the work is still in progress.
- **Why**: a changeset describes a commit; written ahead of time it goes stale or gets committed with
  unrelated work.
- ✅ DO: finish the change, leave it unstaged, and let `/commit-fast` write the changeset.
- ❌ DON'T: run `pnpm changeset` as part of making a change.
- What a changeset says is in [`changelog.md`](./changelog.md).
