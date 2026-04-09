import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/variables.css';
import './index.css';

const BookShelf = lazy(() => import('./pages/BookShelf'));
const Reader = lazy(() => import('./pages/Reader'));
const Import = lazy(() => import('./pages/Import'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="app-loading">加载中...</div>}>
        <Routes>
          <Route path="/" element={<BookShelf />} />
          <Route path="/import" element={<Import />} />
          <Route path="/read/:bookId" element={<Reader />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
