import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Tailwind 4 is configured from CSS — `@config` for the project's own JavaScript config, `@source` for
// what to scan. Both take paths, and the paths are only known once the project's config has been read,
// so the entry stylesheet is written rather than checked in. It lives next to the other CSS so that
// `@config` and `@source` resolve from a real file on disk; a virtual module has no folder to resolve
// a relative path against.
export const TAILWIND_ENTRY = 'src/tailwind.entry.css';

const header = `/* Written by the onioncut CLI on every run. Not checked in, not edited by hand. */`;

export const writeTailwindEntry = ({ packageRoot, tailwindConfig, contentGlobs }) => {
  const configPath = tailwindConfig ?? join(packageRoot, 'tailwind.preset.js');

  const lines = [
    header,
    '',
    '@import "tailwindcss";',
    '',
    // The project's palette and type, as a JavaScript or TypeScript config. Tailwind loads it itself,
    // which is what makes a .ts config — and a .js one importing the project's brand from .ts — work
    // without anything being transpiled on the way in.
    `@config ${JSON.stringify(configPath)};`,
    '',
    ...contentGlobs.map((glob) => `@source ${JSON.stringify(glob)};`),
    '',
  ];

  const contents = lines.join('\n');
  const target = join(packageRoot, TAILWIND_ENTRY);

  // Written only when it would change, so a dev server does not reload itself on every start.
  if (readFileIfExists(target) === contents) {
    return target;
  }

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);

  return target;
};

const readFileIfExists = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};
