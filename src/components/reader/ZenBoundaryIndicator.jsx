import { CHAPTER_BOUNDARY_THRESHOLD } from '../../hooks/reader/txtReaderUtils';

function ZenBoundaryIndicator({ zenMode, isTxt, boundaryScrollState }) {
  if (!zenMode || !isTxt || !boundaryScrollState) {
    return null;
  }

  const boundaryScrollPercent = Math.min(
    (boundaryScrollState.value / CHAPTER_BOUNDARY_THRESHOLD) * 100,
    100,
  );

  return (
    <div
      className={`zen-boundary-indicator zen-boundary-indicator-${boundaryScrollState.direction}`}
      aria-hidden="true"
    >
      <div className="zen-boundary-card">
        <span className="zen-boundary-label">
          {boundaryScrollState.direction === 'next'
            ? '继续下滚进入下一章'
            : '继续上滚进入上一章'}
        </span>
        <span className="zen-boundary-title">{boundaryScrollState.targetTitle}</span>
        <div className="zen-boundary-progress">
          <div
            className="zen-boundary-progress-fill"
            style={{ width: `${boundaryScrollPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default ZenBoundaryIndicator;
