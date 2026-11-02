---
title: 'Prepare Release'
type: 'command'
---

# Prepare Release

Gets `main` ready for a release: installs, lints, typechecks, proves the recorder still records, writes
the missing changeset, then lists what the user runs next. It never bumps the version, tags, publishes
or pushes; that stays with the user (`.changeset/README.md`).

Run only when the user invokes it.

## 1. Check: on main and clean

Run in the **main checkout** (`git worktree list`, the first row), never in a worktree:

```bash
git rev-parse --abbrev-ref HEAD   # must be main
git rev-parse --git-dir           # must equal git rev-parse --git-common-dir (not a linked worktree)
git status --porcelain            # must print nothing, untracked files included
git fetch origin main && git rev-list --count HEAD..origin/main   # must be 0
```

Any check failing → **abort** in red with the reason (`Not on main.`, `Uncommitted changes: <files>.`,
`main is behind origin/main by <n> commits.`) and change nothing.

## 2. Install, lint, typecheck

```bash
pnpm install
pnpm lint && pnpm tsc
```

A failure aborts with the failing package and its error. Nothing is committed.

## 3. A render still comes out

Record one example into a temporary folder, never into `apps/examples/output/`:

```bash
pnpm record --scene=cards-cards --out=<a temporary folder>
```

Then verify it as `CLAUDE.md` says under **Verifying a render**: the recorder's `new` list, the
durations and size with `ffprobe` (3840 × 2160, `yuv444p12le`), and a frame pulled from the middle of a
transition and looked at. A failure aborts.

## 4. What goes into the package

```bash
cd packages/onioncut && pnpm pack --pack-destination <a temporary folder>
```

List the tarball (`tar -tzf`). It must hold `README.md`, `LICENSE`, `bin/`, `src/` and the presets,
and never `src/tailwind.entry.css`, `.env`, clips or anything under `apps/`. Grep the unpacked files for
absolute local paths (`/Users/`, `/home/`) and anything the leak check in `.claude/commit-rules.md`
names. A finding aborts. Delete the copied `packages/onioncut/README.md` and `LICENSE` afterwards.

## 5. Changesets

Find the last release and what changed in the package since:

```bash
git log -1 --format=%H --grep='^\[release\] version packages'
git diff --name-only <last-release>..HEAD -- packages/onioncut
ls .changeset/*.md
```

- **No release yet and the version in `packages/onioncut/package.json` is not on npm**
  (`npm view onioncut version` fails): the first publish goes out at that version and needs no
  changeset.
- **Changed code or public behaviour without a changeset**: write one by the rules in
  `.claude/commit-rules.md`, from the commits that touched it.
- **Only comments or the README**: no changeset.

Leave new changesets uncommitted; they go into the release commit. Then
`pnpm changeset status --verbose` shows the version going out.

## 6. Report and next steps

One line each: install, lint and typecheck passed, the render verified, the tarball checked, the
changesets written, the version going out. Then, numbered, for the user to run:

1. Review the changesets.
2. `pnpm version-packages`
3. Commit everything as exactly `[release] version packages`.
4. `npm whoami` (`npm login` when it fails).
5. `pnpm release`
6. Check the tag on https://github.com/onioncut/onioncut/tags and the package on https://www.npmjs.com/package/onioncut.
