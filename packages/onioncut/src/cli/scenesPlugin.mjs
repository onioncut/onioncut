import { join } from 'node:path';

export const VIRTUAL_SCENES = 'virtual:onioncut-scenes';
const RESOLVED_VIRTUAL_SCENES = `\0${VIRTUAL_SCENES}`;

// The scenes are not in the package — they are in the project the tool was run from, at paths it only
// learns at startup. import.meta.glob cannot be handed a path worked out at runtime, so the list of
// scenes is written as a module instead, with one static import per folder, and the bundler sees
// ordinary imports it can follow.
const moduleSource = (sceneDirs) => {
  const imports = sceneDirs.map((dir, index) => `import { sceneDefinitions as group${index} } from ${JSON.stringify(join(dir, 'sceneDefinitions.ts'))};`);
  const groups = sceneDirs.map((_, index) => `group${index}`);

  return [...imports, '', `export const sceneGroups = [${groups.join(', ')}];`, ''].join('\n');
};

export const scenesPlugin = ({ sceneDirs }) => {
  return {
    name: 'onioncut:scenes',
    resolveId: (id) => (id === VIRTUAL_SCENES ? RESOLVED_VIRTUAL_SCENES : undefined),
    load: (id) => (id === RESOLVED_VIRTUAL_SCENES ? moduleSource(sceneDirs) : undefined),
  };
};
