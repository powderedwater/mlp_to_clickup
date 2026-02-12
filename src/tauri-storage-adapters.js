export class TauriKeychainProvider {
  constructor(invoke) { this.invoke = invoke; }
  async setPassword(service, account, password) {
    await this.invoke('plugin:keychain|set_password', { service, account, password });
  }
  async getPassword(service, account) {
    return this.invoke('plugin:keychain|get_password', { service, account });
  }
  async deletePassword(service, account) {
    await this.invoke('plugin:keychain|delete_password', { service, account });
  }
}

export class TauriStoreProvider {
  constructor(invoke) { this.invoke = invoke; }
  async set(key, value) { await this.invoke('plugin:store|set', { key, value }); }
  async get(key) { return this.invoke('plugin:store|get', { key }); }
  async delete(key) { await this.invoke('plugin:store|delete', { key }); }
}
