// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAuth } from '../../src/auth/supabaseAuth.js';

const URL_BASE = 'https://example.supabase.co';
const KEY = 'test-key';

/**
 * 假的 fetch：記錄每次呼叫，依序回傳事先給定的回應。
 * @param {Response[]} responses
 */
function createFakeFetch(responses) {
  /** @type {{ url: string, init: RequestInit }[]} */
  const calls = [];
  /** @param {string} url @param {RequestInit} init */
  async function fakeFetch(url, init) {
    calls.push({ url, init });
    return /** @type {Response} */ (responses.shift());
  }
  return { fetch: fakeFetch, calls };
}

/** Supabase Auth 成功時回傳的內容（只列出用到的欄位） */
const sessionBody = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  expires_at: 1764003600,
  user: { id: 'user-1', email: 'a@example.com', user_metadata: { display_name: '小明' } },
};

/** 轉換後的工作階段 */
const session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAt: 1764003600000,
  user: { id: 'user-1', displayName: '小明' },
};

test('auth.signUp：POST /auth/v1/signup，帶顯示名稱，回傳工作階段', async () => {
  const fake = createFakeFetch([new Response(JSON.stringify(sessionBody), { status: 200 })]);
  const auth = createSupabaseAuth({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  const result = await auth.signUp({ email: 'a@example.com', password: 'secret123', displayName: '小明' });

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/auth/v1/signup`);
  assert.equal(init.method, 'POST');
  assert.equal(/** @type {Record<string, string>} */ (init.headers).apikey, KEY);
  assert.deepEqual(JSON.parse(String(init.body)), {
    email: 'a@example.com',
    password: 'secret123',
    data: { display_name: '小明' },
  });
  assert.deepEqual(result, session);
});
