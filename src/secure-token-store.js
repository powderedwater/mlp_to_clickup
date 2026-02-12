import { webcrypto } from 'node:crypto';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class SecureTokenStore {
  constructor(keychain, fallbackStore, serviceName = 'mlp_to_clickup') {
    this.keychain = keychain;
    this.fallbackStore = fallbackStore;
    this.serviceName = serviceName;
  }

  async saveToken(token) {
    try {
      await this.keychain.setPassword(this.serviceName, 'clickup_token', token);
      await this.fallbackStore.delete('encrypted_clickup_token');
      return;
    } catch {
      const encrypted = await encrypt(token, this.serviceName);
      await this.fallbackStore.set('encrypted_clickup_token', JSON.stringify(encrypted));
    }
  }

  async readToken() {
    try {
      const token = await this.keychain.getPassword(this.serviceName, 'clickup_token');
      if (token) return token;
    } catch {
      // ignore and fallback
    }

    const payload = await this.fallbackStore.get('encrypted_clickup_token');
    if (!payload) return null;

    return decrypt(JSON.parse(payload), this.serviceName);
  }

  async clearToken() {
    await Promise.allSettled([
      this.keychain.deletePassword(this.serviceName, 'clickup_token'),
      this.fallbackStore.delete('encrypted_clickup_token'),
    ]);
  }
}

async function deriveKey(context) {
  const hash = await webcrypto.subtle.digest('SHA-256', encoder.encode(context));
  return webcrypto.subtle.importKey('raw', hash, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encrypt(text, context) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(context);
  const cipher = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return { iv: Buffer.from(iv).toString('base64'), cipherText: Buffer.from(cipher).toString('base64') };
}

async function decrypt(payload, context) {
  const key = await deriveKey(context);
  const iv = Uint8Array.from(Buffer.from(payload.iv, 'base64'));
  const cipherText = Buffer.from(payload.cipherText, 'base64');
  const plain = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherText);
  return decoder.decode(plain);
}
