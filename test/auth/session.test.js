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
