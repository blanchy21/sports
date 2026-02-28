import { useState, useEffect } from 'react';

/**
 * Shared countdown tick hook — drives all countdown timers with a single interval.
 * Returns the current epoch-second, updated every second while enabled and tab is visible.
 */
export function useCountdownTick(enabled: boolean): number {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!enabled) return;

    const update = () => setTick(Math.floor(Date.now() / 1000));

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        update();
      }
    }, 1000);

    // Update immediately when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        update();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return tick;
}
