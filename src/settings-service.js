import { ClickUpClient } from './clickup-client.js';

export class SettingsService {
  constructor(tokenStore) { this.tokenStore = tokenStore; }

  async setTokenAndValidate(token) {
    const client = new ClickUpClient({ token });
    try {
      const userResponse = await client.getUser();
      await this.tokenStore.saveToken(token);
      return { ok: true, user: userResponse.user };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Failed to validate ClickUp token' };
    }
  }

  async getToken() { return this.tokenStore.readToken(); }
  async clearToken() { await this.tokenStore.clearToken(); }
}
