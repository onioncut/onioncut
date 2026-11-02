import { FC } from 'react';
import { constants } from './constants';
import { stateIndex } from './states';
import { PartPlacement } from './types/PartPlacement';
import { Div, SceneComponentProps } from 'onioncut';
import { SceneBackdrop } from '../backdrop/SceneBackdrop';

// The scene that shows what `--transparent` is for: a badge over nothing, recorded with its alpha
// channel and laid over footage in the edit. In the preview the backdrop stands in for the footage.
//
// The panel is revealed with a clip-path rather than by animating its width: the text inside keeps its
// own layout, so it never reflows while the panel opens.
const panelPlacement = (stateId: string): PartPlacement => {
  if (stateId === 'empty') {
    return { transform: 'translate3d(0, 0, 0)', opacity: 1, clipPath: 'inset(0 100% 0 0 round 16px)' };
  }

  if (stateId === 'out') {
    return { transform: 'translate3d(0, 0, 0)', opacity: 1, clipPath: 'inset(0 0 0 100% round 16px)' };
  }

  return { transform: 'translate3d(0, 0, 0)', opacity: 1, clipPath: 'inset(0 0 0 0 round 16px)' };
};

const namePlacement = (stateId: string): PartPlacement => {
  const hasArrived = stateIndex(stateId) >= stateIndex('name') && stateId !== 'out';

  return {
    transform: hasArrived ? 'translate3d(0, 0, 0)' : 'translate3d(-28px, 0, 0)',
    opacity: hasArrived ? 1 : 0,
    clipPath: 'none',
  };
};

const rolePlacement = (stateId: string): PartPlacement => {
  const hasArrived = stateIndex(stateId) >= stateIndex('role') && stateId !== 'out';

  return {
    transform: hasArrived ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, -22px, 0) scale(0.96)',
    opacity: hasArrived ? 1 : 0,
    clipPath: 'none',
  };
};

const duration = (stateId: string) => {
  if (stateId === 'out') {
    return constants.LEAVE_DURATION;
  }

  if (stateId === 'role') {
    return constants.ROLE_DURATION;
  }

  return stateId === 'name' ? constants.TEXT_DURATION : constants.WIPE_DURATION;
};

export const Scene: FC<SceneComponentProps> = ({ stateId, isTransparent }) => {
  const transition = {
    transitionProperty: 'transform, opacity, clip-path',
    transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    transitionDuration: `${duration(stateId)}ms`,
  };

  return (
    <Div className="absolute inset-0 overflow-hidden">
      {!isTransparent && <SceneBackdrop />}

      <Div
        className="absolute flex items-center gap-6 overflow-hidden bg-ink-900/95 will-change-transform"
        style={{ left: constants.PANEL.left, top: constants.PANEL.top, width: constants.PANEL.width, height: constants.PANEL.height, ...transition, ...panelPlacement(stateId) }}
      >
        <Div className="h-full w-3 shrink-0 bg-accent-coral" />

        <Div className="min-w-0 will-change-transform" style={{ ...transition, ...namePlacement(stateId) }}>
          <Div className="truncate text-[46px] font-semibold leading-none text-white">Your name here</Div>
        </Div>
      </Div>

      <Div
        className="absolute flex items-center rounded-2xl bg-accent-coral px-7 will-change-transform"
        style={{
          left: constants.PANEL.left,
          top: constants.PANEL.top + constants.PANEL.height + constants.ROLE.gap,
          height: constants.ROLE.height,
          transformOrigin: 'left top',
          ...transition,
          ...rolePlacement(stateId),
        }}
      >
        <Div className="whitespace-nowrap text-[24px] font-semibold uppercase tracking-[0.18em] text-white">What you do</Div>
      </Div>
    </Div>
  );
};
