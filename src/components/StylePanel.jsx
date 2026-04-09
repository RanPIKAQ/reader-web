import { useState } from 'react';
import './style-panel/StylePanel.css';
import ColorSettingsTab from './style-panel/ColorSettingsTab';
import FontSettingsTab from './style-panel/FontSettingsTab';
import LayoutSettingsTab from './style-panel/LayoutSettingsTab';
import ThemeSettingsTab from './style-panel/ThemeSettingsTab';
import { STYLE_PANEL_TABS } from './style-panel/constants';
import { useStylePanelColors } from './style-panel/useStylePanelColors';

function StylePanel({ settings, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('font');
  const colorController = useStylePanelColors({ settings, onUpdate });

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'theme':
        return <ThemeSettingsTab settings={settings} onThemeChange={colorController.handleThemeChange} />;
      case 'color':
        return <ColorSettingsTab settings={settings} colorController={colorController} />;
      case 'layout':
        return <LayoutSettingsTab settings={settings} onUpdate={onUpdate} />;
      case 'font':
      default:
        return <FontSettingsTab settings={settings} onUpdate={onUpdate} />;
    }
  };

  return (
    <div className="style-panel-overlay" onClick={onClose}>
      <div className="style-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h3>阅读设置</h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-tabs">
          {STYLE_PANEL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="panel-content">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}

export default StylePanel;
