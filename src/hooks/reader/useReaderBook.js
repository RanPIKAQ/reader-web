import { useEffect, useState } from 'react';
import { getBookData } from '../../utils/storage';

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

      const nextBookMeta = await getBookData(bookId);
      if (isCancelled) return;

      if (!nextBookMeta) {
        setError('未找到对应书籍。');
        setLoading(false);
        return;
      }

      setBookMeta(nextBookMeta);
      setLoading(false);
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
