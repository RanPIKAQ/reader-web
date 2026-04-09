import { FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from './constants';

function FontSettingsTab({ settings, onUpdate }) {
  return (
    <div className="settings-group">
      <div className="setting-item">
        <label>字体</label>
        <div className="font-options">
          {FONTS.map((font) => (
            <button
              key={font.value}
              type="button"
              className={`font-btn ${settings.fontFamily === font.value ? 'active' : ''}`}
              onClick={() => onUpdate({ fontFamily: font.value })}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-item">
        <label>字号: {settings.fontSize}px</label>
        <div className="size-options">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`size-btn ${settings.fontSize === size ? 'active' : ''}`}
              onClick={() => onUpdate({ fontSize: size })}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-item">
        <label>字重</label>
        <div className="weight-options">
          {FONT_WEIGHTS.map((weight) => (
            <button
              key={weight.value}
              type="button"
              className={`weight-btn ${settings.fontWeight === weight.value ? 'active' : ''}`}
              onClick={() => onUpdate({ fontWeight: weight.value })}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-item">
        <label>行高</label>
        <div className="line-height-options">
          {LINE_HEIGHTS.map((lineHeight) => (
            <button
              key={lineHeight}
              type="button"
              className={`lh-btn ${settings.lineHeight === lineHeight ? 'active' : ''}`}
              onClick={() => onUpdate({ lineHeight })}
            >
              {lineHeight}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FontSettingsTab;
