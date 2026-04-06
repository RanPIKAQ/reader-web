import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import epubjs from 'epubjs';
import { getBookData, getReadingProgress, getTxtContent } from '../utils/storage';
import { getChapterContent } from '../hooks/useBookParser';

const CHAPTER_BOUNDARY_THRESHOLD = 580;
const BOUNDARY_RESET_DELAY = 700;
const CHAPTER_TRANSITION_GUARD_DELAY = 250;
const TXT_PROGRESS_SAMPLE_INTERVAL = 200;
const TXT_ANCHOR_TEXT_LENGTH = 80;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildTxtLineMap(text) {
  const lines = text.split('\n');
  let cursor = 0;

  return lines.map((lineText, lineIndex) => {
    const startOffset = cursor;
    const endOffset = startOffset + lineText.length;

    cursor = endOffset + (lineIndex < lines.length - 1 ? 1 : 0);

    return {
      lineIndex,
      text: lineText,
      startOffset,
      endOffset,
    };
  });
}

function createLayoutFingerprint(settings) {
  return {
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    contentWidth: settings.contentWidth,
  };
}

function hasMatchingLayoutFingerprint(savedFingerprint, currentFingerprint) {
  if (!savedFingerprint) return false;

  return (
    savedFingerprint.fontSize === currentFingerprint.fontSize
    && savedFingerprint.fontFamily === currentFingerprint.fontFamily
    && savedFingerprint.fontWeight === currentFingerprint.fontWeight
    && savedFingerprint.lineHeight === currentFingerprint.lineHeight
    && savedFingerprint.contentWidth === currentFingerprint.contentWidth
  );
}

function findLineElementByOffset(content, targetOffset) {
  const { children } = content;
  if (!children.length) return null;

  let low = 0;
  let high = children.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const element = children[mid];
    const top = element.offsetTop;
    const bottom = top + element.offsetHeight;

    if (targetOffset < top) {
      high = mid - 1;
    } else if (targetOffset > bottom) {
      low = mid + 1;
    } else {
      return element;
    }
  }

  const candidateIndex = clamp(low, 0, children.length - 1);
  return children[candidateIndex];
}

function resolveMatchedLineIndex(lines, savedPosition) {
  if (!lines.length || !savedPosition) return -1;

  const { lineIndex, lineStartOffset, anchorText } = savedPosition;
  const anchor = anchorText || '';
  const indexedLine = Number.isInteger(lineIndex) ? lines[lineIndex] : null;

  if (indexedLine) {
    const matchesOffset = indexedLine.startOffset === lineStartOffset;
    const matchesAnchor = !anchor || indexedLine.text.startsWith(anchor);
    if (matchesOffset && matchesAnchor) {
      return indexedLine.lineIndex;
    }
  }

  if (Number.isInteger(lineStartOffset)) {
    const offsetMatch = lines.find((line) => line.startOffset === lineStartOffset);
    if (offsetMatch) {
      return offsetMatch.lineIndex;
    }
  }

  if (anchor) {
    const anchorMatch = lines.find((line) => line.text.startsWith(anchor));
    if (anchorMatch) {
      return anchorMatch.lineIndex;
    }
  }

  return -1;
}

function BookReader({
  bookId,
  settings,
  onProgressUpdate,
  onProgressFlush,
  zenMode,
  onToggleZenMode,
}) {
  const readerContainerRef = useRef(null);
  const containerRef = useRef(null);
  const txtContentRef = useRef(null);
  const renditionRef = useRef(null);
  const currentChapterIndexRef = useRef(0);
  const boundaryScrollStateRef = useRef(null);
  const boundaryResetTimerRef = useRef(null);
  const chapterTransitionTimerRef = useRef(null);
  const isChapterTransitioningRef = useRef(false);
  const pendingTxtRestoreRef = useRef(null);
  const restoreFrameRef = useRef(null);
  const txtProgressTimerRef = useRef(null);
  const lastTxtProgressSampleAtRef = useRef(0);
  const suspendTxtProgressCaptureRef = useRef(false);

  const [toc, setToc] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showToc, setShowToc] = useState(false);
  const [bookMeta, setBookMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [flatChapters, setFlatChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterLines, setChapterLines] = useState([]);
  const [fullText, setFullText] = useState('');
  const [boundaryScrollState, setBoundaryScrollState] = useState(null);

  const [collapsedVolumes, setCollapsedVolumes] = useState({});

  const fullTextRef = useRef('');
  const flatChaptersRef = useRef([]);
  const chapterLinesRef = useRef([]);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const onProgressFlushRef = useRef(onProgressFlush);
  const isTxt = bookMeta?.type === 'txt';

  useEffect(() => {
    fullTextRef.current = fullText;
    flatChaptersRef.current = flatChapters;
    chapterLinesRef.current = chapterLines;
    onProgressUpdateRef.current = onProgressUpdate;
    onProgressFlushRef.current = onProgressFlush;
    currentChapterIndexRef.current = currentChapterIndex;
  }, [fullText, flatChapters, chapterLines, onProgressUpdate, onProgressFlush, currentChapterIndex]);

  const cancelPendingRestoreFrame = useCallback(() => {
    if (restoreFrameRef.current) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  }, []);

  const clearTxtProgressTimer = useCallback(() => {
    if (txtProgressTimerRef.current) {
      clearTimeout(txtProgressTimerRef.current);
      txtProgressTimerRef.current = null;
    }
  }, []);

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

  const toggleVolume = useCallback((volId) => {
    setCollapsedVolumes(prev => ({
      ...prev,
      [volId]: !prev[volId]
    }));
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedVolumes(prev => {
      const next = { ...prev };
      volumes.forEach(vol => {
        next[vol.id] = false;
      });
      return next;
    });
  }, [volumes]);

  const collapseAll = useCallback(() => {
    setCollapsedVolumes(prev => {
      const next = { ...prev };
      volumes.forEach(vol => {
        next[vol.id] = true;
      });
      return next;
    });
  }, [volumes]);

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
      100
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
  }, [settings]);

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
        TXT_PROGRESS_SAMPLE_INTERVAL - elapsed
      );
    }
  }, [clearTxtProgressTimer, getCurrentTxtProgress]);

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
  }, [cancelPendingRestoreFrame, clearTxtProgressTimer, resetBoundaryScroll]);

  useLayoutEffect(() => {
    if (!isTxt || !txtContentRef.current || !pendingTxtRestoreRef.current) return;

    const content = txtContentRef.current;
    const pendingRestore = pendingTxtRestoreRef.current;
    const lines = chapterLinesRef.current;
    const currentFingerprint = createLayoutFingerprint(settings);
    const maxScrollTop = Math.max(content.scrollHeight - content.clientHeight, 0);
    let nextScrollTop = 0;

    if (pendingRestore.mode === 'end') {
      nextScrollTop = maxScrollTop;
    } else if (pendingRestore.mode === 'saved' && pendingRestore.savedPosition) {
      const { savedPosition } = pendingRestore;

      if (hasMatchingLayoutFingerprint(savedPosition.layoutFingerprint, currentFingerprint)) {
        nextScrollTop = clamp(savedPosition.scrollTop || 0, 0, maxScrollTop);
      } else {
        const matchedLineIndex = resolveMatchedLineIndex(lines, savedPosition);
        const matchedElement = matchedLineIndex >= 0 ? content.children[matchedLineIndex] : null;

        if (matchedElement) {
          const lineHeight = Math.max(matchedElement.offsetHeight, 1);
          const lineOffset = clamp(savedPosition.lineOffsetRatio || 0, 0, 1) * lineHeight;
          nextScrollTop = clamp(
            matchedElement.offsetTop + lineOffset - (content.clientHeight / 2),
            0,
            maxScrollTop
          );
        } else if (Number.isFinite(savedPosition.scrollRatio)) {
          nextScrollTop = clamp(savedPosition.scrollRatio * maxScrollTop, 0, maxScrollTop);
        }
      }
    }

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
  }, [chapterLines, currentChapterIndex, isTxt, settings, captureTxtProgress, cancelPendingRestoreFrame]);

  const prevChapter = useCallback(() => {
    const newIndex = currentChapterIndexRef.current - 1;
    if (newIndex >= 0) {
      loadTxtChapter(newIndex, { persistAfterRestore: true });
    }
  }, [loadTxtChapter]);

  const nextChapter = useCallback(() => {
    const newIndex = currentChapterIndexRef.current + 1;
    if (newIndex < flatChaptersRef.current.length) {
      loadTxtChapter(newIndex, { persistAfterRestore: true });
    }
  }, [loadTxtChapter]);

  useEffect(() => {
    let isCancelled = false;

    const loadCurrentBook = async () => {
      setLoading(true);

      const bookInfo = await getBookData(bookId);
      if (isCancelled) return;

      if (!bookInfo) {
        setLoading(false);
        return;
      }

      setBookMeta(bookInfo);

      if (bookInfo.type === 'txt') {
        const text = await getTxtContent(bookId);
        if (isCancelled) return;

        if (!text) {
          setLoading(false);
          return;
        }

        let chapters = bookInfo.flatChapters || bookInfo.chapters || [];
        let vols = bookInfo.volumes || [];

        if (chapters.length === 0) {
          chapters = [{
            id: 'ch_0',
            title: '全文',
            start: 0,
            end: text.length
          }];
          vols = [{
            id: 'vol_0',
            title: '全文',
            start: 0,
            end: text.length,
            children: chapters
          }];
        } else if (vols.length === 0) {
          vols = [{
            id: 'vol_0',
            title: '正文',
            start: 0,
            end: text.length,
            children: chapters
          }];
        }

        setFullText(text);
        setFlatChapters(chapters);
        setVolumes(vols);
        setToc(chapters.map(ch => ({ label: ch.title, href: ch.id })));

        const initialCollapsed = {};
        vols.forEach(vol => {
          initialCollapsed[vol.id] = true;
        });
        setCollapsedVolumes(initialCollapsed);

        const savedProgress = await getReadingProgress(bookId);
        if (isCancelled) return;

        let startChapterIndex = 0;
        let restoreMode = 'start';
        let savedPosition = null;

        if (savedProgress?.chapterId) {
          const chapterIndex = chapters.findIndex(ch => ch.id === savedProgress.chapterId);
          if (chapterIndex >= 0) {
            startChapterIndex = chapterIndex;
          }
        }

        if (savedProgress?.txtPosition) {
          restoreMode = 'saved';
          savedPosition = savedProgress.txtPosition;
        }

        const chapter = chapters[startChapterIndex];
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
        return;
      }

      if (bookInfo.type === 'epub') {
        const arrayBuffer = await bookInfo.file?.arrayBuffer()
          || await fetch(bookInfo.fileUrl).then(r => r.arrayBuffer());
        if (isCancelled) return;

        const book = epubjs(arrayBuffer);
        await book.ready;
        if (isCancelled) return;

        const navigation = await book.loaded.navigation;
        if (isCancelled) return;
        setToc(navigation.toc);

        const savedProgress = await getReadingProgress(bookId);
        if (isCancelled) return;

        renditionRef.current = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
        });

        await renditionRef.current.display();
        if (isCancelled) return;

        if (savedProgress?.cfi) {
          await renditionRef.current.display(savedProgress.cfi);
          if (isCancelled) return;
        }

        renditionRef.current.on('relocated', (location) => {
          const percentage = book.locations.length > 0
            ? book.locations.percentageFromCFI(location.start.cfi)
            : 0;
          setCurrentLocation(location.start);
          onProgressUpdateRef.current?.({ cfi: location.start.cfi, percentage });
        });

        setLoading(false);
      }
    };

    void loadCurrentBook();

    return () => {
      isCancelled = true;
      cancelPendingRestoreFrame();
      clearTxtProgressTimer();
      if (renditionRef.current) {
        renditionRef.current.destroy();
        renditionRef.current = null;
      }
    };
  }, [bookId, cancelPendingRestoreFrame, clearTxtProgressTimer]);

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

  useEffect(() => {
    if (zenMode && isTxt) return undefined;

    const timerId = window.setTimeout(() => {
      resetBoundaryScroll();
      clearChapterTransitionTimer();
      isChapterTransitioningRef.current = false;
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [zenMode, isTxt, resetBoundaryScroll, clearChapterTransitionTimer]);

  useEffect(() => {
    const content = txtContentRef.current;
    if (!content || !isTxt) return undefined;

    const handleScroll = () => {
      if (suspendTxtProgressCaptureRef.current) return;
      captureTxtProgress();
    };

    content.addEventListener('scroll', handleScroll, { passive: true });
    return () => content.removeEventListener('scroll', handleScroll);
  }, [isTxt, captureTxtProgress, chapterLines, currentChapterIndex]);

  useEffect(() => {
    if (!isTxt) return undefined;

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
  }, [isTxt, captureTxtProgress]);

  useEffect(() => {
    const container = readerContainerRef.current;
    if (!container || !zenMode || !isTxt) return undefined;

    const handleWheel = (e) => {
      const content = txtContentRef.current;
      if (!content) return;
      e.preventDefault();

      if (isChapterTransitioningRef.current) return;

      const deltaY = e.deltaY;
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
          CHAPTER_BOUNDARY_THRESHOLD
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
          CHAPTER_BOUNDARY_THRESHOLD
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
      content.scrollBy({
        top: deltaY,
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [
    zenMode,
    isTxt,
    loadTxtChapter,
    resetBoundaryScroll,
    scheduleBoundaryReset,
    setBoundaryState,
    startChapterTransitionGuard,
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showToc) return;
      if (bookMeta?.type !== 'txt') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevChapter();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextChapter();
      } else if (e.key === 'Escape' && zenMode) {
        onToggleZenMode?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToc, zenMode, bookMeta, prevChapter, nextChapter, onToggleZenMode]);

  const applyStyles = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${settings.fontSize}px`);
      renditionRef.current.themes.fontFamily(settings.fontFamily);
      renditionRef.current.themes.fontWeight(settings.fontWeight);
    }
  }, [settings]);

  useEffect(() => {
    applyStyles();
  }, [applyStyles]);

  const goTo = useCallback(async (href) => {
    if (renditionRef.current) {
      await renditionRef.current.display(href);
      setShowToc(false);
    }
  }, []);

  const prevPage = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, []);

  const nextPage = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, []);

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

  const boundaryScrollPercent = boundaryScrollState
    ? Math.min((boundaryScrollState.value / CHAPTER_BOUNDARY_THRESHOLD) * 100, 100)
    : 0;

  const handleTocClick = useCallback((href) => {
    if (isTxt) {
      const index = flatChapters.findIndex(ch => ch.id === href);
      if (index >= 0) {
        loadTxtChapter(index, { persistAfterRestore: true });
      }
      setShowToc(false);
    } else {
      goTo(href);
    }
  }, [isTxt, flatChapters, loadTxtChapter, goTo]);

  const renderTocList = () => {
    if (isTxt && volumes.length > 0) {
      return (
        <nav className="toc-list">
          <div className="toc-actions">
            <button className="toc-action-btn" onClick={expandAll}>全部展开</button>
            <button className="toc-action-btn" onClick={collapseAll}>全部折叠</button>
          </div>
          {volumes.map((vol) => {
            const isCollapsed = collapsedVolumes[vol.id];
            return (
              <div key={vol.id} className="toc-volume">
                <div
                  className={`toc-volume-title ${isCollapsed ? 'collapsed' : 'expanded'}`}
                  onClick={() => toggleVolume(vol.id)}
                >
                  <span className="toc-arrow">{isCollapsed ? '▶' : '▼'}</span>
                  {vol.title}
                </div>
                {!isCollapsed && (
                  <div className="toc-chapters">
                    {vol.children.map((ch) => (
                      <a
                        key={ch.id}
                        className={`toc-item toc-chapter ${flatChapters[currentChapterIndex]?.id === ch.id ? 'active' : ''}`}
                        onClick={() => handleTocClick(ch.id)}
                      >
                        {ch.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      );
    }

    return (
      <nav className="toc-list">
        {toc.map((item, index) => (
          <a
            key={item.href || index}
            className="toc-item"
            onClick={() => handleTocClick(item.href)}
          >
            {item.label}
          </a>
        ))}
      </nav>
    );
  };

  return (
    <div
      ref={readerContainerRef}
      className={`reader-container ${isTxt ? 'txt-reader' : settings.theme} ${zenMode ? 'zen-mode' : ''}`}
      style={{ backgroundColor: settings.customBgColor || undefined }}
    >
      {loading ? (
        <div className="reader-loading">加载中...</div>
      ) : isTxt ? (
        <div
          ref={txtContentRef}
          className="txt-content"
          style={readerStyle}
        >
          {chapterLines.map((line) => (
            <div
              key={`${currentChapterIndex}-${line.lineIndex}-${line.startOffset}`}
              className="txt-line"
              data-line-index={line.lineIndex}
              data-line-start={line.startOffset}
            >
              {line.text || ' '}
            </div>
          ))}
        </div>
      ) : (
        <div ref={containerRef} className="epub-container" />
      )}

      {zenMode && isTxt && boundaryScrollState && (
        <div
          className={`zen-boundary-indicator zen-boundary-indicator-${boundaryScrollState.direction}`}
          aria-hidden="true"
        >
          <div className="zen-boundary-card">
            <span className="zen-boundary-label">
              {boundaryScrollState.direction === 'next'
                ? '继续下滚进入下一章'
                : '继续上滚进入上一章'}
            </span>
            <span className="zen-boundary-title">{boundaryScrollState.targetTitle}</span>
            <div className="zen-boundary-progress">
              <div
                className="zen-boundary-progress-fill"
                style={{ width: `${boundaryScrollPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {zenMode && (
        <button className="zen-mode-btn" onClick={onToggleZenMode}>
          ☯
        </button>
      )}

      {!zenMode && (
        <div className="reader-footer">
          <button className="footer-btn" onClick={() => setShowToc(true)}>
            目录
          </button>
          <div className="progress-info">
            {isTxt
              ? flatChapters[currentChapterIndex]?.title
              : (currentLocation && `${currentLocation.index + 1} / ${toc.length}`)}
          </div>
          {isTxt ? (
            <>
              <button className="footer-btn" onClick={prevChapter} disabled={currentChapterIndex === 0}>
                上一章
              </button>
              <button className="footer-btn" onClick={nextChapter} disabled={currentChapterIndex >= flatChapters.length - 1}>
                下一章
              </button>
            </>
          ) : (
            <>
              <button className="footer-btn" onClick={prevPage}>上一页</button>
              <button className="footer-btn" onClick={nextPage}>下一页</button>
            </>
          )}
        </div>
      )}

      {showToc && !zenMode && (
        <div className="toc-overlay" onClick={() => setShowToc(false)}>
          <div className="toc-panel" onClick={(e) => e.stopPropagation()}>
            <div className="toc-header">
              <h3>目录</h3>
              <button onClick={() => setShowToc(false)}>×</button>
            </div>
            {renderTocList()}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookReader;
