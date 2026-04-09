function ReaderFooter({
  isTxt,
  progressLabel,
  onOpenToc,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}) {
  return (
    <div className="reader-footer">
      <button type="button" className="footer-btn" onClick={onOpenToc}>
        目录
      </button>
      <div className="progress-info">{progressLabel}</div>
      {isTxt ? (
        <>
          <button type="button" className="footer-btn" onClick={onPrev} disabled={!canGoPrev}>
            上一章
          </button>
          <button type="button" className="footer-btn" onClick={onNext} disabled={!canGoNext}>
            下一章
          </button>
        </>
      ) : (
        <>
          <button type="button" className="footer-btn" onClick={onPrev}>
            上一页
          </button>
          <button type="button" className="footer-btn" onClick={onNext}>
            下一页
          </button>
        </>
      )}
    </div>
  );
}

export default ReaderFooter;
