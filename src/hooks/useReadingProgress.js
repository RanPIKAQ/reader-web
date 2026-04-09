import { useState, useCallback, useRef, useEffect } from 'react';
import { saveReadingProgress, getReadingProgress } from '../utils/storage';

export function useReadingProgress(bookId) {
  const [progress, setProgress] = useState({ cfi: null, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef(null);
  const latestProgressRef = useRef({ cfi: null, percentage: 0 });

  const loadProgress = useCallback(async () => {
    if (!bookId) return;
    const saved = await getReadingProgress(bookId);
    if (saved) {
      setProgress(saved);
      latestProgressRef.current = saved;
    }
    setLoading(false);
  }, [bookId]);

  const updateProgress = useCallback((newProgress) => {
    latestProgressRef.current = newProgress;
    setProgress(newProgress);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (bookId) {
        void saveReadingProgress(bookId, latestProgressRef.current);
      }
      saveTimeoutRef.current = null;
    }, 500);
  }, [bookId]);

  const flushProgress = useCallback(async (nextProgress) => {
    const progressToSave = nextProgress || latestProgressRef.current;
    if (!bookId || !progressToSave) return;

    latestProgressRef.current = progressToSave;
    setProgress(progressToSave);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    await saveReadingProgress(bookId, progressToSave);
  }, [bookId]);

  const clearProgress = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setProgress({ cfi: null, percentage: 0 });
    latestProgressRef.current = { cfi: null, percentage: 0 };
  }, []);

  useEffect(() => () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  return { progress, updateProgress, flushProgress, loadProgress, clearProgress, loading };
}
