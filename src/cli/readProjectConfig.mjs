import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

export const CONFIG_FILE = 'onioncut.config.json';

// The tool is installed into a project and run from it, so everything it needs to know is read from the
// project rather than compiled in: where the scenes are, and which Tailwind config draws them. Plain
// JSON, because this is read by Node before anything can transpile a thing.
const findUpwards = ({ startDir, fileName }) => {
  let dir = resolve(startDir);

  // Walked upwards, so the tool can be run from a subfolder of the project the same way git can.
  while (true) {
    const candidate = join(dir, fileName);

    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(dir);

    if (parent === dir) {
      return null;
    }

    dir = parent;
  }
};

// Matches the folder patterns a project writes — `animations/*`, `.claude/long-videos/*/animations/*`,
// `**` for any depth. Walked by hand rather than through node:fs globSync, which Node still calls
// experimental and reserves the right to change: this tool is installed into other people's projects,
// and a path matcher that moves under them is not worth the twenty lines it saves.
const walkPattern = ({ dir, segments }) => {
  if (segments.length === 0) {
    return [dir];
  }

  const [segment, ...rest] = segments;

  if (segment === '**') {
    // `**` stands for this folder and every folder under it, so the rest of the pattern is tried at
    // each depth rather than only at the bottom.
    return [walkPattern({ dir, segments: rest }), ...childDirs(dir).flatMap((child) => walkPattern({ dir: child, segments: [segment, ...rest] }))].flat();
  }

  if (!segment.includes('*')) {
    const next = join(dir, segment);
    return existsSync(next) ? walkPattern({ dir: next, segments: rest }) : [];
  }

  const matcher = new RegExp(`^${segment.split('*').map(escapeForRegExp).join('[^/]*')}$`);

  return childDirs(dir)
    .filter((child) => matcher.test(basename(child)))
    .flatMap((child) => walkPattern({ dir: child, segments: rest }));
};

const childDirs = (dir) => {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.git'))
    .map((entry) => join(dir, entry.name));
};

const escapeForRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const asArray = (value) => {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

// A scene is a folder with a sceneDefinitions.ts in it. The patterns name the folders, not the file, so
// a project points at `.claude/long-videos/*/animations/*` and never repeats the file name.
const findSceneDirs = ({ patterns, projectRoot }) => {
  const matched = patterns.flatMap((pattern) => walkPattern({ dir: projectRoot, segments: pattern.split('/').filter(Boolean) }));

  return [...new Set(matched)]
    .map((match) => resolve(projectRoot, match))
    .filter((dir) => existsSync(join(dir, 'sceneDefinitions.ts')))
    .sort((first, second) => first.localeCompare(second));
};

export const readProjectConfig = ({ cwd, configPath }) => {
  const configFile = configPath ? resolve(cwd, configPath) : findUpwards({ startDir: cwd, fileName: CONFIG_FILE });

  if (!configFile) {
    throw new Error(`No ${CONFIG_FILE} found in ${resolve(cwd)} or any folder above it.\nCreate one naming where the scenes are: { "scenes": ["animations/*"] }`);
  }

  const raw = JSON.parse(readFileSync(configFile, 'utf8'));
  const projectRoot = dirname(configFile);
  const patterns = asArray(raw.scenes);

  if (patterns.length === 0) {
    throw new Error(`${configFile} names no scenes. Add { "scenes": ["animations/*"] }`);
  }

  const sceneDirs = findSceneDirs({ patterns, projectRoot });

  if (sceneDirs.length === 0) {
    throw new Error(`No scene folder matched ${patterns.join(', ')} under ${projectRoot}.\nA scene folder is one with a sceneDefinitions.ts in it.`);
  }

  // Left off, the project is drawn in the tool's own preset — which is enough to see a scene move, and
  // wrong for anything that ships, so a project that has a brand names its config here.
  const tailwindConfig = raw.tailwind ? (isAbsolute(raw.tailwind) ? raw.tailwind : resolve(projectRoot, raw.tailwind)) : null;

  if (tailwindConfig && !existsSync(tailwindConfig)) {
    throw new Error(`Tailwind config not found: ${tailwindConfig}`);
  }

  // The fonts the project's scenes are set in, as Google Fonts URLs, and a stylesheet of its own. The
  // tool's index.html carries only its own font: a project that cannot add its own records its type in
  // a fallback face and finds out in the clip.
  // Folders of components the videos share. A scene's own neighbours are scanned anyway, but what two
  // videos in different folders have in common has nowhere to sit without this.
  const sharedDirs = asArray(raw.shared)
    .flatMap((pattern) => walkPattern({ dir: projectRoot, segments: pattern.split('/').filter(Boolean) }))
    .map((dir) => resolve(projectRoot, dir));

  const fonts = asArray(raw.fonts);
  const stylesheet = raw.css ? resolve(projectRoot, raw.css) : null;

  if (stylesheet && !existsSync(stylesheet)) {
    throw new Error(`Stylesheet not found: ${stylesheet}`);
  }

  // The package the tool is run from — the nearest package.json above where it was started. Its
  // node_modules is where the scenes' libraries are installed, and in a monorepo that is not a folder
  // above the scenes at all.
  const packageJson = findUpwards({ startDir: cwd, fileName: 'package.json' });
  const projectPackageDir = packageJson ? dirname(packageJson) : projectRoot;

  return { configFile, projectRoot, projectPackageDir, sceneDirs, sharedDirs, tailwindConfig, fonts, stylesheet };
};
