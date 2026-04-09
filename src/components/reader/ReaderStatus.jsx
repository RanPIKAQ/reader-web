function ReaderStatus({ loading, error, overlay = false }) {
  if (!loading && !error) {
    return null;
  }

  return (
    <div className={`reader-status ${error ? 'reader-status-error' : ''} ${overlay ? 'reader-status-overlay' : ''}`}>
      <p>{loading ? '加载中...' : error}</p>
    </div>
  );
}

export default ReaderStatus;
