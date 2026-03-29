import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveBookData, saveTxtContent } from '../utils/storage';
import { useBookParser } from '../hooks/useBookParser';

function Import() {
  const [dragOver, setDragOver] = useState(false);
  const { parseFile, loading, error } = useBookParser();
  const navigate = useNavigate();

  const handleFile = useCallback(async (file) => {
    const result = await parseFile(file);
    if (result) {
      const fileType = file.name.split('.').pop().toLowerCase();

      await saveBookData(result.id, {
        id: result.id,
        title: result.title || file.name,
        author: result.author || '未知作者',
        type: fileType,
        fileName: file.name,
        addedAt: Date.now(),
        cover: result.cover || null,
        chapters: result.chapters || null,
      });

      // TXT 文件需要保存完整内容用于按需提取章节
      if (fileType === 'txt' && result.content) {
        await saveTxtContent(result.id, result.content);
      }

      navigate(`/read/${result.id}`);
    }
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
                accept=".txt,.epub,.mobi"
                onChange={handleFileInput}
                hidden
              />
            </label>
            <p className="supported-formats">
              支持格式: TXT, EPUB, MOBI
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Import;
