import { useState, useEffect, useCallback, useRef } from 'react';
import { saveSettings, getSettings, DEFAULT_SETTINGS } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await getSettings();
      if (saved) {
        const nextSettings = { ...DEFAULT_SETTINGS, ...saved };
        settingsRef.current = nextSettings;
        setSettings(nextSettings);
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const updateSettings = useCallback(async (newSettings) => {
    const nextSettings = { ...settingsRef.current, ...newSettings };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    await saveSettings(nextSettings);
  }, []);

  const resetSettings = useCallback(async () => {
    settingsRef.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings, loading };
}
