import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { filmstripPlugin } from './filmstripPlugin.mjs';
import { scenesPlugin } from './scenesPlugin.mjs';
import { projectHeadPlugin } from './projectHeadPlugin.mjs';
import { projectDepsPlugin } from './projectDepsPlugin.mjs';
import { writeTailwindEntry } from './writeTailwindEntry.mjs';

// The app shell — index.html, the stage, the timeline, the sidebar — is the package, wherever it is
// installed. The scenes are the project's. So Vite is rooted in the package and reaches out to the
// project, rather than the other way around.
export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Which files Tailwind scans is worked out here and never written down by a project: the tool's own
// components, plus every scene folder the project named, the folder those sit in — because what a set
// of scenes shares lives beside them rather than inside one of them — and whatever the project listed
// as `shared`, which is where components used by videos in different folders live. Scanning too little
// silently purges those classes, and the scene still records, just without its background.
const contentGlobs = ({ sceneDirs, sharedDirs, projectRoot }) => {
  const sceneParents = sceneDirs.map((dir) => dirname(dir)).filter((dir) => resolve(dir) !== resolve(projectRoot));
  const projectDirs = [...new Set([...sceneDirs, ...sceneParents, ...sharedDirs])];

  return [join(packageRoot, 'index.html'), join(packageRoot, 'src/**/*.{ts,tsx}'), ...projectDirs.map((dir) => join(dir, '**/*.{ts,tsx}'))];
};

// A scene sits beside the video it belongs to and the shared components sit in one folder for the
// whole project, so every import between them climbs five or six levels — unreadable, and broken the
// moment a scene moves. The folder's own name becomes the alias: tools/onioncut/shared is
// `#shared`, and a second folder beside it is `#<its name>`.
const sharedAliases = (sharedDirs) => {
  return Object.fromEntries(sharedDirs.map((dir) => [`#${basename(dir)}`, dir]));
};

// The package the tool is run from serves its public/ folder at the root, the way a Vite app would:
// a scene writes `/images/logo.png` for a file something else keeps in sync there. Vite's own
// default would look in the tool's package, which has none.
const projectPublicDir = (projectPackageDir) => {
  const dir = join(projectPackageDir, 'public');

  return existsSync(dir) ? dir : false;
};

export const createViteConfig = async ({ config, port, host }) => {
  writeTailwindEntry({ packageRoot, tailwindConfig: config.tailwindConfig, contentGlobs: contentGlobs(config) });

  return {
    configFile: false,
    root: packageRoot,
    publicDir: projectPublicDir(config.projectPackageDir),
    plugins: [
      react(),
      scenesPlugin({ sceneDirs: config.sceneDirs }),
      projectDepsPlugin({ projectPackageDir: config.projectPackageDir }),
      projectHeadPlugin({ packageRoot, fonts: config.fonts, stylesheet: config.stylesheet }),
      filmstripPlugin(),
    ],
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    resolve: {
      // A scene imports from 'onioncut', and it has to land on the copy that is running rather
      // than on whatever node_modules happens to resolve to — one tool, one registry, one set of types.
      alias: { 'onioncut': join(packageRoot, 'src/api.ts'), ...sharedAliases(config.sharedDirs) },
      // The project has its own React — a scene imports it like any other component — and two copies in
      // one page is two sets of hooks and no scene at all.
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port,
      host,
      // The scenes live outside the package, and so can the package the tool is run from, whose
      // node_modules their libraries come out of — the dev server has to be allowed to serve both.
      fs: { allow: [packageRoot, config.projectRoot, config.projectPackageDir] },
    },
    build: {
      outDir: join(packageRoot, 'dist'),
      emptyOutDir: true,
      // Every asset keeps its own file. An image inlined as a data URI is decoded on every frame the
      // recorder photographs, which is the one place that cost shows.
      assetsInlineLimit: 0,
    },
    logLevel: 'info',
  };
};
