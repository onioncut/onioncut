import { FC } from 'react';
import { Div } from 'onioncut';

// The paper every scene stands on, drawn rather than photographed: a warm sheet, a sun and two soft
// hills. It is not a scene of its own — no sceneDefinitions.ts — so the registry walks past it.
//
// Replace this with your own artwork when you make the tool yours. A scene that imports an image does
// so from its own assets/ folder (`import hills from './assets/hills.png'`), never as a /path string.
export const SceneBackdrop: FC = () => {
  return (
    <Div className="absolute inset-0 overflow-hidden bg-stage">
      <Div className="absolute left-[1380px] top-[110px] size-[260px] rounded-full bg-accent-amber/25" />
      <Div className="absolute -left-[180px] top-[620px] h-[900px] w-[1500px] rounded-[50%] bg-accent-sage/15" />
      <Div className="absolute left-[900px] top-[700px] h-[900px] w-[1600px] rounded-[50%] bg-accent-sky/10" />
    </Div>
  );
};
