import test from 'node:test';
import assert from 'node:assert/strict';
import { ClickUpClient } from '../src/clickup-client.js';
import { CreationPipelineService } from '../src/creation-pipeline.js';
import { SecureTokenStore } from '../src/secure-token-store.js';

test('ClickUpClient retries on 429 and eventually succeeds', async () => {
  let callCount = 0;
  const client = new ClickUpClient({
    token: 'token',
    maxRetries: 2,
    retryBaseDelayMs: 1,
    fetchImpl: async () => {
      callCount += 1;
      if (callCount < 2) {
        return new Response(JSON.stringify({ err: 'rate limit' }), { status: 429, headers: { 'retry-after': '0' } });
      }
      return new Response(JSON.stringify({ user: { id: 'u1', username: 'demo' } }), { status: 200 });
    },
  });

  const user = await client.getUser();
  assert.equal(user.user.id, 'u1');
  assert.equal(callCount, 2);
});

test('SecureTokenStore falls back to encrypted local storage', async () => {
  const local = new Map();
  const store = new SecureTokenStore(
    {
      async setPassword() { throw new Error('no keychain'); },
      async getPassword() { throw new Error('no keychain'); },
      async deletePassword() {},
    },
    {
      async set(key, value) { local.set(key, value); },
      async get(key) { return local.get(key) ?? null; },
      async delete(key) { local.delete(key); },
    },
  );

  await store.saveToken('abc123');
  assert.ok(local.has('encrypted_clickup_token'));
  const token = await store.readToken();
  assert.equal(token, 'abc123');
});

test('CreationPipelineService preflight reports unresolved media types', async () => {
  const service = new CreationPipelineService({
    async getListCustomFields() {
      return [{
        id: 'field-1',
        name: 'Media Type',
        type: 'drop_down',
        type_config: { options: [{ id: 'o1', name: 'Video' }, { id: 'o2', name: 'Audio' }] },
      }];
    },
  });

  const result = await service.preflight('list-1', [
    { videoNumber: '1', lectureName: 'Intro', mediaType: 'VIDEO' },
    { videoNumber: '2', lectureName: 'Lab', mediaType: 'Animation' },
  ]);

  assert.equal(result.canProceed, false);
  assert.equal(result.unresolvedMediaTypes.length, 1);
  assert.equal(result.unresolvedMediaTypes[0].inputValue, 'Animation');
});
