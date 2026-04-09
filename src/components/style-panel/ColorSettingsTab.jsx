import { isDefaultThemeColor, normalizeColor } from './colorUtils';

function ColorSettingsTab({ settings, colorController }) {
  const {
    defaultTextColor,
    defaultBgColor,
    effectiveTextColor,
    effectiveBgColor,
    visibleTextColors,
    visibleBgColors,
    displayedTextHexInput,
    displayedBgHexInput,
    textStatus,
    bgStatus,
    handleColorPickerChange,
    handleDefaultColorSelect,
    handleCustomColorSelect,
    handleAddCustomColor,
    handleRemoveCustomColor,
    handleHexInputChange,
    handleHexInputBlur,
    handleCopyColor,
    handleResetColors,
  } = colorController;

  return (
    <div className="settings-group">
      <div className="setting-item">
        <label>文字颜色</label>
        <div className="color-options">
          <input
            type="color"
            className="color-picker"
            value={effectiveTextColor}
            onChange={(event) => handleColorPickerChange('text', event.target.value)}
            aria-label="选择文字颜色"
          />
          <div className="color-tools">
            <div className="color-code-row">
              <input
                type="text"
                className={`color-hex-input ${textStatus.tone === 'error' ? 'is-error' : ''}`}
                value={displayedTextHexInput}
                onChange={(event) => handleHexInputChange('text', event.target.value)}
                onBlur={(event) => handleHexInputBlur('text', event.target.value)}
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
            onChange={(event) => handleColorPickerChange('bg', event.target.value)}
            aria-label="选择背景颜色"
          />
          <div className="color-tools">
            <div className="color-code-row">
              <input
                type="text"
                className={`color-hex-input ${bgStatus.tone === 'error' ? 'is-error' : ''}`}
                value={displayedBgHexInput}
                onChange={(event) => handleHexInputChange('bg', event.target.value)}
                onBlur={(event) => handleHexInputBlur('bg', event.target.value)}
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
  );
}

export default ColorSettingsTab;
