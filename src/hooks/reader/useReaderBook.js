import { useEffect, useState } from 'react';
import { getBookData, patchBookRecord } from '../../utils/storage';

export function useReaderBook(bookId) {
  const [bookMeta, setBookMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const loadBookMeta = async () => {
      setLoading(true);
      setError('');
      setBookMeta(null);

      try {
        const nextBookMeta = await getBookData(bookId);
        if (isCancelled) return;

        if (!nextBookMeta) {
          setError('未找到对应书籍。');
          return;
        }

        setBookMeta(nextBookMeta);
        void patchBookRecord(bookId, { lastReadAt: Date.now() }).catch(() => {});
      } catch {
        if (!isCancelled) {
          setError('加载书籍信息失败');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadBookMeta();

    return () => {
      isCancelled = true;
    };
  }, [bookId]);

  return {
    bookMeta,
    setBookMeta,
    loading,
    error,
  };
}
