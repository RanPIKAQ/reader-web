import { CONTENT_WIDTHS, PARAGRAPH_SPACINGS, PARAGRAPH_INDENTS } from './constants';

function LayoutSettingsTab({ settings, onUpdate }) {
  return (
    <div className="settings-group">
      <div className="setting-item">
        <label>内容宽度: {settings.contentWidth || 100}%</label>
        <div className="width-options">
          {CONTENT_WIDTHS.map((width) => (
            <button
              key={width.value}
              type="button"
              className={`width-btn ${settings.contentWidth === width.value ? 'active' : ''}`}
              onClick={() => onUpdate({ contentWidth: width.value })}
            >
              {width.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-item">
        <label>段落间距: {settings.paragraphSpacing || 0}em</label>
        <div className="width-options">
          {PARAGRAPH_SPACINGS.map((spacing) => (
            <button
              key={spacing.value}
              type="button"
              className={`width-btn ${(settings.paragraphSpacing || 0) === spacing.value ? 'active' : ''}`}
              onClick={() => onUpdate({ paragraphSpacing: spacing.value })}
            >
              {spacing.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-item">
        <label>首行缩进: {(settings.paragraphIndent || 0) > 0 ? `${settings.paragraphIndent}em` : '无'}</label>
        <div className="width-options">
          {PARAGRAPH_INDENTS.map((indent) => (
            <button
              key={indent.value}
              type="button"
              className={`width-btn ${(settings.paragraphIndent || 0) === indent.value ? 'active' : ''}`}
              onClick={() => onUpdate({ paragraphIndent: indent.value })}
            >
              {indent.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LayoutSettingsTab;
