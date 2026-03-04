import { useState, useCallback, useEffect } from 'react';
import {
  soundCardSelect,
  soundReveal,
  soundConsensus,
  soundClear,
  soundTimerTick,
  soundTimerEnd,
  soundJoin,
} from '@/lib/sounds';

const SOUND_KEY = 'pointing-poker-sound-enabled';

export function useSounds() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(SOUND_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const play = useCallback(
    (fn: () => void) => {
      if (soundEnabled) {
        try {
          fn();
        } catch {
          // Audio context may not be available
        }
      }
    },
    [soundEnabled],
  );

  return {
    soundEnabled,
    toggleSound,
    playCardSelect: useCallback(() => play(soundCardSelect), [play]),
    playReveal: useCallback(() => play(soundReveal), [play]),
    playConsensus: useCallback(() => play(soundConsensus), [play]),
    playClear: useCallback(() => play(soundClear), [play]),
    playTimerTick: useCallback(() => play(soundTimerTick), [play]),
    playTimerEnd: useCallback(() => play(soundTimerEnd), [play]),
    playJoin: useCallback(() => play(soundJoin), [play]),
  };
}
