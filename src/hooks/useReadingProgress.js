import { useState, useCallback, useRef } from 'react';
import { saveReadingProgress, getReadingProgress } from '../utils/storage';

export function useReadingProgress(bookId) {
  const [progress, setProgress] = useState({ cfi: null, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef(null);

  const loadProgress = useCallback(async () => {
    if (!bookId) return;
    const saved = await getReadingProgress(bookId);
    if (saved) {
      setProgress(saved);
    }
    setLoading(false);
  }, [bookId]);

  const updateProgress = useCallback((newProgress) => {
    setProgress(newProgress);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (bookId) {
        saveReadingProgress(bookId, newProgress);
      }
    }, 500);
  }, [bookId]);

  const clearProgress = useCallback(() => {
    setProgress({ cfi: null, percentage: 0 });
  }, []);

  return { progress, updateProgress, loadProgress, clearProgress, loading };
}
