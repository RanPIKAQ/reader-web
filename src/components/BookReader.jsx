import { useCallback, useRef, useState } from 'react';
import ReaderContent from './reader/ReaderContent';
import ReaderFooter from './reader/ReaderFooter';
import ReaderStatus from './reader/ReaderStatus';
import ReaderTocPanel from './reader/ReaderTocPanel';
import ZenBoundaryIndicator from './reader/ZenBoundaryIndicator';
import { useReaderBook } from '../hooks/reader/useReaderBook';
import { useTxtReaderEngine } from '../hooks/reader/useTxtReaderEngine';
import { useEpubReaderEngine } from '../hooks/reader/useEpubReaderEngine';

function BookReader({
  bookId,
  settings,
  onProgressUpdate,
  onProgressFlush,
  zenMode,
  onToggleZenMode,
}) {
  const [showToc, setShowToc] = useState(false);
  const readerContainerRef = useRef(null);
  const { bookMeta, setBookMeta, loading: bookLoading, error: bookError } = useReaderBook(bookId);
  const resolvedBookMeta = bookMeta?.id === bookId ? bookMeta : null;

  const isTxt = resolvedBookMeta?.type === 'txt';
  const isEpub = resolvedBookMeta?.type === 'epub';

  const txtEngine = useTxtReaderEngine({
    active: isTxt,
    bookId,
    bookMeta: resolvedBookMeta,
    settings,
    onProgressUpdate,
    onProgressFlush,
    zenMode,
    onToggleZenMode,
    showToc,
    readerContainerRef,
    setBookMeta,
  });

  const epubEngine = useEpubReaderEngine({
    active: isEpub,
    bookId,
    bookMeta: resolvedBookMeta,
    settings,
    onProgressUpdate,
    setBookMeta,
  });

  const activeEngine = isTxt ? txtEngine : (isEpub ? epubEngine : null);
  const loading = bookLoading || !resolvedBookMeta || activeEngine?.loading;
  const error = bookError || activeEngine?.error || '';
  const shouldRenderContent = Boolean(activeEngine)
    && !error
    && (isEpub || !loading);
  const showStatusOverlay = shouldRenderContent && isEpub && loading;

  const handleOpenToc = useCallback(() => {
    setShowToc(true);
  }, []);

  const handleCloseToc = useCallback(() => {
    setShowToc(false);
  }, []);

  const handleSelectTocItem = useCallback(async (href) => {
    await activeEngine?.selectTocItem?.(href);
    setShowToc(false);
  }, [activeEngine]);

  const renderZenToggle = zenMode && (
    <button type="button" className="zen-mode-btn" onClick={onToggleZenMode}>
      ☯
    </button>
  );

  return (
    <div
      ref={readerContainerRef}
      className={`reader-container theme-${settings.theme} ${isTxt ? 'txt-reader' : ''} ${zenMode ? 'zen-mode' : ''}`}
      style={{ backgroundColor: settings.customBgColor || undefined }}
    >
      {shouldRenderContent && (
        <ReaderContent
          isTxt={isTxt}
          contentRef={activeEngine.contentRef}
          chapterLines={txtEngine.chapterLines}
          currentChapterIndex={txtEngine.currentChapterIndex}
          readerStyle={txtEngine.readerStyle}
          paragraphSpacing={settings.paragraphSpacing}
          paragraphIndent={settings.paragraphIndent}
        />
      )}

      <ReaderStatus loading={loading} error={error} overlay={showStatusOverlay} />

      <ZenBoundaryIndicator
        zenMode={zenMode}
        isTxt={isTxt}
        boundaryScrollState={txtEngine.boundaryScrollState}
      />

      {renderZenToggle}

      {!zenMode && activeEngine && (
        <ReaderFooter
          isTxt={isTxt}
          progressLabel={activeEngine.progressLabel}
          onOpenToc={handleOpenToc}
          onPrev={activeEngine.prev}
          onNext={activeEngine.next}
          canGoPrev={activeEngine.canGoPrev}
          canGoNext={activeEngine.canGoNext}
        />
      )}

      <ReaderTocPanel
        open={showToc && !zenMode}
        isTxt={isTxt}
        toc={activeEngine?.toc || []}
        volumes={txtEngine.volumes}
        collapsedVolumes={txtEngine.collapsedVolumes}
        flatChapters={txtEngine.flatChapters}
        currentChapterIndex={txtEngine.currentChapterIndex}
        onClose={handleCloseToc}
        onSelectItem={handleSelectTocItem}
        onToggleVolume={txtEngine.toggleVolume}
        onExpandAll={txtEngine.expandAll}
        onCollapseAll={txtEngine.collapseAll}
      />
    </div>
  );
}

export default BookReader;
