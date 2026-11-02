# License Guidelines

onioncut is MIT-licensed. The binding text is `LICENSE` at the repository root.

## Every Place Says the Same License

The license is named in several places, and they always agree:

1. `LICENSE` — the text and the copyright line. Edited here only.
2. `packages/onioncut/LICENSE` — the copy npm ships with the package. The package's `prepack` copies
   it from the root on every pack, and it is gitignored, so it cannot drift and is never edited.
3. `"license"` in the root `package.json` and in `packages/onioncut/package.json` — the SPDX id,
   `MIT`.
4. The License line at the end of `README.md` (npm shows the same file, copied by `prepack`).

✅ DO: change the root `LICENSE` and the `"license"` fields together, and grep for the old value.

❌ DON'T: commit a `LICENSE` or `README.md` into `packages/onioncut`; the copies there are written by
`prepack` and gitignored.

## The License Is Not Re-explained

READMEs and the site say "MIT" and link to `LICENSE`. They never paraphrase what the license allows.

## A Dependency Must Fit the License

A new runtime dependency of `packages/onioncut` has a license compatible with MIT distribution (MIT,
ISC, BSD, Apache-2.0). Check it before proposing the dependency, and say which license it is under in
the proposal.
