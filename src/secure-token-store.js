const encoder = new TextEncoder();
const decoder = new TextDecoder();

let resolvedCrypto;

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
  const runtimeCrypto = await getRuntimeCrypto();
  const hash = await runtimeCrypto.subtle.digest('SHA-256', encoder.encode(context));
  return runtimeCrypto.subtle.importKey('raw', hash, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encrypt(text, context) {
  const runtimeCrypto = await getRuntimeCrypto();
  const iv = runtimeCrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(context);
  const cipher = await runtimeCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));

  return {
    iv: toBase64(iv),
    cipherText: toBase64(new Uint8Array(cipher)),
  };
}

async function decrypt(payload, context) {
  const runtimeCrypto = await getRuntimeCrypto();
  const key = await deriveKey(context);
  const iv = fromBase64(payload.iv);
  const cipherText = fromBase64(payload.cipherText);
  const plain = await runtimeCrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherText);
  return decoder.decode(plain);
}

async function getRuntimeCrypto() {
  if (resolvedCrypto) {
    return resolvedCrypto;
  }

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle) {
    resolvedCrypto = globalThis.crypto;
    return resolvedCrypto;
  }

  const nodeCrypto = await import('node:crypto');
  resolvedCrypto = nodeCrypto.webcrypto;
  return resolvedCrypto;
}

function toBase64(bytes) {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return globalThis.btoa(binary);
  }

  if (typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(bytes).toString('base64');
  }

  throw new Error('No base64 encoder available in the current runtime.');
}

function fromBase64(value) {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  if (typeof globalThis.Buffer !== 'undefined') {
    return new Uint8Array(globalThis.Buffer.from(value, 'base64'));
  }

  throw new Error('No base64 decoder available in the current runtime.');
}
