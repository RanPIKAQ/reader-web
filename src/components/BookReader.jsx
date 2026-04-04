import { useEffect, useRef, useState, useCallback } from 'react';
import epubjs from 'epubjs';
import { getBookData, getReadingProgress, getTxtContent } from '../utils/storage';
import { getChapterContent } from '../hooks/useBookParser';

function BookReader({ bookId, settings, onProgressUpdate, zenMode, onToggleZenMode }) {
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

  // 卷折叠状态
  const [collapsedVolumes, setCollapsedVolumes] = useState({});

  // 使用 ref 存储最新值，避免依赖问题
  const fullTextRef = useRef('');
  const flatChaptersRef = useRef([]);
  const onProgressUpdateRef = useRef(onProgressUpdate);

  // 保持 ref 更新
  useEffect(() => {
    fullTextRef.current = fullText;
    flatChaptersRef.current = flatChapters;
    onProgressUpdateRef.current = onProgressUpdate;
  }, [fullText, flatChapters, onProgressUpdate]);

  // 切换单个卷的折叠状态
  const toggleVolume = useCallback((volId) => {
    setCollapsedVolumes(prev => ({
      ...prev,
      [volId]: !prev[volId]
    }));
  }, []);

  // 全部展开
  const expandAll = useCallback(() => {
    setCollapsedVolumes(prev => {
      const next = { ...prev };
      volumes.forEach(vol => {
        next[vol.id] = false;
      });
      return next;
    });
  }, [volumes]);

  // 全部折叠
  const collapseAll = useCallback(() => {
    setCollapsedVolumes(prev => {
      const next = { ...prev };
      volumes.forEach(vol => {
        next[vol.id] = true;
      });
      return next;
    });
  }, [volumes]);

  // TXT 模式下加载章节内容
  const loadTxtChapter = useCallback(async (chapterIndex) => {
    const text = fullTextRef.current;
    const chapters = flatChaptersRef.current;
    const progressCb = onProgressUpdateRef.current;

    if (!text || chapters.length === 0) return chapterIndex;
    if (chapterIndex < 0 || chapterIndex >= chapters.length) return chapterIndex;

    const chapter = chapters[chapterIndex];
    if (chapter) {
      const content = getChapterContent(text, chapter);
      setChapterContent(content);

      // 滚动到章开头
      if (txtContentRef.current) {
        txtContentRef.current.scrollTop = 0;
      }

      // 保存阅读进度
      const progress = {
        chapterId: chapter.id,
        percentage: ((chapterIndex + 1) / chapters.length) * 100,
      };
      progressCb(progress);
    }
    return chapterIndex;
  }, []);

  // 上一页（章节模式）
  const prevChapter = useCallback(() => {
    const newIndex = currentChapterIndex - 1;
    if (newIndex >= 0) {
      loadTxtChapter(newIndex);
      setCurrentChapterIndex(newIndex);
    }
  }, [currentChapterIndex, loadTxtChapter]);

  // 下一页（章节模式）
  const nextChapter = useCallback(() => {
    const newIndex = currentChapterIndex + 1;
    if (newIndex < flatChaptersRef.current.length) {
      loadTxtChapter(newIndex);
      setCurrentChapterIndex(newIndex);
    }
  }, [currentChapterIndex, loadTxtChapter]);

  // 加载书籍
  const loadBook = useCallback(async () => {
    const bookInfo = await getBookData(bookId);
    if (!bookInfo) {
      setLoading(false);
      return;
    }

    setBookMeta(bookInfo);

    if (bookInfo.type === 'txt') {
      const text = await getTxtContent(bookId);
      if (!text) {
        setLoading(false);
        return;
      }

      // 兼容旧数据：如果没有 flatChapters，尝试从 chapters 转换
      let chapters = bookInfo.flatChapters || bookInfo.chapters || [];
      let vols = bookInfo.volumes || [];

      // 如果既没有 volumes 也没有 flatChapters，创建一个默认卷
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
        // 有章节但没有卷结构，创建一个默认卷
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

      // 初始化折叠状态（默认全部折叠）
      const initialCollapsed = {};
      vols.forEach(vol => {
        initialCollapsed[vol.id] = true;
      });
      setCollapsedVolumes(initialCollapsed);

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
      const chapter = chapters[startChapterIndex];
      if (chapter) {
        const content = getChapterContent(text, chapter);
        setChapterContent(content);
        setCurrentChapterIndex(startChapterIndex);
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

  // 键盘左右键监听
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
      } else if (e.key === 'Escape') {
        if (zenMode) {
          onToggleZenMode?.();
        }
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
    <div
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
          {chapterContent}
        </div>
      ) : (
        <div ref={containerRef} className="epub-container" />
      )}

      {/* 禅模式退出按钮 - 右下角 */}
      {zenMode && (
        <button className="zen-mode-btn" onClick={onToggleZenMode}>
          ☯
        </button>
      )}

      {/* 非禅模式显示底部栏 */}
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
