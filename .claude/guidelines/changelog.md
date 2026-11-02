# Changelog Guidelines

The changelog is `packages/onioncut/CHANGELOG.md`, written by Changesets. Nobody edits it by hand.

- A change to the published package gets a `.changeset/*.md` (written from the staged diff, see
  [`common.md`](./common.md)).
- `pnpm version-packages` turns the changesets into the next version and its `CHANGELOG.md` entry.
- `pnpm release` lints, type-checks, publishes to npm and pushes the tags.

Only `onioncut` is released. `apps/examples` and `apps/site` are private and never get a changeset of
their own; a change there that does not touch `packages/onioncut` needs none.

## One Line, Written for Someone Using onioncut

A changeset is one short English sentence saying what changed for someone who has onioncut installed:
what they can now do, what behaves differently, what they have to change. Name the command, flag,
config key or export by its real name, in backticks.

**Why**: the changelog is read by people deciding whether to upgrade, and by agents upgrading a
project. Neither knows the internal file names.

✅ DO:

```md
---
"onioncut": patch
---

`onioncut record --only=<state>` re-renders one step without touching the others.
```

❌ DON'T:

```md
---
"onioncut": patch
---

Refactored startState in record.mjs and fixed a bug.
```

- No commit hashes, no internal file or function names, no "refactor" or "cleanup" lines. A change with
  nothing visible to a user needs no changeset.
- A breaking change says what breaks and what to write instead, in the same line or one more.
- Several unrelated changes are several changesets, one line each.

## Bump Level Below 1.0

While onioncut is `0.x`:

- `patch` — anything a project picks up without changing a line: fixes, new options, new flags, new
  exports. Most changes.
- `minor` — anything that breaks a project: a removed or renamed export, CLI flag or config key, a
  changed default, a scene that has to be edited to keep working, a different file name for a clip.
- `major` — only the move to `1.0.0`, decided on purpose, never as a side effect of a changeset.

**Why**: `^0.3.0` in a project accepts `0.3.x` and nothing above it, so a compatible change released as
a patch reaches every project on its next install, and a breaking one released as a patch would too.
