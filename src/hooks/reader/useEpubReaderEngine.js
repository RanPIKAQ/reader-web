import { useCallback, useEffect, useRef, useState } from 'react';
import { createEpubBookFromBlob, flattenEpubToc } from '../../utils/epub';
import { getBookAsset, getReadingProgress, saveBookData } from '../../utils/storage';

export function useEpubReaderEngine({
  active,
  bookId,
  bookMeta,
  settings,
  onProgressUpdate,
  setBookMeta,
}) {
  const containerRef = useRef(null);
  const renditionRef = useRef(null);
  const epubBookRef = useRef(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toc, setToc] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  const applyStyles = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${settings.fontSize}px`);
      renditionRef.current.themes.fontFamily(settings.fontFamily);
      renditionRef.current.themes.fontWeight(settings.fontWeight);
    }
  }, [settings]);

  useEffect(() => {
    if (!active) return;
    applyStyles();
  }, [active, applyStyles]);

  useEffect(() => {
    if (!active || !bookMeta) return undefined;

    let isCancelled = false;

    const loadEpubBook = async () => {
      setLoading(true);
      setError('');
      setCurrentLocation(null);

      try {
        const asset = await getBookAsset(bookId);
        if (isCancelled) return;

        if (!asset || asset.kind !== 'epub' || !(asset.blob instanceof Blob)) {
          const missingMessage = bookMeta.assetMissingMessage || 'EPUB 源文件缺失，请重新导入该书籍。';
          setError(missingMessage);
          const nextBookMeta = {
            ...bookMeta,
            assetMissing: true,
            assetMissingMessage: missingMessage,
          };
          await saveBookData(bookMeta.id, nextBookMeta);
          if (isCancelled) return;
          setBookMeta(nextBookMeta);
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

        const book = await createEpubBookFromBlob(asset.blob);
        epubBookRef.current = book;
        if (isCancelled) return;

        const navigation = await book.loaded.navigation;
        if (isCancelled) return;

        const nextToc = Array.isArray(bookMeta.toc) && bookMeta.toc.length > 0
          ? bookMeta.toc
          : flattenEpubToc(navigation?.toc || []);
        setToc(nextToc);

        if (bookMeta.locationMap) {
          book.locations.load(bookMeta.locationMap);
        } else {
          await book.locations.generate(1600);
          if (isCancelled) return;

          const nextLocationMap = book.locations.save();
          const nextBookMeta = {
            ...bookMeta,
            toc: nextToc,
            locationMap: nextLocationMap,
            assetMissing: false,
            assetMissingMessage: null,
          };
          await saveBookData(bookMeta.id, nextBookMeta);
          if (isCancelled) return;
          setBookMeta(nextBookMeta);
        }

        const savedProgress = await getReadingProgress(bookId);
        if (isCancelled || !containerRef.current) return;

        renditionRef.current = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
        });

        applyStyles();
        await renditionRef.current.display();
        if (isCancelled) return;

        if (savedProgress?.cfi) {
          await renditionRef.current.display(savedProgress.cfi);
          if (isCancelled) return;
        }

        renditionRef.current.on('relocated', (location) => {
          const percentage = book.locations.total > 0
            ? book.locations.percentageFromCfi(location.start.cfi)
            : 0;

          setCurrentLocation({
            cfi: location.start.cfi,
            percentage,
          });
          onProgressUpdateRef.current?.({
            cfi: location.start.cfi,
            percentage,
          });
        });
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || '加载失败，请重试。');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadEpubBook();

    return () => {
      isCancelled = true;
      if (renditionRef.current) {
        renditionRef.current.destroy();
        renditionRef.current = null;
      }
      if (epubBookRef.current) {
        epubBookRef.current.destroy?.();
        epubBookRef.current = null;
      }
    };
  }, [active, applyStyles, bookId, bookMeta, setBookMeta]);

  return {
    type: 'epub',
    loading,
    error,
    toc,
    currentLocation,
    contentRef: containerRef,
    progressLabel: currentLocation ? `${Math.round((currentLocation.percentage || 0) * 100)}%` : '',
    prev: () => {
      renditionRef.current?.prev();
    },
    next: () => {
      renditionRef.current?.next();
    },
    canGoPrev: true,
    canGoNext: true,
    selectTocItem: async (href) => {
      if (renditionRef.current) {
        await renditionRef.current.display(href);
      }
    },
  };
}
