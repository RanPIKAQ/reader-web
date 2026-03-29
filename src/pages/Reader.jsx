import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookReader from '../components/BookReader';
import StylePanel from '../components/StylePanel';
import { useSettings } from '../hooks/useSettings';
import { useReadingProgress } from '../hooks/useReadingProgress';

function Reader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { progress, updateProgress } = useReadingProgress(bookId);
  const [showStylePanel, setShowStylePanel] = useState(false);

  const handleProgressUpdate = useCallback((newProgress) => {
    updateProgress(newProgress);
  }, [updateProgress]);

  return (
    <div className={`reader-page theme-${settings.theme}`}>
      <header className="reader-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          返回
        </button>
        <button
          className="btn-settings"
          onClick={() => setShowStylePanel(true)}
        >
          设置
        </button>
      </header>

      <main className="reader-main">
        <BookReader
          bookId={bookId}
          settings={settings}
          onProgressUpdate={handleProgressUpdate}
        />
      </main>

      {showStylePanel && (
        <StylePanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowStylePanel(false)}
        />
      )}
    </div>
  );
}

export default Reader;
