import { useRef } from 'react';
import { FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from './constants';

const MAX_FONT_SIZE = 5 * 1024 * 1024;

function FontSettingsTab({ settings, onUpdate }) {
  const fileInputRef = useRef(null);
  const customFonts = settings.customFonts || [];

  const handleFontSelect = (family) => {
    onUpdate({ fontFamily: family });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FONT_SIZE) {
      return;
    }

    const isDuplicate = customFonts.some(
      (font) => font.name === file.name.replace(/\.(ttf|woff2)$/i, '')
    );
    if (isDuplicate) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const name = file.name.replace(/\.(ttf|woff2)$/i, '');
      const family = `CustomFont_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      onUpdate({
        customFonts: [...customFonts, { name, dataUrl, family }],
        fontFamily: family,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveFont = (family) => {
    onUpdate({
      customFonts: customFonts.filter((font) => font.family !== family),
      fontFamily: settings.fontFamily === family ? FONTS[0].value : settings.fontFamily,
    });
  };

  return (
    <div className="settings-group">
      {customFonts.length > 0 && (
        <div className="setting-item">
          <label>自定义字体</label>
          <div className="custom-fonts-list">
            {customFonts.map((font) => (
              <div
                key={font.family}
                className={`custom-font-item ${settings.fontFamily === font.family ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="custom-font-select"
                  onClick={() => handleFontSelect(font.family)}
                >
                  <span className="custom-font-preview" style={{ fontFamily: font.family }}>
                    Aa 预览
                  </span>
                  <span className="custom-font-name">{font.name}</span>
                </button>
                <button
                  type="button"
                  className="custom-font-remove"
                  onClick={() => handleRemoveFont(font.family)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="setting-item">
        <label>系统字体</label>
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

      <div className="setting-item">
        <button
          type="button"
          className="font-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          上传自定义字体
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.woff2"
          onChange={handleUpload}
          hidden
        />
        <span className="font-upload-hint">支持 .ttf .woff2 格式，最大 5MB</span>
      </div>
    </div>
  );
}

export default FontSettingsTab;
