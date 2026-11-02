import { FC } from 'react';
import { Div } from 'onioncut';
import { SceneCard } from '../types/SceneCard';

export type StageCardProps = {
  card: SceneCard;
};

// What a card looks like; where it is and how blurred it is belongs to the scene. Abstract on purpose —
// this is the shape a real card would have, with your own content in place of the bars.
export const StageCard: FC<StageCardProps> = ({ card }) => {
  return (
    <Div className="size-full overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-12px_rgba(28,26,22,0.35)]">
      <Div className={['h-2 w-full', card.accent]} />

      <Div className="flex flex-col gap-4 p-6">
        <Div className="flex items-center gap-3">
          <Div className={['size-8 shrink-0 rounded-lg', card.accent]} />
          <Div className="text-[22px] font-semibold text-ink-900">{card.label}</Div>
        </Div>

        <Div className="flex flex-col gap-2.5">
          {Array.from({ length: card.lines }, (unused, line) => (
            <Div key={line} className="h-3 rounded-full bg-ink-100" style={{ width: line === card.lines - 1 ? '58%' : '100%' }} />
          ))}
        </Div>
      </Div>
    </Div>
  );
};
