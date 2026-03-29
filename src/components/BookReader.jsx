import { useEffect, useRef, useState, useCallback } from 'react';
import epubjs from 'epubjs';
import { getBookData, getReadingProgress, getTxtContent } from '../utils/storage';
import { getChapterContent } from '../hooks/useBookParser';

function BookReader({ bookId, settings, onProgressUpdate }) {
  const containerRef = useRef(null);
  const txtContentRef = useRef(null);
  const renditionRef = useRef(null);

  const [toc, setToc] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showToc, setShowToc] = useState(false);
  const [bookMeta, setBookMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // TXT 章节相关状态
  const [flatChapters, setFlatChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterContent, setChapterContent] = useState('');
  const [fullText, setFullText] = useState('');

  // TXT 模式下加载章节内容
  const loadTxtChapter = useCallback(async (chapterIndex) => {
    if (!fullText || flatChapters.length === 0) return;
    if (chapterIndex < 0 || chapterIndex >= flatChapters.length) return;

    const chapter = flatChapters[chapterIndex];
    if (chapter) {
      const content = getChapterContent(fullText, chapter);
      setChapterContent(content);
      setCurrentChapterIndex(chapterIndex);

      // 滚动到章开头
      if (txtContentRef.current) {
        txtContentRef.current.scrollTop = 0;
      }

      // 保存阅读进度
      const progress = {
        chapterId: chapter.id,
        percentage: ((chapterIndex + 1) / flatChapters.length) * 100,
      };
      onProgressUpdate(progress);
    }
  }, [fullText, flatChapters, onProgressUpdate]);

  // 上一页（章节模式）
  const prevChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      loadTxtChapter(currentChapterIndex - 1);
    }
  }, [currentChapterIndex, loadTxtChapter]);

  // 下一页（章节模式）
  const nextChapter = useCallback(() => {
    if (currentChapterIndex < flatChapters.length - 1) {
      loadTxtChapter(currentChapterIndex + 1);
    }
  }, [currentChapterIndex, flatChapters.length, loadTxtChapter]);

  // 加载书籍（只在首次或 bookId 变化时调用）
  const loadBook = useCallback(async () => {
    const bookInfo = await getBookData(bookId);
    if (!bookInfo) {
      setLoading(false);
      return;
    }

    setBookMeta(bookInfo);

    if (bookInfo.type === 'txt') {
      // 加载完整文本和章节信息
      const text = await getTxtContent(bookId);
      if (text) {
        const chapters = bookInfo.flatChapters || [];
        const vols = bookInfo.volumes || [];

        setFullText(text);
        setFlatChapters(chapters);
        setVolumes(vols);
        setToc(chapters.map(ch => ({ label: ch.title, href: ch.id })));

        // 恢复阅读进度
        const savedProgress = await getReadingProgress(bookId);
        let startChapterIndex = 0;
        if (savedProgress?.chapterId) {
          const chapterIndex = chapters.findIndex(ch => ch.id === savedProgress.chapterId);
          if (chapterIndex >= 0) {
            startChapterIndex = chapterIndex;
          }
        }

        // 加载第一章或上次阅读的章节
        setCurrentChapterIndex(startChapterIndex);
        const chapter = chapters[startChapterIndex];
        if (chapter) {
          const content = getChapterContent(text, chapter);
          setChapterContent(content);
        }
      }
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

  // 只在 bookId 变化时加载书籍
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

  // 点击目录项
  const handleTocClick = useCallback((href) => {
    if (isTxt) {
      const index = flatChapters.findIndex(ch => ch.id === href);
      if (index >= 0) {
        loadTxtChapter(index);
      }
      setShowToc(false);
    } else {
      goTo(href);
    }
  }, [isTxt, flatChapters, loadTxtChapter, goTo]);

  // 渲染层级目录
  const renderTocList = () => {
    if (isTxt && volumes.length > 0) {
      return (
        <nav className="toc-list">
          {volumes.map((vol) => (
            <div key={vol.id} className="toc-volume">
              <div className="toc-volume-title">{vol.title}</div>
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
            </div>
          ))}
        </nav>
      );
    }

    // EPUB 目录
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
    <div className={`reader-container ${isTxt ? 'txt-reader' : settings.theme}`}>
      {loading ? (
        <div className="reader-loading">加载中...</div>
      ) : isTxt ? (
        <div ref={txtContentRef} className="txt-content" style={readerStyle}>
          {chapterContent}
        </div>
      ) : (
        <div ref={containerRef} className="epub-container" />
      )}

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

      {showToc && (
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
