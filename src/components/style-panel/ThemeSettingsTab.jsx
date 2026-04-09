function ThemeSettingsTab({ settings, onThemeChange }) {
  return (
    <div className="settings-group">
      <div className="theme-options">
        <button
          type="button"
          className={`theme-btn theme-day ${settings.theme === 'day' ? 'active' : ''}`}
          onClick={() => onThemeChange('day')}
        >
          <span className="theme-preview day-preview" />
          <span>白天</span>
        </button>
        <button
          type="button"
          className={`theme-btn theme-night ${settings.theme === 'night' ? 'active' : ''}`}
          onClick={() => onThemeChange('night')}
        >
          <span className="theme-preview night-preview" />
          <span>夜间</span>
        </button>
        <button
          type="button"
          className={`theme-btn theme-sepia ${settings.theme === 'sepia' ? 'active' : ''}`}
          onClick={() => onThemeChange('sepia')}
        >
          <span className="theme-preview sepia-preview" />
          <span>护眼</span>
        </button>
      </div>
    </div>
  );
}

export default ThemeSettingsTab;
