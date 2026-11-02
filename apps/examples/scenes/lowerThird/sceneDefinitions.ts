import { defineScenes } from 'onioncut';
import { Scene } from './Scene';
import { states } from './states';

export const sceneDefinitions = defineScenes({
  id: 'lower-third',
  title: 'Lower third',
  scenes: [
    {
      id: 'lower-third',
      title: 'Lower third',
      states,
      Scene,
      render: {
        outputPath: 'output/lower-third',
        variants: { fullCut: true, stepClips: true },
      },
    },
  ],
});
