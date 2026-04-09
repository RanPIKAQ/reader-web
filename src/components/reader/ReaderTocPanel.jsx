function ReaderTocPanel({
  open,
  isTxt,
  toc,
  volumes,
  collapsedVolumes,
  flatChapters,
  currentChapterIndex,
  onClose,
  onSelectItem,
  onToggleVolume,
  onExpandAll,
  onCollapseAll,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="toc-overlay" onClick={onClose}>
      <div className="toc-panel" onClick={(event) => event.stopPropagation()}>
        <div className="toc-header">
          <h3>目录</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {isTxt && volumes.length > 0 ? (
          <nav className="toc-list">
            <div className="toc-actions">
              <button type="button" className="toc-action-btn" onClick={onExpandAll}>全部展开</button>
              <button type="button" className="toc-action-btn" onClick={onCollapseAll}>全部折叠</button>
            </div>
            {volumes.map((volume) => {
              const isCollapsed = collapsedVolumes[volume.id];

              return (
                <div key={volume.id} className="toc-volume">
                  <button
                    type="button"
                    className={`toc-volume-title ${isCollapsed ? 'collapsed' : 'expanded'}`}
                    onClick={() => onToggleVolume(volume.id)}
                  >
                    <span className="toc-arrow">{isCollapsed ? '▶' : '▼'}</span>
                    {volume.title}
                  </button>
                  {!isCollapsed && (
                    <div className="toc-chapters">
                      {volume.children.map((chapter) => (
                        <button
                          key={chapter.id}
                          type="button"
                          className={`toc-item toc-chapter ${flatChapters[currentChapterIndex]?.id === chapter.id ? 'active' : ''}`}
                          onClick={() => onSelectItem(chapter.id)}
                        >
                          {chapter.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        ) : (
          <nav className="toc-list">
            {toc.map((item, index) => (
              <button
                key={item.href || index}
                type="button"
                className="toc-item"
                onClick={() => onSelectItem(item.href)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export default ReaderTocPanel;
