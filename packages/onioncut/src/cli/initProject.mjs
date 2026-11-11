import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { CONFIG_FILE } from './readProjectConfig.mjs';

const TOOLS_DIR = 'tools/onioncut';

// Where the videos are kept differs from project to project, and the glob is the one line that would
// otherwise be got wrong. Both are written, so a project that keeps its scenes under tools/ and one
// that keeps them with the video both work without the file being edited.
const configContents = `{
  "scenes": ["${TOOLS_DIR}/scenes/*", "videos/*/animations/*"],
  "shared": ["${TOOLS_DIR}/shared"],
  "tailwind": "${TOOLS_DIR}/tailwind.config.ts",
  "outDir": "output"
}
`;

const tailwindContents = `import preset from 'onioncut/tailwind-preset';

// The brand every scene in this project is drawn in. Spread the project's own palette into
// theme.extend — importing it from a TypeScript module is fine, Tailwind loads this file itself.
//
// No \`content\`: which files are scanned is worked out from the scene folders and from \`shared\`, so
// this file never has to know where anything lives.
export default {
  presets: [preset],
  theme: {
    extend: {},
  },
};
`;

const envContents = `// The ambient types a scene needs — images, AVIF stills, stylesheets, import.meta.env. They are
// Vite's own, reached through the tool, because Vite is its dependency rather than this project's.
/// <reference types="onioncut/client" />
`;

const sharedReadme = `# Shared

Components the videos share — a lower third used in every one of them, a backdrop, a logo. A scene's
own neighbours are scanned anyway; this folder is for what two videos in different folders have in
common.

Imported by the folder's own name, from anywhere: \`import { Watermark } from '#shared/Watermark'\`.

Nothing here is a scene: a scene is a folder with a \`sceneDefinitions.ts\` in it.
`;

// Nothing about installing: init is this package's own command, so by the time it runs the package is
// already in the project. What is left is what the project still has to decide.
const steps = ({ tailwindPath, sharedName, sharedRelative }) => {
  return [
    `Components the videos share go in ${sharedRelative}, imported as "#${sharedName}/<name>".`,
    `Let TypeScript and the editor in on it, in tsconfig.json:`,
    `    "paths": { "#${sharedName}/*": ["${sharedRelative}/*"] }`,
    ``,
    `Renders land in output/ ("outDir" in ${CONFIG_FILE}). Add it to .gitignore.`,
    ``,
    `Add the scripts to package.json:`,
    `    "video:dev": "onioncut dev", "video:record": "onioncut record"`,
    ``,
    `Put the project's palette in ${tailwindPath}, then scaffold a scene`,
    `anywhere the "scenes" globs reach:`,
    `    onioncut new videos/<video>/animations/<scene>`,
  ];
};

const writeIfAbsent = ({ path, contents, written, skipped }) => {
  if (existsSync(path)) {
    skipped.push(path);
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  written.push(path);
};

// Everything a project needs before it has a scene, and nothing it would have to undo: existing files
// are left exactly as they are and reported, because an init that overwrites a brand is an init
// nobody runs twice.
// What the project already decided, so init adds what is missing instead of laying a second copy of
// everything beside it. A project that keeps its Tailwind config at the root gets no second one in
// tools/ — the one it names is the one that counts.
const existingConfig = (projectRoot) => {
  try {
    return JSON.parse(readFileSync(join(projectRoot, CONFIG_FILE), 'utf8'));
  } catch {
    return null;
  }
};

export const initProject = ({ cwd }) => {
  const projectRoot = resolve(cwd);
  const existing = existingConfig(projectRoot);
  const written = [];
  const skipped = [];

  const tailwindPath = existing?.tailwind ? resolve(projectRoot, existing.tailwind) : join(projectRoot, TOOLS_DIR, 'tailwind.config.ts');
  const sharedPath = existing?.shared?.[0] ? resolve(projectRoot, existing.shared[0]) : join(projectRoot, TOOLS_DIR, 'shared');

  writeIfAbsent({ path: join(projectRoot, CONFIG_FILE), contents: configContents, written, skipped });
  writeIfAbsent({ path: tailwindPath, contents: tailwindContents, written, skipped });
  writeIfAbsent({ path: join(sharedPath, 'README.md'), contents: sharedReadme, written, skipped });
  writeIfAbsent({ path: join(projectRoot, TOOLS_DIR, 'env.d.ts'), contents: envContents, written, skipped });

  for (const path of written) {
    console.log(`  written    ${relative(projectRoot, path)}`);
  }

  for (const path of skipped) {
    console.log(`  kept       ${relative(projectRoot, path)}`);
  }

  // Never edited for them: a config is theirs, and a tool that rewrites it is a tool read with one eye
  // on what it changed.
  if (existing && existing.shared === undefined) {
    console.log('');
    console.log(`${CONFIG_FILE} names no "shared" folders. Add: "shared": ["${relative(projectRoot, sharedPath)}"]`);
  }

  console.log('');

  for (const line of steps({ tailwindPath: relative(projectRoot, tailwindPath), sharedName: basename(sharedPath), sharedRelative: relative(projectRoot, sharedPath) })) {
    console.log(line);
  }
};
