import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { feedback } from '../services/feedback';
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings,
} from '../services/settingsStorage';

interface SettingsContextValue extends Settings {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  ...DEFAULT_SETTINGS,
  setSoundEnabled: () => {},
  setHapticsEnabled: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Load once on mount; sync prefs into the feedback service.
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      feedback.setPrefs(s);
    });
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      feedback.setPrefs(next);
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setSoundEnabled: (v) => update({ soundEnabled: v }),
        setHapticsEnabled: (v) => update({ hapticsEnabled: v }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
