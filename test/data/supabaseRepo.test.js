// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseClipRepo } from '../../src/data/supabaseRepo.js';

const URL_BASE = 'https://example.supabase.co';
const KEY = 'test-key';

/**
 * 假的 fetch：記錄每次呼叫，依序回傳事先給定的回應。
 * @param {Response[]} [responses] 沒給時回傳 201 空內容
 */
function createFakeFetch(responses = []) {
  /** @type {{ url: string, init: RequestInit }[]} */
  const calls = [];
  /** @param {string} url @param {RequestInit} init */
  async function fakeFetch(url, init) {
    calls.push({ url, init });
    return responses.shift() ?? new Response(null, { status: 201 });
  }
  return { fetch: fakeFetch, calls };
}

const clip = {
  id: 'c1',
  videoId: 'abc',
  range: { startSec: 10, endSec: 15 },
  title: '開場',
  createdBy: '小明',
  createdAt: 1764000000000,
};

test('Supabase ClipRepository：add 以 POST 送出 snake_case 的資料列，並帶金鑰標頭', async () => {
  const fake = createFakeFetch();
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.add(clip);

  assert.equal(fake.calls.length, 1);
  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/clips`);
  assert.equal(init.method, 'POST');
  assert.deepEqual(init.headers, {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  });
  assert.deepEqual(JSON.parse(String(init.body)), {
    id: 'c1',
    video_id: 'abc',
    start_sec: 10,
    end_sec: 15,
    title: '開場',
    created_by: '小明',
    created_at: 1764000000000,
  });
});

test('Supabase ClipRepository：listByVideo 以 GET 依 seq 排序查詢，並把資料列轉回 Clip', async () => {
  const row = {
    id: 'c1', video_id: 'abc', start_sec: 10, end_sec: 15,
    title: '開場', created_by: '小明', created_at: 1764000000000, seq: 1,
  };
  const fake = createFakeFetch([new Response(JSON.stringify([row]), { status: 200 })]);
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  const clips = await repo.listByVideo('abc');

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/clips?video_id=eq.abc&order=seq.asc`);
  assert.equal(init.method, 'GET');
  assert.deepEqual(clips, [clip]);
});
