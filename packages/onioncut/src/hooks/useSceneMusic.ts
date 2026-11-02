import { useEffect, useRef } from 'react';
import { SceneStateDefinition } from '../types/SceneStateDefinition';

export type UseSceneMusicArgs = {
  // The scene's steps, each held in the cut for its `hold`
  states: SceneStateDefinition[];
  // The step being shown
  stateIndex: number;
  isPlaying: boolean;
  // How far into the step playback starts, in milliseconds — non-zero when it carries on from a moment
  // the timeline was scrubbed to
  timeInState: number;
};

// The music plays along with playback, from the moment on the cut that is being played — so it is at the
// same place whether the cut is played from its start, from a step in the middle or from a scrubbed
// moment. It is placed only when playback starts or jumps; playing on into the next step leaves it
// running, because a step in the preview lasts a touch longer than its hold and moving the music every
// step would make the browser dip and swell it each time. The fade at the end belongs to the export alone.
export const useSceneMusic = ({ states, stateIndex, isPlaying, timeInState }: UseSceneMusicArgs) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Where playback was on the previous render, to tell playing on from a jump
  const previousRef = useRef({ stateIndex, isPlaying });

  useEffect(() => {
    const audio = audioRef.current;
    const previous = previousRef.current;

    previousRef.current = { stateIndex, isPlaying };

    if (!audio) {
      return;
    }

    if (!isPlaying) {
      audio.pause();

      return;
    }

    const isPlayingOn = previous.isPlaying && stateIndex === previous.stateIndex + 1;

    if (!isPlayingOn || audio.paused) {
      audio.currentTime = states.slice(0, stateIndex).reduce((total, state) => total + state.hold, 0) + timeInState / 1000;
    }

    void audio.play().catch(() => {
      // A browser that will not play before the page has been interacted with simply stays quiet.
    });
    // timeInState is read when playback starts, not followed: it only changes while paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, states, stateIndex]);

  return { audioRef };
};
