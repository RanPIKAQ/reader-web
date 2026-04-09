import { useCallback, useEffect, useRef, useState } from 'react';
import { getBookAsset, getReadingProgress, saveBookData } from '../../utils/storage';
import {
  BOUNDARY_RESET_DELAY,
  CHAPTER_TRANSITION_GUARD_DELAY,
  buildTxtLineMap,
  createCollapsedVolumeState,
  normalizeTxtStructure,
} from './txtReaderUtils';
import { useTxtReaderInteractions } from './useTxtReaderInteractions';
import { useTxtReaderProgress } from './useTxtReaderProgress';
import { useTxtReaderRestore } from './useTxtReaderRestore';
import { getChapterContent } from '../useBookParser';

export function useTxtReaderEngine({
  active,
  bookId,
  bookMeta,
  settings,
  onProgressUpdate,
  onProgressFlush,
  zenMode,
  onToggleZenMode,
  showToc,
  readerContainerRef,
  setBookMeta,
}) {
  const txtContentRef = useRef(null);
  const currentChapterIndexRef = useRef(0);
  const boundaryScrollStateRef = useRef(null);
  const boundaryResetTimerRef = useRef(null);
  const chapterTransitionTimerRef = useRef(null);
  const isChapterTransitioningRef = useRef(false);
  const fullTextRef = useRef('');
  const flatChaptersRef = useRef([]);
  const chapterLinesRef = useRef([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toc, setToc] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [flatChapters, setFlatChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterLines, setChapterLines] = useState([]);
  const [fullText, setFullText] = useState('');
  const [boundaryScrollState, setBoundaryScrollState] = useState(null);
  const [collapsedVolumes, setCollapsedVolumes] = useState({});

  useEffect(() => {
    fullTextRef.current = fullText;
    flatChaptersRef.current = flatChapters;
    chapterLinesRef.current = chapterLines;
    currentChapterIndexRef.current = currentChapterIndex;
  }, [chapterLines, currentChapterIndex, flatChapters, fullText]);

  const setBoundaryState = useCallback((nextState) => {
    boundaryScrollStateRef.current = nextState;
    setBoundaryScrollState(nextState);
  }, []);

  const clearBoundaryResetTimer = useCallback(() => {
    if (boundaryResetTimerRef.current) {
      clearTimeout(boundaryResetTimerRef.current);
      boundaryResetTimerRef.current = null;
    }
  }, []);

  const clearChapterTransitionTimer = useCallback(() => {
    if (chapterTransitionTimerRef.current) {
      clearTimeout(chapterTransitionTimerRef.current);
      chapterTransitionTimerRef.current = null;
    }
  }, []);

  const resetBoundaryScroll = useCallback(() => {
    clearBoundaryResetTimer();
    setBoundaryState(null);
  }, [clearBoundaryResetTimer, setBoundaryState]);

  const scheduleBoundaryReset = useCallback(() => {
    clearBoundaryResetTimer();
    boundaryResetTimerRef.current = window.setTimeout(() => {
      setBoundaryState(null);
      boundaryResetTimerRef.current = null;
    }, BOUNDARY_RESET_DELAY);
  }, [clearBoundaryResetTimer, setBoundaryState]);

  const startChapterTransitionGuard = useCallback(() => {
    isChapterTransitioningRef.current = true;
    clearChapterTransitionTimer();
    chapterTransitionTimerRef.current = window.setTimeout(() => {
      isChapterTransitioningRef.current = false;
      chapterTransitionTimerRef.current = null;
    }, CHAPTER_TRANSITION_GUARD_DELAY);
  }, [clearChapterTransitionTimer]);

  const toggleVolume = useCallback((volumeId) => {
    setCollapsedVolumes((currentState) => ({
      ...currentState,
      [volumeId]: !currentState[volumeId],
    }));
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedVolumes((currentState) => {
      const nextState = { ...currentState };
      volumes.forEach((volume) => {
        nextState[volume.id] = false;
      });
      return nextState;
    });
  }, [volumes]);

  const collapseAll = useCallback(() => {
    setCollapsedVolumes((currentState) => {
      const nextState = { ...currentState };
      volumes.forEach((volume) => {
        nextState[volume.id] = true;
      });
      return nextState;
    });
  }, [volumes]);

  const {
    captureTxtProgress,
    clearTxtProgressTimer,
    suspendTxtProgressCaptureRef,
  } = useTxtReaderProgress({
    settings,
    txtContentRef,
    fullTextRef,
    flatChaptersRef,
    chapterLinesRef,
    currentChapterIndexRef,
    onProgressUpdate,
    onProgressFlush,
  });

  const {
    loadTxtChapter,
    pendingTxtRestoreRef,
    cancelPendingRestoreFrame,
  } = useTxtReaderRestore({
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
  });

  const prevChapter = useCallback(() => {
    const nextIndex = currentChapterIndexRef.current - 1;
    if (nextIndex >= 0) {
      loadTxtChapter(nextIndex, { persistAfterRestore: true });
    }
  }, [loadTxtChapter]);

  const nextChapter = useCallback(() => {
    const nextIndex = currentChapterIndexRef.current + 1;
    if (nextIndex < flatChaptersRef.current.length) {
      loadTxtChapter(nextIndex, { persistAfterRestore: true });
    }
  }, [loadTxtChapter]);

  useEffect(() => {
    if (!active || !bookMeta) return undefined;

    let isCancelled = false;

    const loadTxtBook = async () => {
      setLoading(true);
      setError('');

      const asset = await getBookAsset(bookId);
      if (isCancelled) return;

      if (!asset || asset.kind !== 'txt' || typeof asset.text !== 'string') {
        const missingMessage = bookMeta.assetMissingMessage || '书籍内容缺失，请重新导入该书籍。';
        setError(missingMessage);
        const nextBookMeta = {
          ...bookMeta,
          assetMissing: true,
          assetMissingMessage: missingMessage,
        };
        await saveBookData(bookMeta.id, nextBookMeta);
        if (isCancelled) return;
        setBookMeta(nextBookMeta);
        setLoading(false);
        return;
      }

      if (bookMeta.assetMissing || bookMeta.assetMissingMessage) {
        const nextBookMeta = {
          ...bookMeta,
          assetMissing: false,
          assetMissingMessage: null,
        };
        await saveBookData(bookMeta.id, nextBookMeta);
        if (!isCancelled) {
          setBookMeta(nextBookMeta);
        }
      }

      const text = asset.text;
      const nextStructure = normalizeTxtStructure(bookMeta, text);
      const initialCollapsed = createCollapsedVolumeState(nextStructure.volumes);

      setFullText(text);
      setFlatChapters(nextStructure.chapters);
      setVolumes(nextStructure.volumes);
      setToc(nextStructure.toc);
      setCollapsedVolumes(initialCollapsed);

      const savedProgress = await getReadingProgress(bookId);
      if (isCancelled) return;

      let startChapterIndex = 0;
      let restoreMode = 'start';
      let savedPosition = null;

      if (savedProgress?.chapterId) {
        const chapterIndex = nextStructure.chapters.findIndex((chapter) => chapter.id === savedProgress.chapterId);
        if (chapterIndex >= 0) {
          startChapterIndex = chapterIndex;
        }
      }

      if (savedProgress?.txtPosition) {
        restoreMode = 'saved';
        savedPosition = savedProgress.txtPosition;
      }

      const chapter = nextStructure.chapters[startChapterIndex];
      if (chapter) {
        pendingTxtRestoreRef.current = {
          mode: restoreMode,
          savedPosition,
          persistAfterRestore: false,
        };
        const content = getChapterContent(text, chapter);
        setChapterLines(buildTxtLineMap(content));
        currentChapterIndexRef.current = startChapterIndex;
        setCurrentChapterIndex(startChapterIndex);
      } else {
        setChapterLines([]);
      }

      setLoading(false);
    };

    void loadTxtBook();

    return () => {
      isCancelled = true;
      cancelPendingRestoreFrame();
      clearTxtProgressTimer();
    };
  }, [
    active,
    bookId,
    bookMeta,
    cancelPendingRestoreFrame,
    clearTxtProgressTimer,
    pendingTxtRestoreRef,
    setBookMeta,
  ]);

  useEffect(() => {
    return () => {
      clearBoundaryResetTimer();
      clearChapterTransitionTimer();
      clearTxtProgressTimer();
      cancelPendingRestoreFrame();
    };
  }, [
    cancelPendingRestoreFrame,
    clearBoundaryResetTimer,
    clearChapterTransitionTimer,
    clearTxtProgressTimer,
  ]);

  useTxtReaderInteractions({
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
  });

  const readerStyle = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    width: `${settings.contentWidth || 100}%`,
    maxWidth: '100%',
    color: settings.customTextColor || 'inherit',
    backgroundColor: 'transparent',
  };

  return {
    type: 'txt',
    loading,
    error,
    toc,
    volumes,
    flatChapters,
    currentChapterIndex,
    chapterLines,
    collapsedVolumes,
    boundaryScrollState,
    contentRef: txtContentRef,
    readerStyle,
    progressLabel: flatChapters[currentChapterIndex]?.title || '',
    canGoPrev: currentChapterIndex > 0,
    canGoNext: currentChapterIndex < flatChapters.length - 1,
    prev: prevChapter,
    next: nextChapter,
    selectTocItem: async (href) => {
      const targetIndex = flatChapters.findIndex((chapter) => chapter.id === href);
      if (targetIndex >= 0) {
        await loadTxtChapter(targetIndex, { persistAfterRestore: true });
      }
    },
    toggleVolume,
    expandAll,
    collapseAll,
  };
}
