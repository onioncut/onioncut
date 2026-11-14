import { FC, useState } from 'react';
import { Div } from './Div';
import { findSceneGroup, sceneGroups, scenes } from '../registry';
import { RegisteredScene } from '../types/RegisteredScene';
import { SceneGroup } from '../types/SceneGroup';
import { SceneLinkArgs } from '../types/SceneLinkArgs';

export type SceneSidebarProps = {
  scene: RegisteredScene;
  isOpen: boolean;
  onToggle: () => void;
};

const shortcuts = [
  { keys: 'drag', does: 'scrub the timeline to any moment' },
  { keys: 'space', does: 'play from there, or freeze where it is' },
  { keys: '←/→', does: 'step between states' },
  { keys: '↓/↑', does: 'jump to the first or last step' },
  { keys: 'R', does: 'hide everything for a screen capture' },
];

const titleClassName = 'mb-1 px-2 text-lg font-semibold leading-tight text-gray-100';

const itemClassName = (isCurrent: boolean) => {
  return ['block w-full rounded-lg px-2 py-1.5 text-left no-underline', isCurrent && 'bg-gray-800', !isCurrent && 'hover:bg-gray-900'].filter(Boolean).join(' ');
};

const itemTitleClassName = (isCurrent: boolean) => {
  return ['text-sm', isCurrent && 'text-gray-100', !isCurrent && 'text-gray-400'].filter(Boolean).join(' ');
};

// A link to one scene, titled after the folder when the folder holds nothing else — the sidebar then
// reads the same as it did before folders could hold several takes.
const sceneLink = ({ scene, title, currentScene }: SceneLinkArgs) => {
  return (
    <a key={scene.key} href={`?scene=${scene.key}`} className={itemClassName(scene.key === currentScene.key)}>
      <Div className={itemTitleClassName(scene.key === currentScene.key)}>{title}</Div>
      <Div className="text-xs tabular-nums text-gray-600">{scene.states.length} steps</Div>
    </a>
  );
};

// Only a folder with several takes opens as a group; a folder with one scene is that scene.
const hasSeveralScenes = (group: SceneGroup) => {
  return group.scenes.length > 1;
};

// Everything that is about the tool rather than about the scene in front of it: which video is open,
// what the keys do, how long the cut runs. It slides out of the way because a scene is tuned by
// looking at it, and every pixel the sidebar keeps is a pixel the stage does not get.
export const SceneSidebar: FC<SceneSidebarProps> = ({ scene, isOpen, onToggle }) => {
  // The sidebar opens on the folder of the scene in front of it — the takes of one video are what gets
  // compared while tuning — and steps back out to every folder on request. Every move is a link that
  // opens a scene: a folder opens on its first scene, and the way back opens the very first scene, flagged
  // in the address so the sidebar stays on the list of folders even if that scene has siblings. Read once,
  // because the app rewrites the address as the steps change.
  const group = findSceneGroup(scene);
  const [showsAllScenes] = useState(() => new URLSearchParams(window.location.search).get('all') === '1' || !hasSeveralScenes(group));

  return (
    <Div className="relative flex h-full shrink-0 items-start font-sans">
      {/* Collapsing a grid column from 1fr to 0fr slides the sidebar shut without anyone having to know
          how wide it is. */}
      <Div className="grid h-full transition-[grid-template-columns] duration-300 ease-in-out" style={{ gridTemplateColumns: isOpen ? '1fr' : '0fr' }}>
        <Div className="h-full min-w-0 overflow-hidden">
          <Div className="flex h-full w-[240px] flex-col gap-7 border-r border-gray-800">
            {/* The list of scenes is the only part that grows, so it is the part that scrolls; the keys
                stay pinned at the bottom however many videos there are. The padding sits inside each
                block rather than on the column, so the scrollbar runs along the sidebar's edge and not
                over the items. */}
            <Div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 pt-5">
              {!showsAllScenes && (
                <Div className="flex flex-col gap-2">
                  {/* The title is the way back: the chevron in front of it says so, and the whole row is
                      the target, so there is nothing small to aim for. */}
                  <a href={`?scene=${scenes[0].key}&all=1`} title="All scenes" className={[titleClassName, 'group flex items-center gap-2 no-underline'].join(' ')}>
                    <Div className="text-gray-500 transition-colors group-hover:text-gray-200">‹</Div>
                    <Div>{group.title}</Div>
                  </a>

                  {group.scenes.map((availableScene) => sceneLink({ scene: availableScene, title: availableScene.title, currentScene: scene }))}
                </Div>
              )}

              {showsAllScenes && (
                <Div className="flex flex-col gap-2">
                  <Div className={titleClassName}>Scenes</Div>

                  {sceneGroups.map((availableGroup) =>
                    hasSeveralScenes(availableGroup) ? (
                      <a
                        key={availableGroup.id}
                        href={`?scene=${availableGroup.scenes[0].key}`}
                        className={[itemClassName(availableGroup === group), 'flex items-center justify-between gap-2'].join(' ')}
                      >
                        <Div>
                          <Div className={itemTitleClassName(availableGroup === group)}>{availableGroup.title}</Div>
                          <Div className="text-xs tabular-nums text-gray-600">{availableGroup.scenes.length} scenes</Div>
                        </Div>
                        <Div className="text-sm text-gray-500">›</Div>
                      </a>
                    ) : (
                      sceneLink({ scene: availableGroup.scenes[0], title: availableGroup.title, currentScene: scene })
                    ),
                  )}
                </Div>
              )}
            </Div>

            <Div className="flex shrink-0 flex-col gap-2 px-5 pb-5">
              <Div className="px-2 text-[11px] uppercase tracking-wider text-gray-600">Keys</Div>

              {shortcuts.map((shortcut) => (
                <Div key={shortcut.keys} className="flex items-baseline gap-2 px-2 text-xs text-gray-500">
                  <Div className="w-11 shrink-0 font-semibold text-gray-300">{shortcut.keys}</Div>
                  <Div>{shortcut.does}</Div>
                </Div>
              ))}
            </Div>
          </Div>
        </Div>
      </Div>

      {/* Stays put when the sidebar is shut, or there would be no way back. It hangs over the preview's edge
          rather than taking a strip of its own, so the timeline along the bottom runs right up to the sidebar. */}
      <button
        type="button"
        onClick={onToggle}
        title={isOpen ? 'Hide the sidebar' : 'Show the sidebar'}
        className="absolute left-full top-5 z-10 rounded-r-lg border border-l-0 border-gray-800 bg-gray-900 px-1.5 py-4 text-sm leading-none text-gray-500 transition-colors hover:text-gray-200"
      >
        {isOpen ? '‹' : '›'}
      </button>
    </Div>
  );
};
