import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SETTINGS_STORAGE_KEY = 'mlp_to_clickup_settings';
const RUN_STATE_STORAGE_KEY = 'mlp_to_clickup_run_state';

export type AppSettings = {
  clickUpToken: string;
  clickUpWorkspaceId: string;
  defaultListId: string;
  dryRun: boolean;
};

export type WizardStep = 'source' | 'mapping' | 'review' | 'execute';

export type ResolvedDestination = {
  workspace: { id: string; name: string };
  space: { id: string; name: string };
  folder: { id: string; name: string };
  list: { id: string; name: string };
};

export type MediaTypeDecision = {
  action: 'map_manual' | 'skip_field';
  optionId?: string;
  optionName?: string;
};

export type RunState = {
  excelFileName: string;
  docxFileName: string;
  parsedVideos: Array<{ videoNumber: string; lectureName: string; mediaType: string }>;
  wordMetadata: {
    objective: string;
    prerequisites: string;
    outcomes: string[];
    notes: string;
  };
  destinationSelection: {
    workspaceId: string;
    spaceId: string;
    folderId: string;
  };
  validatedDestination: ResolvedDestination | null;
  preflight: {
    canProceed: boolean;
    unresolvedMediaTypes: Array<{
      inputValue: string;
      options: Array<{ id: string; name: string }>;
    }>;
  } | null;
  mediaTypeDecisions: Record<string, MediaTypeDecision>;
  lastRunResult: {
    successCount: number;
    failureCount: number;
    created: Array<{ name: string; taskId: string; url: string; type: string }>;
    errors: Array<{ stage: string; message: string; context?: Record<string, string> }>;
  } | null;
};

type AppState = {
  settings: AppSettings;
  updateSettings: (next: Partial<AppSettings>) => void;
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  runState: RunState;
  updateRunState: (next: Partial<RunState>) => void;
  resetRunState: () => void;
};

const defaultSettings: AppSettings = {
  clickUpToken: '',
  clickUpWorkspaceId: '',
  defaultListId: '',
  dryRun: true
};

const defaultRunState: RunState = {
  excelFileName: '',
  docxFileName: '',
  parsedVideos: [],
  wordMetadata: {
    objective: '',
    prerequisites: '',
    outcomes: [],
    notes: ''
  },
  destinationSelection: {
    workspaceId: '',
    spaceId: '',
    folderId: ''
  },
  validatedDestination: null,
  preflight: null,
  mediaTypeDecisions: {},
  lastRunResult: null
};

const AppStateContext = createContext<AppState | null>(null);

function readStorageJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return {
      ...fallback,
      ...(JSON.parse(raw) as Partial<T>)
    };
  } catch {
    return fallback;
  }
}

function loadInitialSettings(): AppSettings {
  return readStorageJson(SETTINGS_STORAGE_KEY, defaultSettings);
}

function loadInitialRunState(): RunState {
  const state = readStorageJson(RUN_STATE_STORAGE_KEY, defaultRunState);
  return {
    ...defaultRunState,
    ...state,
    wordMetadata: { ...defaultRunState.wordMetadata, ...state.wordMetadata },
    destinationSelection: { ...defaultRunState.destinationSelection, ...state.destinationSelection }
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadInitialSettings());
  const [wizardStep, setWizardStep] = useState<WizardStep>('source');
  const [runState, setRunState] = useState<RunState>(() => loadInitialRunState());

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(RUN_STATE_STORAGE_KEY, JSON.stringify(runState));
  }, [runState]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (next: Partial<AppSettings>) => {
        setSettings((current) => ({ ...current, ...next }));
      },
      wizardStep,
      setWizardStep,
      runState,
      updateRunState: (next: Partial<RunState>) => {
        setRunState((current) => ({ ...current, ...next }));
      },
      resetRunState: () => {
        setRunState(defaultRunState);
        setWizardStep('source');
      }
    }),
    [settings, wizardStep, runState]
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
