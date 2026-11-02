import { defineScenes } from 'onioncut';
import { Scene } from './Scene';
import { states } from './states';

export const sceneDefinitions = defineScenes({
  id: 'cards',
  title: 'Cards',
  scenes: [
    {
      id: 'cards',
      title: 'Cards',
      states,
      Scene,
      render: {
        outputPath: 'output/cards',
        variants: { fullCut: true, stepClips: true },
      },
    },
  ],
});
