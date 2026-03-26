import { useRef, useState, useEffect, useCallback } from 'react';

export function useManualCountdown() {
  const [manualCountdown, setManualCountdown] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancelCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setManualCountdown(null);
  }, []);

  const startCountdown = useCallback(
    (
      duration: number,
      onTick?: () => void,
      onDone?: () => void
    ) => {
      cancelCountdown();

      if (duration <= 0) {
        onDone?.();
        return;
      }

      let count = duration;
      setManualCountdown(count);
      onTick?.();

      intervalRef.current = setInterval(() => {
        count--;

        if (count <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setManualCountdown(null);
          onDone?.();
        } else {
          setManualCountdown(count);
          onTick?.();
        }
      }, 1000);
    },
    [cancelCountdown]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    manualCountdown,
    startCountdown,
    cancelCountdown,
  };
}