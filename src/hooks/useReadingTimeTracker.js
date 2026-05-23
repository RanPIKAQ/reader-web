import { useEffect, useRef } from 'react';
import { recordReadingMinutes } from '../utils/storage';

const SAMPLE_INTERVAL = 30000;
const MINUTES_PER_SAMPLE = 0.5;

export function useReadingTimeTracker(bookId) {
  const timerRef = useRef(null);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    lastScrollRef.current = Date.now();
    if (!bookId) return undefined;

    const handleScroll = () => {
      lastScrollRef.current = Date.now();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        startTimer();
      }
    };

    const startTimer = () => {
      if (timerRef.current) return;

      timerRef.current = window.setInterval(() => {
        if (document.hidden) return;

        const timeSinceLastScroll = Date.now() - lastScrollRef.current;
        if (timeSinceLastScroll < 60000) {
          void recordReadingMinutes(bookId, MINUTES_PER_SAMPLE);
        }
      }, SAMPLE_INTERVAL);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [bookId]);
}
