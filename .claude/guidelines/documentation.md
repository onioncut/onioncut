# Documentation Guidelines

onioncut has no docs site. Its documentation is a handful of Markdown files, each with one job:

- `README.md` — what onioncut is and the short version of using it; the repository's front page on
  GitHub and, copied into the package by its `prepack`, the package's page on npm.
- `INSTRUCTIONS.md` — setting onioncut up in a project, in full.
- `CLAUDE.md` — the rules for working in this repository, and the things that cost time to find out.
- `packages/onioncut/BRAND.md` — how a scene is allowed to look.
- `apps/site/` — the website, which presents what the READMEs say.

## Say It Once, Link to It

Quick description: Each thing is explained in one file. The others link to it.

**Why**: two copies of the same explanation drift apart, and the reader cannot tell which one is
current.

✅ DO: `README.md` shows the shortest install and says "Setting it up in another repository is written
out in [`INSTRUCTIONS.md`](./INSTRUCTIONS.md)".

❌ DON'T: copy the full config reference into the README, the npm README and the site.

`README.md` is also the npm page, where relative links do not resolve, so it links to other files by
their full GitHub URL (`https://github.com/onioncut/onioncut/blob/main/INSTRUCTIONS.md`).

## Pages Describe What the Code Does

Quick description: Docs describe the current behaviour, not a plan, and are updated in the same change
that alters it.

- Every flag, default, config key, port, file name and number in the docs (`--step-hold`, port 5200,
  `animation-<folder>-<scene>.mov`, the 2 s hold) is checked against `packages/onioncut/src` and
  `packages/onioncut/bin` when it is written.
- A change that adds, renames or removes a CLI flag, a config key or an export updates `README.md`,
  `INSTRUCTIONS.md` and `CLAUDE.md` in the same change, and the site where it mentions it.
- Lengths of the example scenes in the README table are what `ffprobe` reports for a fresh render.

✅ DO: rename a CLI flag in `bin/onioncut.mjs` and in every file that mentions it, in one commit.

❌ DON'T: leave the old flag in `INSTRUCTIONS.md` for a later docs pass.

## Written in English, for Strangers

- Every doc is in English.
- Examples use made-up content and paths that exist for anyone (`~/Movies/…`, `animations/*`), never
  a path or a project from one machine (see **Public Repository** in [`common.md`](./common.md)).
- Code blocks are complete enough to copy: a config example is valid JSON (or JSONC, marked as such),
  a command runs as written.

## No Links to Files That Are Not There

Quick description: A doc never points at an image, video or file that does not exist in the
repository. Until it does, describe it in words or leave it out.

When a file is removed or renamed, grep every `*.md` and `apps/site` for its name and fix each link in
the same change.

## Clips Are Never Committed

A doc that shows a render links to it hosted elsewhere or embeds a short, small preview made for the
purpose — never a ProRes file from `output/` (see "Formats" in `CLAUDE.md`).
