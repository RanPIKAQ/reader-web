import { useEffect, useRef, useState } from 'react';

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
    bg: '#FFFFFF',
  },
  night: {
    text: '#E0E0E0',
    bg: '#1A1A1A',
  },
  sepia: {
    text: '#5B4636',
    bg: '#F4ECD8',
  },
};

const HEX_ERROR_MESSAGE = '请输入 6 位十六进制颜色码';
const COPY_SUCCESS_MESSAGE = '已复制';
const COPY_FAILURE_MESSAGE = '复制失败';
const FEEDBACK_DURATION = 1500;
const IDLE_STATUS = { tone: 'idle', message: '' };

function normalizeColor(color) {
  return (color || '').trim().toLowerCase();
}

function formatHexColor(color, fallback = '#000000') {
  const normalized = normalizeColor(color);

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized.toUpperCase()}`;
  }

  return fallback.toUpperCase();
}

function parseHexInput(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { kind: 'empty' };
  }

  if (/^#[0-9A-F]{6}$/.test(trimmed) || /^[0-9A-F]{6}$/.test(trimmed)) {
    return {
      kind: 'valid',
      value: formatHexColor(trimmed),
    };
  }

  if (/^#?[0-9A-F]{1,5}$/.test(trimmed)) {
    return { kind: 'partial' };
  }

  return { kind: 'invalid' };
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy path.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function isDefaultThemeColor(selectedColor, defaultColor) {
  return !selectedColor || normalizeColor(selectedColor) === normalizeColor(defaultColor);
}

function getVisibleCustomColors(colors, defaultColor) {
  const seen = new Set();
  const normalizedDefault = normalizeColor(defaultColor);

  return (colors || []).reduce((result, color) => {
    const formattedColor = formatHexColor(color, defaultColor);
    const normalized = normalizeColor(formattedColor);

    if (!normalized || normalized === normalizedDefault || seen.has(normalized)) {
      return result;
    }

    seen.add(normalized);
    result.push(formattedColor);
    return result;
  }, []);
}

function clearTimer(timerRef) {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function StylePanel({ settings, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('font');

  const themeColors = THEME_COLOR_MAP[settings.theme] || THEME_COLOR_MAP.day;
  const defaultTextColor = formatHexColor(themeColors.text, '#333333');
  const defaultBgColor = formatHexColor(themeColors.bg, '#FFFFFF');
  const effectiveTextColor = formatHexColor(settings.customTextColor || defaultTextColor, defaultTextColor);
  const effectiveBgColor = formatHexColor(settings.customBgColor || defaultBgColor, defaultBgColor);
  const visibleTextColors = getVisibleCustomColors(settings.customTextColors, defaultTextColor);
  const visibleBgColors = getVisibleCustomColors(settings.customBgColors, defaultBgColor);

  const [textHexInput, setTextHexInput] = useState(effectiveTextColor);
  const [bgHexInput, setBgHexInput] = useState(effectiveBgColor);
  const [textHexDirty, setTextHexDirty] = useState(false);
  const [bgHexDirty, setBgHexDirty] = useState(false);
  const [textStatus, setTextStatus] = useState(IDLE_STATUS);
  const [bgStatus, setBgStatus] = useState(IDLE_STATUS);

  const textFeedbackTimerRef = useRef(null);
  const bgFeedbackTimerRef = useRef(null);

  const displayedTextHexInput = textHexDirty ? textHexInput : effectiveTextColor;
  const displayedBgHexInput = bgHexDirty ? bgHexInput : effectiveBgColor;

  useEffect(() => () => {
    clearTimer(textFeedbackTimerRef);
    clearTimer(bgFeedbackTimerRef);
  }, []);

  const setStatus = (type, nextStatus) => {
    if (type === 'text') {
      setTextStatus(nextStatus);
      return;
    }

    setBgStatus(nextStatus);
  };

  const resetStatus = (type) => {
    const timerRef = type === 'text' ? textFeedbackTimerRef : bgFeedbackTimerRef;
    clearTimer(timerRef);
    setStatus(type, IDLE_STATUS);
  };

  const setTransientStatus = (type, tone, message) => {
    const timerRef = type === 'text' ? textFeedbackTimerRef : bgFeedbackTimerRef;
    clearTimer(timerRef);
    setStatus(type, { tone, message });
    timerRef.current = window.setTimeout(() => {
      setStatus(type, IDLE_STATUS);
      timerRef.current = null;
    }, FEEDBACK_DURATION);
  };

  const syncLocalColorState = (type, color) => {
    const formattedColor = formatHexColor(color, type === 'text' ? defaultTextColor : defaultBgColor);

    if (type === 'text') {
      setTextHexInput(formattedColor);
      setTextHexDirty(false);
    } else {
      setBgHexInput(formattedColor);
      setBgHexDirty(false);
    }

    resetStatus(type);
  };

  const handleThemeChange = (theme) => {
    const nextThemeColors = THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.day;
    onUpdate({ theme });

    if (!settings.customTextColor) {
      syncLocalColorState('text', nextThemeColors.text);
    }

    if (!settings.customBgColor) {
      syncLocalColorState('bg', nextThemeColors.bg);
    }
  };

  const handleColorPickerChange = (type, value) => {
    const formattedColor = formatHexColor(value, type === 'text' ? defaultTextColor : defaultBgColor);

    if (type === 'text') {
      onUpdate({ customTextColor: formattedColor });
    } else {
      onUpdate({ customBgColor: formattedColor });
    }

    syncLocalColorState(type, formattedColor);
  };

  const handleDefaultColorSelect = (type) => {
    if (type === 'text') {
      onUpdate({ customTextColor: null });
      syncLocalColorState('text', defaultTextColor);
      return;
    }

    onUpdate({ customBgColor: null });
    syncLocalColorState('bg', defaultBgColor);
  };

  const handleCustomColorSelect = (type, color) => {
    const formattedColor = formatHexColor(color, type === 'text' ? defaultTextColor : defaultBgColor);

    if (type === 'text') {
      onUpdate({ customTextColor: formattedColor });
    } else {
      onUpdate({ customBgColor: formattedColor });
    }

    syncLocalColorState(type, formattedColor);
  };

  const handleAddCustomColor = (type) => {
    const isText = type === 'text';
    const defaultColor = isText ? defaultTextColor : defaultBgColor;
    const selectedColor = isText ? effectiveTextColor : effectiveBgColor;
    const currentColors = isText ? settings.customTextColors : settings.customBgColors;

    if (normalizeColor(selectedColor) === normalizeColor(defaultColor)) {
      return;
    }

    if ((currentColors || []).some((color) => normalizeColor(color) === normalizeColor(selectedColor))) {
      return;
    }

    const nextColors = [...(currentColors || []), selectedColor];
    onUpdate(isText ? { customTextColors: nextColors } : { customBgColors: nextColors });
  };

  const handleRemoveCustomColor = (type, color) => {
    const isText = type === 'text';
    const currentColors = isText ? settings.customTextColors : settings.customBgColors;
    const selectedColor = isText ? settings.customTextColor : settings.customBgColor;
    const defaultColor = isText ? defaultTextColor : defaultBgColor;
    const formattedColor = formatHexColor(color, defaultColor);
    const nextColors = (currentColors || []).filter((item) => normalizeColor(item) !== normalizeColor(formattedColor));
    const isRemovingSelected = normalizeColor(selectedColor) === normalizeColor(formattedColor);

    if (isText) {
      onUpdate({
        customTextColors: nextColors,
        customTextColor: isRemovingSelected ? null : settings.customTextColor,
      });
    } else {
      onUpdate({
        customBgColors: nextColors,
        customBgColor: isRemovingSelected ? null : settings.customBgColor,
      });
    }

    if (isRemovingSelected) {
      syncLocalColorState(type, defaultColor);
    }
  };

  const handleHexInputChange = (type, value) => {
    const nextValue = value.replace(/\s+/g, '').toUpperCase();
    const parsed = parseHexInput(nextValue);

    if (type === 'text') {
      setTextHexInput(nextValue);
      setTextHexDirty(true);
    } else {
      setBgHexInput(nextValue);
      setBgHexDirty(true);
    }

    resetStatus(type);

    if (parsed.kind === 'valid') {
      if (type === 'text') {
        onUpdate({ customTextColor: parsed.value });
        setTextHexInput(parsed.value);
        setTextHexDirty(false);
      } else {
        onUpdate({ customBgColor: parsed.value });
        setBgHexInput(parsed.value);
        setBgHexDirty(false);
      }
      return;
    }

    if (parsed.kind === 'invalid') {
      setStatus(type, { tone: 'error', message: HEX_ERROR_MESSAGE });
    }
  };

  const handleHexInputBlur = (type, value) => {
    const currentValue = value.trim().toUpperCase();
    const parsed = parseHexInput(currentValue);

    if (parsed.kind === 'empty') {
      syncLocalColorState(type, type === 'text' ? effectiveTextColor : effectiveBgColor);
      return;
    }

    if (parsed.kind !== 'valid') {
      setStatus(type, { tone: 'error', message: HEX_ERROR_MESSAGE });
    }
  };

  const handleCopyColor = async (type) => {
    const colorToCopy = type === 'text' ? effectiveTextColor : effectiveBgColor;
    const success = await copyTextToClipboard(colorToCopy);

    setTransientStatus(
      type,
      success ? 'success' : 'failure',
      success ? COPY_SUCCESS_MESSAGE : COPY_FAILURE_MESSAGE,
    );
  };

  const handleResetColors = () => {
    onUpdate({
      customTextColor: null,
      customBgColor: null,
    });
    syncLocalColorState('text', defaultTextColor);
    syncLocalColorState('bg', defaultBgColor);
  };

  return (
    <div className="style-panel-overlay" onClick={onClose}>
      <div className="style-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>阅读设置</h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-tabs">
          <button
            type="button"
            className={activeTab === 'font' ? 'active' : ''}
            onClick={() => setActiveTab('font')}
          >
            字体
          </button>
          <button
            type="button"
            className={activeTab === 'theme' ? 'active' : ''}
            onClick={() => setActiveTab('theme')}
          >
            主题
          </button>
          <button
            type="button"
            className={activeTab === 'color' ? 'active' : ''}
            onClick={() => setActiveTab('color')}
          >
            颜色
          </button>
          <button
            type="button"
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
          )}

          {activeTab === 'theme' && (
            <div className="settings-group">
              <div className="theme-options">
                <button
                  type="button"
                  className={`theme-btn theme-day ${settings.theme === 'day' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('day')}
                >
                  <span className="theme-preview day-preview" />
                  <span>白天</span>
                </button>
                <button
                  type="button"
                  className={`theme-btn theme-night ${settings.theme === 'night' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('night')}
                >
                  <span className="theme-preview night-preview" />
                  <span>夜间</span>
                </button>
                <button
                  type="button"
                  className={`theme-btn theme-sepia ${settings.theme === 'sepia' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('sepia')}
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
                    onChange={(e) => handleColorPickerChange('text', e.target.value)}
                    aria-label="选择文字颜色"
                  />
                  <div className="color-tools">
                    <div className="color-code-row">
                      <input
                        type="text"
                        className={`color-hex-input ${textStatus.tone === 'error' ? 'is-error' : ''}`}
                        value={displayedTextHexInput}
                        onChange={(e) => handleHexInputChange('text', e.target.value)}
                        onBlur={(e) => handleHexInputBlur('text', e.target.value)}
                        placeholder="#RRGGBB"
                        aria-label="输入文字颜色十六进制代码"
                        autoComplete="off"
                        spellCheck="false"
                        maxLength={7}
                      />
                      <button
                        type="button"
                        className="color-copy-btn"
                        onClick={() => handleCopyColor('text')}
                      >
                        复制颜色码
                      </button>
                    </div>
                    <div
                      className={`color-feedback ${textStatus.tone !== 'idle' ? `is-${textStatus.tone}` : ''}`}
                      aria-live="polite"
                    >
                      {textStatus.message}
                    </div>
                    <div className="color-presets">
                      <button
                        type="button"
                        className={`color-preset ${isDefaultThemeColor(settings.customTextColor, defaultTextColor) ? 'active' : ''}`}
                        style={{ backgroundColor: defaultTextColor }}
                        onClick={() => handleDefaultColorSelect('text')}
                        title="当前主题默认文字色"
                        aria-label="使用当前主题默认文字色"
                      />
                      {visibleTextColors.map((color) => (
                        <div key={color} className="color-preset-item">
                          <button
                            type="button"
                            className={`color-preset custom ${normalizeColor(settings.customTextColor) === normalizeColor(color) ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleCustomColorSelect('text', color)}
                            title={`自定义文字颜色 ${color}`}
                            aria-label={`选择自定义文字颜色 ${color}`}
                          />
                          <button
                            type="button"
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
                        type="button"
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
              </div>

              <div className="setting-item">
                <label>背景颜色</label>
                <div className="color-options">
                  <input
                    type="color"
                    className="color-picker"
                    value={effectiveBgColor}
                    onChange={(e) => handleColorPickerChange('bg', e.target.value)}
                    aria-label="选择背景颜色"
                  />
                  <div className="color-tools">
                    <div className="color-code-row">
                      <input
                        type="text"
                        className={`color-hex-input ${bgStatus.tone === 'error' ? 'is-error' : ''}`}
                        value={displayedBgHexInput}
                        onChange={(e) => handleHexInputChange('bg', e.target.value)}
                        onBlur={(e) => handleHexInputBlur('bg', e.target.value)}
                        placeholder="#RRGGBB"
                        aria-label="输入背景颜色十六进制代码"
                        autoComplete="off"
                        spellCheck="false"
                        maxLength={7}
                      />
                      <button
                        type="button"
                        className="color-copy-btn"
                        onClick={() => handleCopyColor('bg')}
                      >
                        复制颜色码
                      </button>
                    </div>
                    <div
                      className={`color-feedback ${bgStatus.tone !== 'idle' ? `is-${bgStatus.tone}` : ''}`}
                      aria-live="polite"
                    >
                      {bgStatus.message}
                    </div>
                    <div className="color-presets">
                      <button
                        type="button"
                        className={`color-preset ${isDefaultThemeColor(settings.customBgColor, defaultBgColor) ? 'active' : ''}`}
                        style={{ backgroundColor: defaultBgColor }}
                        onClick={() => handleDefaultColorSelect('bg')}
                        title="当前主题默认背景色"
                        aria-label="使用当前主题默认背景色"
                      />
                      {visibleBgColors.map((color) => (
                        <div key={color} className="color-preset-item">
                          <button
                            type="button"
                            className={`color-preset custom ${normalizeColor(settings.customBgColor) === normalizeColor(color) ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleCustomColorSelect('bg', color)}
                            title={`自定义背景颜色 ${color}`}
                            aria-label={`选择自定义背景颜色 ${color}`}
                          />
                          <button
                            type="button"
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
                        type="button"
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
              </div>

              <div className="setting-item">
                <button
                  type="button"
                  className="btn-reset-color"
                  onClick={handleResetColors}
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
          )}
        </div>
      </div>
    </div>
  );
}

export default StylePanel;
