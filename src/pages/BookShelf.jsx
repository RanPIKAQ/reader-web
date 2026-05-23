import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './BookShelf.css';
import {
  removeBook,
  clearAllData,
  exportAllData,
  getBookshelfEntries,
  importAllData,
} from '../utils/storage';

function BookShelf() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const loadBooks = async () => {
    setError('');
    const nextBooks = await getBookshelfEntries();
    setBooks(nextBooks);
    setLoading(false);
  };

  useEffect(() => {
    const initializeBookshelf = async () => {
      await loadBooks();
    };

    void initializeBookshelf();
  }, []);

  const handleDelete = async (bookId) => {
    if (window.confirm('确定要删除这本书吗？')) {
      await removeBook(bookId);
      await loadBooks();
      setNotice('书籍已删除');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      await clearAllData();
      setBooks([]);
      setNotice('数据已清空');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reader-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('备份已导出');
    } catch (err) {
      setError('导出失败: ' + err.message);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.books || !Array.isArray(data.books)) {
        setError('无效的备份文件');
        return;
      }

      if (window.confirm(`将导入 ${data.books.length} 本书籍和设置，是否继续？`)) {
        await importAllData(data);
        await loadBooks();
        setNotice('备份已导入');
      }
    } catch (err) {
      setError('导入失败: ' + err.message);
    }

    e.target.value = '';
  };

  return (
    <div className="bookshelf">
      <header className="shelf-header">
        <h1>我的书架</h1>
        <div className="header-actions">
          <Link to="/import" className="btn-import-book">导入书籍</Link>
          <button className="btn-export" onClick={handleExport}>导出配置</button>
          <button className="btn-import" onClick={handleImport}>导入配置</button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        hidden
      />

      {notice && <div className="status-banner status-banner-success">{notice}</div>}
      {error && <div className="status-banner status-banner-error">{error}</div>}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : books.length === 0 ? (
        <div className="empty-shelf">
          <p>书架空空如也</p>
          <Link to="/import" className="btn-primary">导入第一本书</Link>
        </div>
      ) : (
        <div className="book-grid">
          {books.map((book) => (
            <div key={book.id} className="book-card">
              <div className="book-cover">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} />
                ) : (
                  <div className="book-cover-placeholder">
                    <span>{book.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>
                {book.assetMissing && (
                  <p className="book-warning">{book.assetMissingMessage}</p>
                )}
                {book.progress?.percentage > 0 && (
                  <div className="book-progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${book.progress.percentage}%` }}
                    />
                    <span className="progress-text">
                      {Math.round(book.progress.percentage)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="book-actions">
                {book.assetMissing ? (
                  <Link to="/import" className="btn-read btn-reimport">
                    重新导入
                  </Link>
                ) : (
                  <Link to={`/read/${book.id}`} className="btn-read">
                    {book.progress?.percentage > 0 ? '继续阅读' : '开始阅读'}
                  </Link>
                )}
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(book.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {books.length > 0 && (
        <div className="shelf-footer">
          <button className="btn-clear-all" onClick={handleClearAll}>
            清除所有数据
          </button>
        </div>
      )}
    </div>
  );
}

export default BookShelf;
