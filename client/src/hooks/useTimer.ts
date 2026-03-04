import { useState, useEffect, useRef } from 'react';

export interface UseTimerReturn {
  timeLeft: number | null;
  isRunning: boolean;
}

export function useTimer(
  timerSeconds: number | null,
  timerStartedAt: string | null,
): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!timerSeconds || !timerStartedAt) {
      setTimeLeft(null);
      return;
    }

    // Calculate initial time left
    const startedAt = new Date(timerStartedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    const remaining = Math.max(0, timerSeconds - elapsedSeconds);

    setTimeLeft(remaining);

    if (remaining <= 0) {
      return;
    }

    // Update every 100ms for smooth countdown
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerSeconds, timerStartedAt]);

  return {
    timeLeft: timeLeft !== null ? Math.ceil(timeLeft) : null,
    isRunning: timeLeft !== null && timeLeft > 0,
  };
}
