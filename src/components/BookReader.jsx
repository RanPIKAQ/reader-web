import { useEffect, useRef, useState, useCallback } from 'react';
import epubjs from 'epubjs';
import { getBookData, getReadingProgress } from '../utils/storage';

function BookReader({ bookId, settings, onProgressUpdate }) {
  const containerRef = useRef(null);
  const txtContentRef = useRef(null);
  const renditionRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showToc, setShowToc] = useState(false);
  const [bookMeta, setBookMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const scrollPrev = useCallback(() => {
    if (txtContentRef.current) {
      txtContentRef.current.scrollTop = 0;
    }
  }, []);

  const scrollNext = useCallback(() => {
    if (txtContentRef.current) {
      txtContentRef.current.scrollTop = txtContentRef.current.scrollHeight;
    }
  }, []);

  const loadBook = useCallback(async () => {
    const bookInfo = await getBookData(bookId);
    if (!bookInfo) {
      setLoading(false);
      return;
    }

    setBookMeta(bookInfo);

    if (bookInfo.type === 'txt') {
      setLoading(false);
      return;
    }

    if (bookInfo.type === 'epub') {
      const arrayBuffer = await bookInfo.file?.arrayBuffer()
        || await fetch(bookInfo.fileUrl).then(r => r.arrayBuffer());

      const book = epubjs(arrayBuffer);
      await book.ready;

      const navigation = await book.loaded.navigation;
      setToc(navigation.toc);

      const savedProgress = await getReadingProgress(bookId);

      renditionRef.current = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
      });

      await renditionRef.current.display();

      if (savedProgress?.cfi) {
        await renditionRef.current.display(savedProgress.cfi);
      }

      renditionRef.current.on('relocated', (location) => {
        const percentage = book.locations.length > 0
          ? book.locations.percentageFromCFI(location.start.cfi)
          : 0;
        setCurrentLocation(location.start);
        onProgressUpdate({ cfi: location.start.cfi, percentage });
      });

      setLoading(false);
    }
  }, [bookId, onProgressUpdate]);

  useEffect(() => {
    loadBook();
    return () => {
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
    };
  }, [loadBook]);

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
  };

  const isTxt = bookMeta?.type === 'txt';

  return (
    <div className={`reader-container ${isTxt ? 'txt-reader' : settings.theme}`}>
      {loading ? (
        <div className="reader-loading">加载中...</div>
      ) : isTxt ? (
        <div ref={txtContentRef} className="txt-content" style={readerStyle}>
          {bookMeta.content}
        </div>
      ) : (
        <div ref={containerRef} className="epub-container" />
      )}

      <div className="reader-footer">
        <button className="footer-btn" onClick={() => !isTxt && setShowToc(true)} disabled={isTxt}>
          目录
        </button>
        <div className="progress-info">
          {isTxt ? bookMeta?.title : (currentLocation && `${currentLocation.index + 1} / ${toc.length}`)}
        </div>
        {isTxt ? (
          <>
            <button className="footer-btn" onClick={scrollPrev}>上一页</button>
            <button className="footer-btn" onClick={scrollNext}>下一页</button>
          </>
        ) : (
          <>
            <button className="footer-btn" onClick={prevPage}>上一页</button>
            <button className="footer-btn" onClick={nextPage}>下一页</button>
          </>
        )}
      </div>

      {showToc && !isTxt && (
        <div className="toc-overlay" onClick={() => setShowToc(false)}>
          <div className="toc-panel" onClick={(e) => e.stopPropagation()}>
            <div className="toc-header">
              <h3>目录</h3>
              <button onClick={() => setShowToc(false)}>×</button>
            </div>
            <nav className="toc-list">
              {toc.map((item, index) => (
                <a
                  key={index}
                  className="toc-item"
                  onClick={() => goTo(item.href)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookReader;
