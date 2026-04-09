import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Import.css';
import { IMPORT_FILE_ACCEPT, IMPORT_FILE_LABEL } from '../utils/book';
import { saveBookAsset, saveBookRecord } from '../utils/storage';
import { useBookParser } from '../hooks/useBookParser';

function Import() {
  const [dragOver, setDragOver] = useState(false);
  const { parseFile, loading, error } = useBookParser();
  const navigate = useNavigate();

  const handleFile = useCallback(async (file) => {
    const result = await parseFile(file);
    if (!result) return;

    await saveBookRecord({
      ...result.book,
      assetMissing: false,
      assetMissingMessage: null,
    });
    await saveBookAsset(result.book.id, result.asset);
    navigate(`/read/${result.book.id}`);
  }, [parseFile, navigate]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="import-page">
      <header className="import-header">
        <button onClick={() => navigate('/')} className="btn-back">
          返回书架
        </button>
        <h1>导入书籍</h1>
      </header>

      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="loading">正在解析书籍...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            <div className="drop-icon">📚</div>
            <p className="drop-text">拖拽书籍文件到这里</p>
            <p className="drop-hint">或</p>
            <label className="btn-select">
              选择文件
              <input
                type="file"
                accept={IMPORT_FILE_ACCEPT}
                onChange={handleFileInput}
                hidden
              />
            </label>
            <p className="supported-formats">
              支持格式: {IMPORT_FILE_LABEL}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Import;
