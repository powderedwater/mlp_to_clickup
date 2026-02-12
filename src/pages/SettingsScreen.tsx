import { FormEvent } from 'react';
import { useAppState } from '../state/AppStateContext';

export function SettingsScreen() {
  const { settings, updateSettings } = useAppState();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section>
      <h2>Settings</h2>
      <p>Persisted local configuration for ClickUp access and run defaults.</p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          ClickUp Workspace ID
          <input
            value={settings.clickUpWorkspaceId}
            onChange={(event) =>
              updateSettings({ clickUpWorkspaceId: event.target.value })
            }
          />
        </label>
        <label>
          Default List ID
          <input
            value={settings.defaultListId}
            onChange={(event) =>
              updateSettings({ defaultListId: event.target.value })
            }
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.dryRun}
            onChange={(event) => updateSettings({ dryRun: event.target.checked })}
          />
          Run in dry-run mode
        </label>
      </form>
    </section>
  );
}
