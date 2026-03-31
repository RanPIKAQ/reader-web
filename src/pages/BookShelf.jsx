import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllBooks, getReadingProgress, removeBook, clearAllData, exportAllData, importAllData } from '../utils/storage';

function BookShelf() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const allBooks = await getAllBooks();
    const booksWithProgress = await Promise.all(
      allBooks.map(async (book) => {
        const progress = await getReadingProgress(book.id);
        return { ...book, progress };
      })
    );
    setBooks(booksWithProgress);
    setLoading(false);
  };

  const handleDelete = async (bookId) => {
    if (window.confirm('确定要删除这本书吗？')) {
      await removeBook(bookId);
      loadBooks();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      await clearAllData();
      window.location.reload();
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
    } catch (err) {
      alert('导出失败: ' + err.message);
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

      if (!data.version || !data.books) {
        alert('无效的备份文件');
        return;
      }

      if (window.confirm(`将导入 ${data.books.length} 本书籍和设置，是否继续？`)) {
        await importAllData(data);
        window.location.reload();
      }
    } catch (err) {
      alert('导入失败: ' + err.message);
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
                {book.progress && book.progress.percentage > 0 && (
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
                <Link to={`/read/${book.id}`} className="btn-read">
                  {book.progress?.percentage > 0 ? '继续阅读' : '开始阅读'}
                </Link>
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
