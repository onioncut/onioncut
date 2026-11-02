import { Scene } from './Scene';
import { states } from './states';
import { defineScenes } from 'onioncut';

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
