import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookShelf from './pages/BookShelf';
import Reader from './pages/Reader';
import Import from './pages/Import';
import './styles/variables.css';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookShelf />} />
        <Route path="/import" element={<Import />} />
        <Route path="/read/:bookId" element={<Reader />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
