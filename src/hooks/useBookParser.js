import { useState, useCallback } from 'react';
import epubjs from 'epubjs';

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
        const bookData = {
          id: `txt_${Date.now()}`,
          title: file.name.replace('.txt', ''),
          author: '未知作者',
          type: 'txt',
          content: text,
        };
        setBook(bookData);
        setMetadata({
          title: bookData.title,
          author: bookData.author,
        });
        setToc([{ label: '全文', href: 'content' }]);
        return bookData;
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
