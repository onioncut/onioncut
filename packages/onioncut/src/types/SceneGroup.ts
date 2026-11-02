import { RegisteredScene } from './RegisteredScene';

// One folder under src/scenes: its id, its title shown as the heading in the sidebar, and the scenes it
// declares.
export type SceneGroup = {
  id: string;
  title: string;
  scenes: RegisteredScene[];
};
