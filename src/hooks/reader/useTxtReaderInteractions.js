import { useEffect } from 'react';
import {
  CHAPTER_BOUNDARY_THRESHOLD,
} from './txtReaderUtils';

export function useTxtReaderInteractions({
  active,
  zenMode,
  onToggleZenMode,
  showToc,
  readerContainerRef,
  txtContentRef,
  flatChaptersRef,
  currentChapterIndexRef,
  boundaryScrollStateRef,
  isChapterTransitioningRef,
  suspendTxtProgressCaptureRef,
  captureTxtProgress,
  loadTxtChapter,
  prevChapter,
  nextChapter,
  resetBoundaryScroll,
  clearChapterTransitionTimer,
  scheduleBoundaryReset,
  setBoundaryState,
  startChapterTransitionGuard,
  chapterLines,
  currentChapterIndex,
}) {
  useEffect(() => {
    if (!active || zenMode) return undefined;

    const timerId = window.setTimeout(() => {
      resetBoundaryScroll();
      clearChapterTransitionTimer();
      isChapterTransitioningRef.current = false;
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [
    active,
    clearChapterTransitionTimer,
    isChapterTransitioningRef,
    resetBoundaryScroll,
    zenMode,
  ]);

  useEffect(() => {
    const content = txtContentRef.current;
    if (!active || !content) return undefined;

    const handleScroll = () => {
      if (suspendTxtProgressCaptureRef.current) return;
      captureTxtProgress();
    };

    content.addEventListener('scroll', handleScroll, { passive: true });
    return () => content.removeEventListener('scroll', handleScroll);
  }, [
    active,
    captureTxtProgress,
    chapterLines,
    currentChapterIndex,
    suspendTxtProgressCaptureRef,
    txtContentRef,
  ]);

  useEffect(() => {
    if (!active) return undefined;

    const flushCurrentProgress = () => {
      if (suspendTxtProgressCaptureRef.current) return;
      captureTxtProgress({ immediate: true, flush: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushCurrentProgress();
      }
    };

    window.addEventListener('pagehide', flushCurrentProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      flushCurrentProgress();
      window.removeEventListener('pagehide', flushCurrentProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active, captureTxtProgress, suspendTxtProgressCaptureRef]);

  useEffect(() => {
    const container = readerContainerRef.current;
    if (!active || !container || !zenMode) return undefined;

    const handleWheel = (event) => {
      const content = txtContentRef.current;
      if (!content) return;
      event.preventDefault();

      if (isChapterTransitioningRef.current) return;

      const deltaY = event.deltaY;
      if (deltaY === 0) return;

      const maxScrollTop = Math.max(content.scrollHeight - content.clientHeight, 0);
      const atTop = content.scrollTop <= 0;
      const atBottom = content.scrollTop >= maxScrollTop - 1;
      const currentIndex = currentChapterIndexRef.current;

      if (deltaY < 0 && atTop) {
        const targetIndex = currentIndex - 1;
        const targetChapter = flatChaptersRef.current[targetIndex];
        if (!targetChapter) {
          resetBoundaryScroll();
          return;
        }

        const previousState = boundaryScrollStateRef.current;
        const nextValue = Math.min(
          (previousState?.direction === 'prev' && previousState.targetIndex === targetIndex
            ? previousState.value
            : 0) + Math.abs(deltaY),
          CHAPTER_BOUNDARY_THRESHOLD,
        );

        setBoundaryState({
          direction: 'prev',
          value: nextValue,
          targetIndex,
          targetTitle: targetChapter.title,
        });
        scheduleBoundaryReset();

        if (nextValue >= CHAPTER_BOUNDARY_THRESHOLD) {
          startChapterTransitionGuard();
          resetBoundaryScroll();
          loadTxtChapter(targetIndex, {
            restoreMode: 'end',
            persistAfterRestore: true,
          });
        }
        return;
      }

      if (deltaY > 0 && atBottom) {
        const targetIndex = currentIndex + 1;
        const targetChapter = flatChaptersRef.current[targetIndex];
        if (!targetChapter) {
          resetBoundaryScroll();
          return;
        }

        const previousState = boundaryScrollStateRef.current;
        const nextValue = Math.min(
          (previousState?.direction === 'next' && previousState.targetIndex === targetIndex
            ? previousState.value
            : 0) + deltaY,
          CHAPTER_BOUNDARY_THRESHOLD,
        );

        setBoundaryState({
          direction: 'next',
          value: nextValue,
          targetIndex,
          targetTitle: targetChapter.title,
        });
        scheduleBoundaryReset();

        if (nextValue >= CHAPTER_BOUNDARY_THRESHOLD) {
          startChapterTransitionGuard();
          resetBoundaryScroll();
          loadTxtChapter(targetIndex, { persistAfterRestore: true });
        }
        return;
      }

      resetBoundaryScroll();
      content.scrollBy({ top: deltaY });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [
    active,
    boundaryScrollStateRef,
    currentChapterIndexRef,
    flatChaptersRef,
    isChapterTransitioningRef,
    loadTxtChapter,
    readerContainerRef,
    resetBoundaryScroll,
    scheduleBoundaryReset,
    setBoundaryState,
    startChapterTransitionGuard,
    txtContentRef,
    zenMode,
  ]);

  useEffect(() => {
    if (!active) return undefined;

    const handleKeyDown = (event) => {
      if (showToc) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevChapter();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextChapter();
      } else if (event.key === 'Escape' && zenMode) {
        onToggleZenMode?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, nextChapter, onToggleZenMode, prevChapter, showToc, zenMode]);
}
