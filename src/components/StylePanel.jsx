import { useState } from 'react';

const FONTS = [
  { label: '宋体', value: 'Georgia, serif' },
  { label: '黑体', value: '"Helvetica Neue", Arial, sans-serif' },
  { label: '楷体', value: '"KaiTi", "STKaiti", serif' },
  { label: '等宽', value: '"Courier New", monospace' },
];

const FONT_SIZES = [14, 16, 18, 20, 22, 24, 26, 28];
const FONT_WEIGHTS = [
  { label: '细', value: 300 },
  { label: '正常', value: 400 },
  { label: '中等', value: 500 },
  { label: '粗', value: 700 },
];
const LINE_HEIGHTS = [1.4, 1.6, 1.8, 2.0, 2.2];
const CONTENT_WIDTHS = [
  { label: '100%', value: 100 },
  { label: '90%', value: 90 },
  { label: '80%', value: 80 },
  { label: '70%', value: 70 },
  { label: '60%', value: 60 },
];

const THEME_COLOR_MAP = {
  day: {
    text: '#333333',
    bg: '#ffffff',
  },
  night: {
    text: '#e0e0e0',
    bg: '#1a1a1a',
  },
  sepia: {
    text: '#5b4636',
    bg: '#f4ecd8',
  },
};

function normalizeColor(color) {
  return (color || '').trim().toLowerCase();
}

function isDefaultThemeColor(selectedColor, defaultColor) {
  return !selectedColor || normalizeColor(selectedColor) === normalizeColor(defaultColor);
}

function getVisibleCustomColors(colors, defaultColor) {
  const seen = new Set();
  const normalizedDefault = normalizeColor(defaultColor);

  return (colors || []).filter((color) => {
    const normalized = normalizeColor(color);
    if (!normalized || normalized === normalizedDefault || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function StylePanel({ settings, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('font');
  const themeColors = THEME_COLOR_MAP[settings.theme] || THEME_COLOR_MAP.day;
  const defaultTextColor = themeColors.text;
  const defaultBgColor = themeColors.bg;
  const effectiveTextColor = settings.customTextColor || defaultTextColor;
  const effectiveBgColor = settings.customBgColor || defaultBgColor;
  const visibleTextColors = getVisibleCustomColors(settings.customTextColors, defaultTextColor);
  const visibleBgColors = getVisibleCustomColors(settings.customBgColors, defaultBgColor);

  const handleAddCustomColor = (colorType) => {
    const isText = colorType === 'text';
    const defaultColor = isText ? defaultTextColor : defaultBgColor;
    const selectedColor = isText ? effectiveTextColor : effectiveBgColor;
    const currentColors = isText ? settings.customTextColors : settings.customBgColors;
    const visibleColors = isText ? visibleTextColors : visibleBgColors;

    if (normalizeColor(selectedColor) === normalizeColor(defaultColor)) {
      return;
    }

    if (visibleColors.some(color => normalizeColor(color) === normalizeColor(selectedColor))) {
      return;
    }

    const nextColors = [...(currentColors || []), selectedColor];
    onUpdate(isText ? { customTextColors: nextColors } : { customBgColors: nextColors });
  };

  const handleRemoveCustomColor = (colorType, color) => {
    const isText = colorType === 'text';
    const currentColors = isText ? settings.customTextColors : settings.customBgColors;
    const selectedColor = isText ? settings.customTextColor : settings.customBgColor;
    const nextColors = (currentColors || []).filter(item => normalizeColor(item) !== normalizeColor(color));

    if (isText) {
      onUpdate({
        customTextColors: nextColors,
        customTextColor: normalizeColor(selectedColor) === normalizeColor(color) ? null : selectedColor,
      });
      return;
    }

    onUpdate({
      customBgColors: nextColors,
      customBgColor: normalizeColor(selectedColor) === normalizeColor(color) ? null : selectedColor,
    });
  };

  return (
    <div className="style-panel-overlay" onClick={onClose}>
      <div className="style-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>阅读设置</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-tabs">
          <button
            className={activeTab === 'font' ? 'active' : ''}
            onClick={() => setActiveTab('font')}
          >
            字体
          </button>
          <button
            className={activeTab === 'theme' ? 'active' : ''}
            onClick={() => setActiveTab('theme')}
          >
            主题
          </button>
          <button
            className={activeTab === 'color' ? 'active' : ''}
            onClick={() => setActiveTab('color')}
          >
            颜色
          </button>
          <button
            className={activeTab === 'layout' ? 'active' : ''}
            onClick={() => setActiveTab('layout')}
          >
            布局
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'font' && (
            <div className="settings-group">
              <div className="setting-item">
                <label>字体</label>
                <div className="font-options">
                  {FONTS.map((font) => (
                    <button
                      key={font.value}
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
                  {FONT_WEIGHTS.map((w) => (
                    <button
                      key={w.value}
                      className={`weight-btn ${settings.fontWeight === w.value ? 'active' : ''}`}
                      onClick={() => onUpdate({ fontWeight: w.value })}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-item">
                <label>行高</label>
                <div className="line-height-options">
                  {LINE_HEIGHTS.map((lh) => (
                    <button
                      key={lh}
                      className={`lh-btn ${settings.lineHeight === lh ? 'active' : ''}`}
                      onClick={() => onUpdate({ lineHeight: lh })}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="settings-group">
              <div className="theme-options">
                <button
                  className={`theme-btn theme-day ${settings.theme === 'day' ? 'active' : ''}`}
                  onClick={() => onUpdate({ theme: 'day' })}
                >
                  <span className="theme-preview day-preview" />
                  <span>白天</span>
                </button>
                <button
                  className={`theme-btn theme-night ${settings.theme === 'night' ? 'active' : ''}`}
                  onClick={() => onUpdate({ theme: 'night' })}
                >
                  <span className="theme-preview night-preview" />
                  <span>夜间</span>
                </button>
                <button
                  className={`theme-btn theme-sepia ${settings.theme === 'sepia' ? 'active' : ''}`}
                  onClick={() => onUpdate({ theme: 'sepia' })}
                >
                  <span className="theme-preview sepia-preview" />
                  <span>护眼</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'color' && (
            <div className="settings-group">
              <div className="setting-item">
                <label>文字颜色</label>
                <div className="color-options">
                  <input
                    type="color"
                    className="color-picker"
                    value={effectiveTextColor}
                    onChange={(e) => onUpdate({ customTextColor: e.target.value })}
                  />
                  <div className="color-presets">
                    <button
                      className={`color-preset ${isDefaultThemeColor(settings.customTextColor, defaultTextColor) ? 'active' : ''}`}
                      style={{ backgroundColor: defaultTextColor }}
                      onClick={() => onUpdate({ customTextColor: null })}
                      title="当前主题默认文字色"
                      aria-label="使用当前主题默认文字色"
                    />
                    {visibleTextColors.map((color) => (
                      <div key={color} className="color-preset-item">
                        <button
                          className={`color-preset custom ${normalizeColor(settings.customTextColor) === normalizeColor(color) ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onUpdate({ customTextColor: color })}
                          title={`自定义文字颜色 ${color}`}
                          aria-label={`选择自定义文字颜色 ${color}`}
                        />
                        <button
                          className="color-preset-delete"
                          onClick={() => handleRemoveCustomColor('text', color)}
                          aria-label={`删除自定义文字颜色 ${color}`}
                          title={`删除 ${color}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="color-add-btn"
                      onClick={() => handleAddCustomColor('text')}
                      title="添加当前颜色到自定义"
                      aria-label="添加当前文字颜色到自定义"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <label>背景颜色</label>
                <div className="color-options">
                  <input
                    type="color"
                    className="color-picker"
                    value={effectiveBgColor}
                    onChange={(e) => onUpdate({ customBgColor: e.target.value })}
                  />
                  <div className="color-presets">
                    <button
                      className={`color-preset ${isDefaultThemeColor(settings.customBgColor, defaultBgColor) ? 'active' : ''}`}
                      style={{ backgroundColor: defaultBgColor }}
                      onClick={() => onUpdate({ customBgColor: null })}
                      title="当前主题默认背景色"
                      aria-label="使用当前主题默认背景色"
                    />
                    {visibleBgColors.map((color) => (
                      <div key={color} className="color-preset-item">
                        <button
                          className={`color-preset custom ${normalizeColor(settings.customBgColor) === normalizeColor(color) ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => onUpdate({ customBgColor: color })}
                          title={`自定义背景颜色 ${color}`}
                          aria-label={`选择自定义背景颜色 ${color}`}
                        />
                        <button
                          className="color-preset-delete"
                          onClick={() => handleRemoveCustomColor('bg', color)}
                          aria-label={`删除自定义背景颜色 ${color}`}
                          title={`删除 ${color}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="color-add-btn"
                      onClick={() => handleAddCustomColor('bg')}
                      title="添加当前颜色到自定义"
                      aria-label="添加当前背景颜色到自定义"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <button
                  className="btn-reset-color"
                  onClick={() => {
                    onUpdate({ customTextColor: null, customBgColor: null });
                  }}
                >
                  重置为默认
                </button>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="settings-group">
              <div className="setting-item">
                <label>内容宽度: {settings.contentWidth || 100}%</label>
                <div className="width-options">
                  {CONTENT_WIDTHS.map((w) => (
                    <button
                      key={w.value}
                      className={`width-btn ${settings.contentWidth === w.value ? 'active' : ''}`}
                      onClick={() => onUpdate({ contentWidth: w.value })}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StylePanel;
