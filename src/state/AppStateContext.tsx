import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SETTINGS_STORAGE_KEY = 'mlp_to_clickup_settings';

export type AppSettings = {
  clickUpWorkspaceId: string;
  defaultListId: string;
  dryRun: boolean;
};

export type WizardStep = 'source' | 'mapping' | 'review' | 'execute';

type AppState = {
  settings: AppSettings;
  updateSettings: (next: Partial<AppSettings>) => void;
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
};

const defaultSettings: AppSettings = {
  clickUpWorkspaceId: '',
  defaultListId: '',
  dryRun: true
};

const AppStateContext = createContext<AppState | null>(null);

function loadInitialSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...(JSON.parse(raw) as Partial<AppSettings>)
    };
  } catch {
    return defaultSettings;
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadInitialSettings());
  const [wizardStep, setWizardStep] = useState<WizardStep>('source');

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (next: Partial<AppSettings>) => {
        setSettings((current) => ({ ...current, ...next }));
      },
      wizardStep,
      setWizardStep
    }),
    [settings, wizardStep]
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}
