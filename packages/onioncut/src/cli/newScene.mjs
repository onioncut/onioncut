import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

// A scene is four files with fixed names, and writing them by hand is four chances to name one
// differently. The folder is the id: the folder it sits in gives the group, which together make the
// key the preview and the recorder open it by.
const files = ({ sceneId, groupId, outputPath }) => {
  return {
    'constants.ts': `import { constants as toolConstants } from 'onioncut';

// Every value this scene is tuned by — durations, distances, sizes. Nothing is timed anywhere else.
export const constants = {
  ...toolConstants,
  MOVE: '700ms cubic-bezier(0.25, 0.85, 0.35, 1)',
};
`,
    'states.ts': `import { SceneStateDefinition } from 'onioncut';

// The steps, and how long each is held in the full cut.
export const states: SceneStateDefinition[] = [
  { id: 'start', label: 'Start', hold: 1 },
  { id: 'end', label: 'End', hold: 1.5 },
];
`,
    'Scene.tsx': `import { FC } from 'react';
import { Div, SceneComponentProps } from 'onioncut';
import { constants } from './constants';

// Every element stays in the DOM in every state — only transform, opacity, filter and z-index change.
// Something that leaves the DOM cannot animate away.
export const Scene: FC<SceneComponentProps> = ({ stateId }) => {
  return (
    <Div className="absolute inset-0 bg-stage">
      <Div
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-coral"
        style={{ transform: \`translate(-50%, -50%) scale(\${stateId === 'end' ? 2 : 1})\`, transition: \`transform \${constants.MOVE}\` }}
      />
    </Div>
  );
};
`,
    'sceneDefinitions.ts': `import { defineScenes } from 'onioncut';
import { Scene } from './Scene';
import { states } from './states';

export const sceneDefinitions = defineScenes({
  id: '${groupId}',
  title: '${titleOf(groupId)}',
  scenes: [
    {
      id: '${sceneId}',
      title: '${titleOf(sceneId)}',
      states,
      Scene,
      render: {
        // Relative to the root of the project; \`~\` and absolute paths are taken as they are.
        outputPath: '${outputPath}',
        variants: { fullCut: true, stepClips: true },
      },
    },
  ],
});
`,
  };
};

const titleOf = (id) => {
  const words = id.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Folders that only hold scenes and name nothing. The group is what the sidebar puts several takes of
// one video under, and every video having a group called "animations" is no grouping at all.
const CONTAINER_NAMES = ['animations', 'scenes', 'src'];

// The nearest folder above the scene that names something — the video, usually. --group overrides it.
const groupFrom = (dir) => {
  let candidate = resolve(dir, '..');

  while (CONTAINER_NAMES.includes(basename(candidate)) && dirname(candidate) !== candidate) {
    candidate = resolve(candidate, '..');
  }

  return toId(basename(candidate));
};

export const newScene = ({ cwd, scenePath, outputPath, group }) => {
  const projectRoot = resolve(cwd);
  const dir = resolve(projectRoot, scenePath);

  if (existsSync(join(dir, 'sceneDefinitions.ts'))) {
    throw new Error(`${relative(projectRoot, dir)} is already a scene.`);
  }

  const sceneId = toId(basename(dir));
  const groupId = group ? toId(group) : groupFrom(dir);

  mkdirSync(dir, { recursive: true });

  for (const [name, contents] of Object.entries(files({ sceneId, groupId, outputPath: outputPath ?? `${relative(projectRoot, resolve(dir, '..'))}/output` }))) {
    writeFileSync(join(dir, name), contents);
    console.log(`  written    ${relative(projectRoot, join(dir, name))}`);
  }

  console.log('');
  console.log(`Open it with:  pnpm video:dev   →  ?scene=${groupId}-${sceneId}`);
  console.log(`Record it with: pnpm video:record --scene=${groupId}-${sceneId}`);
};

const toId = (name) => {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
