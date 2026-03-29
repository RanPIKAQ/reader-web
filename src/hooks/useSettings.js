import { useState, useEffect, useCallback } from 'react';
import { saveSettings, getSettings, DEFAULT_SETTINGS } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await getSettings();
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings, loading };
}
