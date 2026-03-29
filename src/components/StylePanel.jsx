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

function StylePanel({ settings, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('font');

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
