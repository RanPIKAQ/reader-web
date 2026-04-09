import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getChapterContent } from '../useBookParser';
import { buildTxtLineMap, resolveTxtRestoreScrollTop } from './txtReaderUtils';

export function useTxtReaderRestore({
  active,
  settings,
  txtContentRef,
  fullTextRef,
  flatChaptersRef,
  chapterLinesRef,
  currentChapterIndexRef,
  setChapterLines,
  setCurrentChapterIndex,
  chapterLines,
  currentChapterIndex,
  captureTxtProgress,
  clearTxtProgressTimer,
  suspendTxtProgressCaptureRef,
  resetBoundaryScroll,
}) {
  const pendingTxtRestoreRef = useRef(null);
  const restoreFrameRef = useRef(null);

  const cancelPendingRestoreFrame = useCallback(() => {
    if (restoreFrameRef.current) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  }, []);

  const loadTxtChapter = useCallback(async (chapterIndex, options = {}) => {
    const {
      restoreMode = 'start',
      savedPosition = null,
      persistAfterRestore = false,
    } = options;
    const text = fullTextRef.current;
    const chapters = flatChaptersRef.current;

    if (!text || chapters.length === 0) return chapterIndex;
    if (chapterIndex < 0 || chapterIndex >= chapters.length) return chapterIndex;

    const chapter = chapters[chapterIndex];
    if (!chapter) return chapterIndex;

    cancelPendingRestoreFrame();
    clearTxtProgressTimer();
    suspendTxtProgressCaptureRef.current = false;
    resetBoundaryScroll();
    pendingTxtRestoreRef.current = {
      mode: restoreMode,
      savedPosition,
      persistAfterRestore,
    };

    const content = getChapterContent(text, chapter);
    setChapterLines(buildTxtLineMap(content));
    currentChapterIndexRef.current = chapterIndex;
    setCurrentChapterIndex(chapterIndex);

    return chapterIndex;
  }, [
    cancelPendingRestoreFrame,
    clearTxtProgressTimer,
    currentChapterIndexRef,
    flatChaptersRef,
    fullTextRef,
    resetBoundaryScroll,
    setChapterLines,
    setCurrentChapterIndex,
    suspendTxtProgressCaptureRef,
  ]);

  useLayoutEffect(() => {
    if (!active || !txtContentRef.current || !pendingTxtRestoreRef.current) return;

    const content = txtContentRef.current;
    const pendingRestore = pendingTxtRestoreRef.current;
    const lines = chapterLinesRef.current;
    const nextScrollTop = resolveTxtRestoreScrollTop({
      content,
      pendingRestore,
      lines,
      settings,
    });

    suspendTxtProgressCaptureRef.current = true;
    content.scrollTop = nextScrollTop;
    pendingTxtRestoreRef.current = null;
    cancelPendingRestoreFrame();
    restoreFrameRef.current = window.requestAnimationFrame(() => {
      suspendTxtProgressCaptureRef.current = false;
      restoreFrameRef.current = null;

      if (pendingRestore.persistAfterRestore) {
        captureTxtProgress({ immediate: true, flush: true });
      }
    });
  }, [
    active,
    cancelPendingRestoreFrame,
    captureTxtProgress,
    chapterLines,
    chapterLinesRef,
    currentChapterIndex,
    settings,
    suspendTxtProgressCaptureRef,
    txtContentRef,
  ]);

  useEffect(() => () => {
    cancelPendingRestoreFrame();
  }, [cancelPendingRestoreFrame]);

  return {
    loadTxtChapter,
    pendingTxtRestoreRef,
    cancelPendingRestoreFrame,
  };
}
