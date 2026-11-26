// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionManager } from '../../src/auth/session.js';

const NOW = 1764000000000;

/** 記憶體版的工作階段存放處 */
function createMemoryStorage() {
  /** @type {import('../../src/types.js').Session | null} */
  let saved = null;
  return {
    load: () => saved,
    /** @param {import('../../src/types.js').Session | null} session */
    save: (session) => { saved = session; },
  };
}

/** @param {number} expiresAt */
function sessionExpiringAt(expiresAt) {
  return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt, user: { id: 'user-1', displayName: '小明' } };
}

test('工作階段：沒有登入時 access token 為 null；登入後回傳目前的 access token', async () => {
  const auth = { refresh: async () => { throw new Error('不應呼叫'); } };
  const sessions = createSessionManager({ auth, storage: createMemoryStorage(), now: () => NOW });
  assert.equal(await sessions.getAccessToken(), null);

  sessions.set(sessionExpiringAt(NOW + 3600_000));

  assert.equal(await sessions.getAccessToken(), 'access-1');
});

test('工作階段：access token 離到期不到一分鐘時，先換新的再回傳，並保存新的工作階段', async () => {
  const fresh = { accessToken: 'access-2', refreshToken: 'refresh-2', expiresAt: NOW + 3600_000, user: { id: 'user-1', displayName: '小明' } };
  /** @type {string[]} */
  const refreshedWith = [];
  const auth = { refresh: async (/** @type {string} */ token) => { refreshedWith.push(token); return fresh; } };
  const storage = createMemoryStorage();
  const sessions = createSessionManager({ auth, storage, now: () => NOW });
  sessions.set(sessionExpiringAt(NOW + 30_000));

  assert.equal(await sessions.getAccessToken(), 'access-2');
  assert.deepEqual(refreshedWith, ['refresh-1']);
  assert.deepEqual(storage.load(), fresh);
});
