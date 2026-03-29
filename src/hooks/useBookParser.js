import { useState, useCallback } from 'react';
import epubjs from 'epubjs';

// 解析 TXT 文件的章节结构
export function parseTxtChapters(text) {
  const chapters = [];

  // 章节标题匹配模式 - 捕获完整的第一行内容
  const chapterPatterns = [
    // 第X章 章节名（捕获完整行）
    /^(第[一二三四五六七八九十百千零〇\d]+章[^\n]*)/gm,
    // Chapter X 章节名
    /^(Chapter\s+\d+[^\n]*)/gim,
    // 第X卷 卷名
    /^(第[一二三四五六七八九十百千零〇\d]+卷[^\n]*)/gm,
  ];

  let matches = [];
  const seenPositions = new Set();

  // 收集所有匹配的章节标题
  for (const pattern of chapterPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (!seenPositions.has(match.index)) {
        seenPositions.add(match.index);
        matches.push({
          index: match.index,
          title: match[1].trim()
        });
      }
    }
  }

  // 按位置排序
  matches.sort((a, b) => a.index - b.index);

  // 如果没有找到任何章节，把整个文本作为一个章节
  if (matches.length === 0) {
    return {
      chapters: [{
        id: 'ch_0',
        title: '全文',
        start: 0,
        end: text.length
      }],
      content: text
    };
  }

  // 构建章节列表
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    chapters.push({
      id: `ch_${i}`,
      title: current.title,
      start: current.index,
      end: next ? next.index : text.length
    });
  }

  return { chapters, content: text };
}

// 获取特定章节的内容
export function getChapterContent(text, chapter) {
  return text.substring(chapter.start, chapter.end);
}

export function useBookParser() {
  const [book, setBook] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [toc, setToc] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parseFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);

    try {
      const fileType = file.name.split('.').pop().toLowerCase();

      if (fileType === 'txt') {
        const text = await file.text();
        const { chapters } = parseTxtChapters(text);

        const bookData = {
          id: `txt_${Date.now()}`,
          title: file.name.replace('.txt', ''),
          author: '未知作者',
          type: 'txt',
          chapters: chapters,
        };

        setBook(bookData);
        setMetadata({
          title: bookData.title,
          author: bookData.author,
        });
        setToc(chapters.map(ch => ({ label: ch.title, href: ch.id })));

        return { ...bookData, content: text };
      }

      if (fileType === 'epub') {
        const arrayBuffer = await file.arrayBuffer();
        const epubBook = epubjs(arrayBuffer);
        const epubMetadata = await epubBook.loaded.metadata;
        const epubToc = await epubBook.loaded.navigation;

        setBook(epubBook);
        setMetadata({
          title: epubMetadata.title || file.name,
          author: epubMetadata.creator || '未知作者',
          cover: epubMetadata.cover,
        });
        setToc(epubToc.toc);

        return { epubBook, metadata: epubMetadata, toc: epubToc.toc };
      }

      setError('不支持的文件格式');
      return null;
    } catch (err) {
      setError(err.message);
      console.error('Parse error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const parseUrl = useCallback(async (url) => {
    setLoading(true);
    setError(null);

    try {
      const epubBook = epubjs(url);
      await epubBook.ready;
      const metadata = await epubBook.loaded.metadata;
      const toc = await epubBook.loaded.navigation;

      setBook(epubBook);
      setMetadata(metadata);
      setToc(toc.toc);

      return { epubBook, metadata, toc: toc.toc };
    } catch (err) {
      setError(err.message);
      console.error('Parse URL error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const destroy = useCallback(() => {
    if (book && typeof book.destroy === 'function') {
      book.destroy();
    }
    setBook(null);
    setMetadata(null);
    setToc([]);
    setCurrentChapter(null);
  }, [book]);

  return {
    book,
    metadata,
    toc,
    currentChapter,
    loading,
    error,
    parseFile,
    parseUrl,
    setCurrentChapter,
    destroy,
  };
}
