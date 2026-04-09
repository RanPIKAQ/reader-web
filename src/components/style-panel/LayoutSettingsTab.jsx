import { CONTENT_WIDTHS } from './constants';

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
    </div>
  );
}

export default LayoutSettingsTab;
