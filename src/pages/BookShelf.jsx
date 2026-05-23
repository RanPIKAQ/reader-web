import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './BookShelf.css';
import StatsPanel from '../components/StatsPanel';
import {
  removeBook,
  clearAllData,
  exportAllData,
  getBookshelfEntries,
  importAllData,
  patchBookRecord,
} from '../utils/storage';

const SORT_OPTIONS = [
  { value: 'addedAt', label: '最近添加' },
  { value: 'lastReadAt', label: '最近阅读' },
  { value: 'title', label: '书名' },
  { value: 'author', label: '作者' },
];

function sortBooks(books, sortBy) {
  const sorted = [...books];

  sorted.sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;

    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title, 'zh');
      case 'author':
        return a.author.localeCompare(b.author, 'zh');
      case 'lastReadAt':
        return (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0);
      case 'addedAt':
      default:
        return b.addedAt - a.addedAt;
    }
  });

  return sorted;
}

function filterBooks(books, query) {
  if (!query.trim()) return books;
  const keyword = query.toLowerCase();
  return books.filter((book) =>
    book.title.toLowerCase().includes(keyword) ||
    book.author.toLowerCase().includes(keyword)
  );
}

function BookShelf() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('addedAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const loadBooks = useCallback(async () => {
    setError('');
    const nextBooks = await getBookshelfEntries();
    setBooks(nextBooks);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initializeBookshelf = async () => {
      await loadBooks();
    };

    void initializeBookshelf();
  }, [loadBooks]);

  const filteredAndSorted = useMemo(() => {
    const filtered = filterBooks(books, searchQuery);
    return sortBooks(filtered, sortBy);
  }, [books, searchQuery, sortBy]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  }, []);

  const handleDelete = async (bookId) => {
    if (window.confirm('确定要删除这本书吗？')) {
      await removeBook(bookId);
      await loadBooks();
      setNotice('书籍已删除');
    }
  };

  const handleToggleFavorite = useCallback(async (bookId, currentFavorite) => {
    await patchBookRecord(bookId, { favorite: !currentFavorite });
    setBooks((prev) =>
      prev.map((book) =>
        book.id === bookId ? { ...book, favorite: !currentFavorite } : book
      )
    );
  }, []);

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

  const handleToggleSelect = useCallback((bookId) => {
    setSelectedIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  }, []);

  const handleEnterSelectMode = useCallback(() => {
    setSelectMode(true);
    setSelectedIds([]);
  }, []);

  const handleExitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds([]);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredAndSorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSorted.map((book) => book.id));
    }
  }, [selectedIds.length, filteredAndSorted]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 本书籍吗？`)) return;

    for (const bookId of selectedIds) {
      await removeBook(bookId);
    }
    handleExitSelectMode();
    await loadBooks();
    setNotice(`已删除 ${selectedIds.length} 本书籍`);
  }, [selectedIds, loadBooks, handleExitSelectMode]);

  const renderToolbar = books.length > 0 && (
    <div className="shelf-toolbar">
      <div className="search-box">
        <input
          type="text"
          placeholder="搜索书名或作者..."
          onChange={handleSearchChange}
          className="search-input"
        />
        {searchQuery && (
          <span className="search-result-count">
            {filteredAndSorted.length} / {books.length} 本
          </span>
        )}
      </div>
      <div className="sort-box">
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="view-toggle-btn"
          onClick={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
        >
          {viewMode === 'grid' ? '列表' : '网格'}
        </button>
        {!selectMode && (
          <button
            className="view-toggle-btn"
            onClick={handleEnterSelectMode}
          >
            选择
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bookshelf">
      <header className="shelf-header">
        <h1>我的书架</h1>
        <div className="header-actions">
          <Link to="/import" className="btn-import-book">导入书籍</Link>
          <button className="btn-export" onClick={() => setShowStats(true)}>阅读统计</button>
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

      {renderToolbar}

      {selectMode && (
        <div className="batch-bar">
          <button className="batch-action-btn" onClick={handleSelectAll}>
            {selectedIds.length === filteredAndSorted.length ? '取消全选' : '全选'}
          </button>
          <span className="batch-count">
            已选 {selectedIds.length} / {filteredAndSorted.length} 本
          </span>
          <button className="batch-delete-btn" onClick={handleBatchDelete}>
            批量删除
          </button>
          <button className="batch-cancel-btn" onClick={handleExitSelectMode}>
            取消选择
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : books.length === 0 ? (
        <div className="empty-shelf">
          <p>书架空空如也</p>
          <Link to="/import" className="btn-primary">导入第一本书</Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="book-grid">
          {filteredAndSorted.map((book) => (
            <div key={book.id} className="book-card">
              <div className="book-cover">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} />
                ) : (
                  <div className="book-cover-placeholder">
                    <span>{book.title.charAt(0)}</span>
                  </div>
                )}
                <button
                  className={`btn-favorite ${book.favorite ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleToggleFavorite(book.id, book.favorite);
                  }}
                >
                  {book.favorite ? '★' : '☆'}
                </button>
                {selectMode && (
                  <input
                    type="checkbox"
                    className="card-checkbox"
                    checked={selectedIds.includes(book.id)}
                    onChange={() => handleToggleSelect(book.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
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
      ) : (
        <div className="book-list">
          {filteredAndSorted.map((book) => (
            <div key={book.id} className="book-list-item">
              {selectMode && (
                <input
                  type="checkbox"
                  className="card-checkbox"
                  checked={selectedIds.includes(book.id)}
                  onChange={() => handleToggleSelect(book.id)}
                />
              )}
              <div className="list-item-cover">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} />
                ) : (
                  <div className="book-cover-placeholder">
                    <span>{book.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="list-item-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>
                {book.progress?.percentage > 0 && (
                  <span className="progress-text">
                    进度 {Math.round(book.progress.percentage)}%
                  </span>
                )}
              </div>
              <div className="list-item-actions">
                <button
                  className={`btn-favorite ${book.favorite ? 'active' : ''}`}
                  onClick={() => void handleToggleFavorite(book.id, book.favorite)}
                >
                  {book.favorite ? '★' : '☆'}
                </button>
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

      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
    </div>
  );
}

export default BookShelf;
