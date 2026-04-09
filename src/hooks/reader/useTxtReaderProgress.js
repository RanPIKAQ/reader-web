import { useCallback, useEffect, useRef } from 'react';
import {
  TXT_ANCHOR_TEXT_LENGTH,
  TXT_PROGRESS_SAMPLE_INTERVAL,
  clamp,
  createLayoutFingerprint,
  findLineElementByOffset,
} from './txtReaderUtils';

export function useTxtReaderProgress({
  settings,
  txtContentRef,
  fullTextRef,
  flatChaptersRef,
  chapterLinesRef,
  currentChapterIndexRef,
  onProgressUpdate,
  onProgressFlush,
}) {
  const txtProgressTimerRef = useRef(null);
  const lastTxtProgressSampleAtRef = useRef(0);
  const suspendTxtProgressCaptureRef = useRef(false);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const onProgressFlushRef = useRef(onProgressFlush);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
    onProgressFlushRef.current = onProgressFlush;
  }, [onProgressFlush, onProgressUpdate]);

  const clearTxtProgressTimer = useCallback(() => {
    if (txtProgressTimerRef.current) {
      clearTimeout(txtProgressTimerRef.current);
      txtProgressTimerRef.current = null;
    }
  }, []);

  const getCurrentTxtProgress = useCallback(() => {
    const content = txtContentRef.current;
    const text = fullTextRef.current;
    const chapters = flatChaptersRef.current;
    const chapterIndex = currentChapterIndexRef.current;
    const chapter = chapters[chapterIndex];
    const lines = chapterLinesRef.current;

    if (!content || !text || !chapter || !lines.length) {
      return null;
    }

    const maxScrollTop = Math.max(content.scrollHeight - content.clientHeight, 0);
    const scrollTop = clamp(content.scrollTop, 0, maxScrollTop);
    const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
    const focusOffset = scrollTop + (content.clientHeight / 2);
    const lineElement = findLineElementByOffset(content, focusOffset);
    const lineIndex = lineElement ? Number(lineElement.dataset.lineIndex || 0) : 0;
    const anchorLine = lines[lineIndex] || lines[0];
    const lineTop = lineElement ? lineElement.offsetTop : 0;
    const lineHeight = lineElement ? Math.max(lineElement.offsetHeight, 1) : 1;
    const lineOffsetRatio = lineElement
      ? clamp((focusOffset - lineTop) / lineHeight, 0, 1)
      : 0;
    const chapterLength = Math.max(chapter.end - chapter.start, 1);
    const effectiveScrollRatio = maxScrollTop > 0
      ? scrollRatio
      : (chapterIndex === chapters.length - 1 ? 1 : 0);
    const percentage = clamp(
      ((chapter.start + (chapterLength * effectiveScrollRatio)) / Math.max(text.length, 1)) * 100,
      0,
      100,
    );

    return {
      chapterId: chapter.id,
      percentage,
      txtPosition: {
        scrollTop,
        scrollRatio,
        lineIndex: anchorLine.lineIndex,
        lineStartOffset: anchorLine.startOffset,
        lineOffsetRatio,
        anchorText: anchorLine.text.slice(0, TXT_ANCHOR_TEXT_LENGTH),
        layoutFingerprint: createLayoutFingerprint(settings),
      },
    };
  }, [
    chapterLinesRef,
    currentChapterIndexRef,
    flatChaptersRef,
    fullTextRef,
    settings,
    txtContentRef,
  ]);

  const captureTxtProgress = useCallback((options = {}) => {
    const { immediate = false, flush = false } = options;

    const saveProgress = () => {
      clearTxtProgressTimer();
      lastTxtProgressSampleAtRef.current = Date.now();

      const nextProgress = getCurrentTxtProgress();
      if (!nextProgress) return;

      if (flush) {
        const flushProgress = onProgressFlushRef.current || onProgressUpdateRef.current;
        flushProgress?.(nextProgress);
        return;
      }

      onProgressUpdateRef.current?.(nextProgress);
    };

    if (immediate) {
      saveProgress();
      return;
    }

    const elapsed = Date.now() - lastTxtProgressSampleAtRef.current;
    if (elapsed >= TXT_PROGRESS_SAMPLE_INTERVAL) {
      saveProgress();
      return;
    }

    if (!txtProgressTimerRef.current) {
      txtProgressTimerRef.current = window.setTimeout(
        saveProgress,
        TXT_PROGRESS_SAMPLE_INTERVAL - elapsed,
      );
    }
  }, [clearTxtProgressTimer, getCurrentTxtProgress]);

  useEffect(() => () => {
    clearTxtProgressTimer();
  }, [clearTxtProgressTimer]);

  return {
    captureTxtProgress,
    clearTxtProgressTimer,
    suspendTxtProgressCaptureRef,
  };
}
