import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllBooks, getReadingProgress, removeBook } from '../utils/storage';

function BookShelf() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bookshelf">
      <header className="shelf-header">
        <h1>我的书架</h1>
        <Link to="/import" className="btn-import">导入书籍</Link>
      </header>

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
    </div>
  );
}

export default BookShelf;
