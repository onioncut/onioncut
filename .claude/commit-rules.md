# Commit rules (onioncut)

Extends the global `commit-fast` skill.

## Format

`[scope] lowercase concrete description`, no trailing period, English, single line.

## Scopes

- `[onioncut]` – `packages/onioncut` as a whole, when no narrower scope fits
- `[cli]` – `packages/onioncut/bin`, `packages/onioncut/src/cli` (config, Vite, `init`, `new`)
- `[recorder]` – `packages/onioncut/src/cli/record.mjs`
- `[preview]` – the app in `packages/onioncut/src/components`, `src/hooks`, `src/main.tsx`
- `[scene]` – what a scene can declare: `packages/onioncut/src/types`, `src/api.ts`, `src/utils`
- `[brand]` – `packages/onioncut/BRAND.md`, `tailwind.preset.*`
- `[examples]` – `apps/examples`
- `[site]` – `apps/site`
- `[docs]` – `README.md`, `INSTRUCTIONS.md`
- `[claude]` – `CLAUDE.md`, `.claude/`
- `[release]` – the commit `pnpm version-packages` makes (version, `CHANGELOG.md`, used-up `.changeset/*.md`), always exactly `[release] version packages`
- `[workspace]`, `[eslint]`, `[typescript]`, `[gitignore]` – tooling
- Several: `[cli,docs]`

## Changesets

`onioncut` in `packages/onioncut` is the one published package, versioned by Changesets (`.changeset/README.md`).

- When the staged change touches the package's code or its public behaviour (not just tests, comments or `README.md`), a `.changeset/*.md` naming `onioncut` must be staged too.
- Missing one: write it yourself (`patch` for anything compatible, `minor` for a breaking change while we are below 1.0; one English line for the changelog, written as `.claude/guidelines/changelog.md` says), stage it together with the change and commit; name it in the report. This is the one file `/commit-fast` stages on its own.
- `apps/` is private and never named in a changeset; a commit that touches only `apps/`, docs or tooling needs none.
- A changeset describes only what is staged (`git diff --cached`), never changes still only in the working tree.
- File name: `YYYY-MM-DD-HHMM_<what>.md` in kebab-case, e.g. `2026-11-02-1542_vertical-stage.md`. No brackets: the shell reads `[…]` as a pattern. Inside, the package keeps its npm name: `'onioncut': patch`.
- Never tag, bump versions or publish from this command. Releases are `pnpm version-packages` and `pnpm release`, run by the user (`/prepare-release` gets them ready).

## Precommit checks

- `pnpm lint`
- `pnpm tsc`

### Nothing private leaks into the public repository

Runs before every commit, whatever is staged. The repository is public on GitHub and the package on npm: whatever is committed is out for good, even when a later commit removes it.

- Go through **the whole** staged diff (`git diff --cached`, every file, every line, new files in full) and the commit message. Open staged images and media and look at them too.
- Look for:
  - **Secrets**: API keys, tokens, passwords, private keys, cookies, connection strings, `.env` files with real values, `npm` or cloud credentials.
  - **Other projects**: names, links, code, paths, packages, component names, brands, colours or data from any other project, client or employer — including the projects onioncut is used in. Example scenes, docs and comments use made-up content only. Naming which project something came from, or that it came from one at all ("taken out of the monorepo", "in another repository"), counts too.
  - **Links** to anything but onioncut's own places (`github.com/onioncut`, the npm package, the website) and the docs of a dependency the code really uses.
  - **Personal and local details**: email addresses, phone numbers, absolute local paths (`/Users/…`, `/home/…`), machine names, hostnames and IP addresses (Tailscale `100.x` included), private workflow folders, real people's names and data. In screenshots and renders also browser tabs, bookmarks, notifications and other windows.
  - **Generated files** that carry local paths: `packages/onioncut/src/tailwind.entry.css` is gitignored and must never be staged.
- When anything is found: **do not commit**. List each finding as `file:line` with what it is and a suggested fix, and wait for the user. A real secret that was ever committed or pushed is rotated, not just deleted.
- When nothing is found, say so in one line and go on.

### Docs stay in line with the commit

Runs before every commit that touches `packages/onioncut`.

- Read `README.md`, `INSTRUCTIONS.md`, `CLAUDE.md` and `packages/onioncut/BRAND.md` against the staged change: a renamed or removed flag, option, config key or export; a new one they do not mention yet; an example that would no longer run; a path that moved.
- **Make the fixes yourself straight away** in the working tree, but do **not** stage them.
- Then stop before committing: list each file you changed with one line on what and why, and ask the user to look them over. If they agree, they stage them and run `/commit-fast` again, so the docs land in **the same commit** as the code.
- When nothing needs changing, say so in one line and commit.
