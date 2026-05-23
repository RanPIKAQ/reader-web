import { useState, useEffect, useCallback, useRef } from 'react';
import { saveSettings, getSettings, DEFAULT_SETTINGS } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await getSettings();
        if (saved) {
          const nextSettings = { ...DEFAULT_SETTINGS, ...saved };
          settingsRef.current = nextSettings;
          setSettings(nextSettings);
        }
      } catch {
        // IndexedDB 读取失败时静默回退到默认设置
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const writeQueueRef = useRef(Promise.resolve());

  const updateSettings = useCallback((newSettings) => {
    const nextSettings = { ...settingsRef.current, ...newSettings };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    writeQueueRef.current = writeQueueRef.current
      .then(() => saveSettings(nextSettings))
      .catch(() => {});
  }, []);

  const resetSettings = useCallback(() => {
    settingsRef.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);

    writeQueueRef.current = writeQueueRef.current
      .then(() => saveSettings(DEFAULT_SETTINGS))
      .catch(() => {});
  }, []);

  return { settings, updateSettings, resetSettings, loading };
}
