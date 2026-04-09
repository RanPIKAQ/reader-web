import { useState, useCallback } from 'react';
import { buildEpubBookRecord, buildTxtBookRecord } from '../utils/book';
import { parseEpubAsset } from '../utils/epub';

// 判断标题是卷还是章
function getTitleType(title) {
  if (/第[一二三四五六七八九十百千零〇\d]+卷/.test(title)) {
    return 'volume';
  }
  if (/第[一二三四五六七八九十百千零〇\d]+章|Chapter\s+\d+/i.test(title)) {
    return 'chapter';
  }
  return 'chapter';
}

// 解析 TXT 文件的章节结构
export function parseTxtChapters(text) {
  const matches = [];

  // 章节标题匹配模式 - 捕获完整的第一行内容
  const chapterPatterns = [
    // 第X章 章节名（捕获完整行）
    /^(第[一二三四五六七八九十百千零〇\d]+章[^\n]*)/gm,
    // Chapter X 章节名
    /^(Chapter\s+\d+[^\n]*)/gim,
    // 第X卷 卷名
    /^(第[一二三四五六七八九十百千零〇\d]+卷[^\n]*)/gm,
  ];

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
          title: match[1].trim(),
          type: getTitleType(match[1])
        });
      }
    }
  }

  // 按位置排序
  matches.sort((a, b) => a.index - b.index);

  // 如果没有找到任何章节，把整个文本作为一个章节
  if (matches.length === 0) {
    return {
      volumes: [{
        id: 'vol_0',
        title: '全文',
        type: 'volume',
        start: 0,
        end: text.length,
        children: [{
          id: 'ch_0',
          title: '全文',
          start: 0,
          end: text.length
        }]
      }],
      flatChapters: [{
        id: 'ch_0',
        title: '全文',
        start: 0,
        end: text.length
      }],
      content: text
    };
  }

  // 构建层级结构
  const volumes = [];
  let currentVolume = null;
  const flatChapters = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    if (current.type === 'volume') {
      // 创建新卷
      currentVolume = {
        id: `vol_${volumes.length}`,
        title: current.title,
        type: 'volume',
        start: current.index,
        end: next ? next.index : text.length,
        children: []
      };
      volumes.push(currentVolume);
    } else {
      // 这是章节
      const chapter = {
        id: `ch_${flatChapters.length}`,
        title: current.title,
        start: current.index,
        end: next ? next.index : text.length
      };
      flatChapters.push(chapter);

      // 将章节添加到当前卷
      if (currentVolume) {
        currentVolume.end = next ? next.index : text.length;
        currentVolume.children.push(chapter);
      } else {
        // 没有卷的章节，创建一个默认卷
        currentVolume = {
          id: `vol_${volumes.length}`,
          title: '正文',
          type: 'volume',
          start: 0,
          end: next ? next.index : text.length,
          children: [chapter]
        };
        volumes.push(currentVolume);
      }
    }
  }

  return { volumes, flatChapters, content: text };
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
        const { volumes, flatChapters } = parseTxtChapters(text);

        const bookData = buildTxtBookRecord({
          title: file.name.replace('.txt', ''),
          author: '未知作者',
          fileName: file.name,
          addedAt: Date.now(),
          volumes,
          flatChapters,
        });

        setBook(bookData);
        setMetadata({
          title: bookData.title,
          author: bookData.author,
        });

        // TOC 使用 flatChapters 用于目录导航
        setToc(flatChapters.map(ch => ({ label: ch.title, href: ch.id })));

        return {
          book: bookData,
          asset: {
            kind: 'txt',
            text,
          },
          navigation: {
            toc: bookData.toc,
            volumes,
            flatChapters,
          },
        };
      }

      if (fileType === 'epub') {
        const epubData = await parseEpubAsset(file, file.name.replace(/\.epub$/i, ''));
        const bookData = buildEpubBookRecord({
          title: epubData.title || file.name,
          author: epubData.author || '未知作者',
          fileName: file.name,
          addedAt: Date.now(),
          cover: epubData.cover,
          toc: epubData.toc,
        });

        setBook(bookData);
        setMetadata({
          title: bookData.title,
          author: bookData.author,
          cover: bookData.cover,
        });
        setToc(bookData.toc);

        return {
          book: bookData,
          asset: {
            kind: 'epub',
            blob: file,
            mimeType: file.type || 'application/epub+zip',
          },
          navigation: {
            toc: bookData.toc,
          },
        };
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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('书籍地址加载失败');
      }

      const blob = await response.blob();
      const epubData = await parseEpubAsset(blob, '远程 EPUB');
      const bookData = buildEpubBookRecord({
        title: epubData.title,
        author: epubData.author,
        fileName: url.split('/').pop() || 'remote.epub',
        addedAt: Date.now(),
        cover: epubData.cover,
        toc: epubData.toc,
      });

      setBook(bookData);
      setMetadata({
        title: bookData.title,
        author: bookData.author,
        cover: bookData.cover,
      });
      setToc(bookData.toc);

      return {
        book: bookData,
        asset: {
          kind: 'epub',
          blob,
          mimeType: blob.type || 'application/epub+zip',
        },
        navigation: {
          toc: bookData.toc,
        },
      };
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
