import { FC } from 'react';
import { StageCard } from './components/StageCard';
import { constants } from './constants';
import { cards } from './data/cards';
import { CardTimingArgs } from './types/CardTimingArgs';
import { CardTransformArgs } from './types/CardTransformArgs';
import { Div, SceneComponentProps } from 'onioncut';
import { SceneBackdrop } from '../backdrop/SceneBackdrop';

// Every card is in the DOM in every state — the markup never changes, only transform, opacity, filter
// and z-index do. That is what lets a plain CSS transition carry the whole scene, and it is what the
// recorder relies on: it catches the transitions a state change creates and steps them frame by frame.
//
// Cards are positioned at their grid slot and moved from there, so the grid state is translate(0, 0) and
// nothing has to be kept in step with a second set of coordinates.
const cardTransform = ({ card, stateId }: CardTransformArgs) => {
  const pileOffset = { x: card.pile.left - card.grid.left, y: card.pile.top - card.grid.top };
  const isFocused = card.id === constants.FOCUS_CARD_ID;

  if (stateId === 'backdrop') {
    return {
      transform: `translate3d(${pileOffset.x}px, ${pileOffset.y + constants.ENTER_DISTANCE}px, 0) rotate(${card.pile.rotate}deg) scale(0.92)`,
      opacity: 0,
      blur: 0,
      zIndex: Math.round((1 - card.depth) * 100),
    };
  }

  if (stateId === 'pile') {
    return {
      transform: `translate3d(${pileOffset.x}px, ${pileOffset.y}px, 0) rotate(${card.pile.rotate}deg) scale(${1 - card.depth * constants.DEPTH_SCALE})`,
      opacity: 1 - card.depth * constants.DEPTH_FADE,
      blur: card.depth * constants.DEPTH_BLUR,
      zIndex: Math.round((1 - card.depth) * 100),
    };
  }

  if (stateId === 'focus') {
    const centre = { x: card.grid.left + constants.CARD.width / 2, y: card.grid.top + constants.CARD.height / 2 };

    if (isFocused) {
      return {
        transform: `translate3d(${constants.STAGE.width / 2 - centre.x}px, ${constants.STAGE.height / 2 - centre.y}px, 0) rotate(0deg) scale(${constants.FOCUS_SCALE})`,
        opacity: 1,
        blur: 0,
        zIndex: 200,
      };
    }

    // Pushed away from the centre rather than hidden, so the focused card reads as being in front of the
    // others instead of alone on the stage.
    return {
      transform: `translate3d(${(centre.x - constants.STAGE.width / 2) * (constants.FOCUS_SPREAD - 1)}px, ${(centre.y - constants.STAGE.height / 2) * (constants.FOCUS_SPREAD - 1)}px, 0) rotate(0deg) scale(1)`,
      opacity: 0.35,
      blur: constants.FOCUS_BLUR,
      zIndex: 10,
    };
  }

  if (stateId === 'leave') {
    return {
      transform: `translate3d(0, ${constants.ENTER_DISTANCE}px, 0) rotate(0deg) scale(0.94)`,
      opacity: 0,
      blur: 0,
      zIndex: Math.round((1 - card.depth) * 100),
    };
  }

  return { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', opacity: 1, blur: 0, zIndex: isFocused ? 200 : 100 };
};

// The stagger is what makes twelve cards read as a deck being dealt rather than as one block moving. On
// the way out it runs backwards, so the cards that arrived first are the last to go.
const cardTiming = ({ card, stateId }: CardTimingArgs) => {
  if (stateId === 'pile' || stateId === 'backdrop') {
    return { duration: constants.ENTER_DURATION, delay: card.order * constants.ENTER_STAGGER };
  }

  if (stateId === 'grid') {
    return { duration: constants.SETTLE_DURATION, delay: card.order * 18 };
  }

  if (stateId === 'leave') {
    return { duration: constants.LEAVE_DURATION, delay: (cards.length - 1 - card.order) * constants.LEAVE_STAGGER };
  }

  return { duration: constants.FOCUS_DURATION, delay: 0 };
};

export const Scene: FC<SceneComponentProps> = ({ stateId, isTransparent }) => {
  return (
    <Div className="absolute inset-0 overflow-hidden">
      {/* A transparent take keeps nothing behind the cards, so the clip can be laid over footage. */}
      {!isTransparent && <SceneBackdrop />}

      {cards.map((card) => {
        const placement = cardTransform({ card, stateId });
        const timing = cardTiming({ card, stateId });

        return (
          <Div
            key={card.id}
            className="absolute will-change-transform"
            style={{
              left: card.grid.left,
              top: card.grid.top,
              width: constants.CARD.width,
              height: constants.CARD.height,
              zIndex: placement.zIndex,
              transform: placement.transform,
              opacity: placement.opacity,
              transitionProperty: 'transform, opacity',
              transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              transitionDuration: `${timing.duration}ms`,
              transitionDelay: `${timing.delay}ms`,
            }}
          >
            {/* Two layers, and the split matters: the outer element owns position and opacity, this one owns
                the blur and nothing else. Anything animating in the same `filter` makes the browser re-blur
                every card on every frame of that transition, and the whole scene stutters. */}
            <Div
              className="size-full"
              style={{
                filter: `blur(${placement.blur}px)`,
                transitionProperty: 'filter',
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                transitionDuration: `${timing.duration}ms`,
                transitionDelay: `${timing.delay}ms`,
              }}
            >
              <StageCard card={card} />
            </Div>
          </Div>
        );
      })}
    </Div>
  );
};
