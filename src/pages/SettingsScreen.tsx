import { FormEvent, useMemo, useState } from 'react';
import { SettingsService } from '../settings-service.js';
import { useAppState } from '../state/AppStateContext';

const TOKEN_STORAGE_KEY = 'mlp_to_clickup_clickup_token';

const localTokenStore = {
  async saveToken(token: string) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  async readToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  async clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export function SettingsScreen() {
  const { settings, updateSettings } = useAppState();
  const [tokenDraft, setTokenDraft] = useState(settings.clickUpToken);
  const [statusMessage, setStatusMessage] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const settingsService = useMemo(() => new SettingsService(localTokenStore), []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsValidating(true);
    setStatusMessage('Validating token...');

    const result = await settingsService.setTokenAndValidate(tokenDraft.trim());
    if (!result.ok) {
      setStatusMessage(`Token validation failed: ${result.reason}`);
      setIsValidating(false);
      return;
    }

    updateSettings({ clickUpToken: tokenDraft.trim() });
    setStatusMessage(`Connected as ${result.user.username ?? result.user.email ?? 'ClickUp user'}.`);
    setIsValidating(false);
  };

  return (
    <section>
      <h2>Settings</h2>
      <p>Persisted local configuration for ClickUp access and run defaults.</p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          ClickUp API Token
          <input
            type="password"
            placeholder="pk_..."
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
          />
        </label>
        <button type="submit" disabled={isValidating || !tokenDraft.trim()}>
          {isValidating ? 'Validating...' : 'Validate & Save Token'}
        </button>
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
      {statusMessage ? <p>{statusMessage}</p> : null}
    </section>
  );
}
