# Changesets

`onioncut` in `packages/onioncut` is the one published package. A change to it comes with a changeset: `pnpm changeset`, pick the bump and write one line for the changelog, commit the file with the change. `apps/` is private and never gets one.

- `patch` – anything compatible: fixes, new options, new flags. Most changes.
- `minor` – a breaking change (we are below 1.0).

Release: `pnpm version-packages` (bumps the version, writes `packages/onioncut/CHANGELOG.md`, commit it as `[release] version packages`), then `pnpm release` (lint, typecheck, publish what is new, tag `onioncut@<version>`, push the tags).
