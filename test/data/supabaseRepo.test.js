// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseClipRepo, createSupabaseCommentRepo } from '../../src/data/supabaseRepo.js';

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
  userId: 'user-1',
};

test('Supabase ClipRepository：add 以 POST 送出 snake_case 的資料列，金鑰只放在 apikey 標頭', async () => {
  const fake = createFakeFetch();
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.add(clip);

  assert.equal(fake.calls.length, 1);
  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/clips`);
  assert.equal(init.method, 'POST');
  // 新式的 publishable key 不是 JWT，不可放在 Authorization（該標頭保留給登入使用者的權杖）
  assert.deepEqual(init.headers, {
    apikey: KEY,
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
    user_id: 'user-1',
  });
});

test('Supabase ClipRepository：listByVideo 以 GET 依 seq 排序查詢，並把資料列轉回 Clip', async () => {
  const row = {
    id: 'c1', video_id: 'abc', start_sec: 10, end_sec: 15,
    title: '開場', created_by: '小明', created_at: 1764000000000, user_id: 'user-1', seq: 1,
  };
  const fake = createFakeFetch([new Response(JSON.stringify([row]), { status: 200 })]);
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  const clips = await repo.listByVideo('abc');

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/clips?video_id=eq.abc&set_id=is.null&order=seq.asc`);
  assert.equal(init.method, 'GET');
  assert.deepEqual(clips, [clip]);
});

test('Supabase ClipRepository：remove 以 DELETE 刪除指定 id 的資料列', async () => {
  const fake = createFakeFetch([new Response(null, { status: 204 })]);
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.remove('c1');

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/clips?id=eq.c1`);
  assert.equal(init.method, 'DELETE');
});

const comment = { id: 'm1', clipId: 'c1', body: '第一則', createdBy: '小明', createdAt: 1764000000000, userId: 'user-1' };

test('Supabase CommentRepository：add 以 POST 送出 snake_case 的資料列', async () => {
  const fake = createFakeFetch();
  const repo = createSupabaseCommentRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.add(comment);

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/comments`);
  assert.equal(init.method, 'POST');
  assert.equal(/** @type {Record<string, string>} */ (init.headers).apikey, KEY);
  assert.deepEqual(JSON.parse(String(init.body)), {
    id: 'm1', clip_id: 'c1', body: '第一則', created_by: '小明', created_at: 1764000000000, user_id: 'user-1',
  });
});

test('Supabase CommentRepository：listByClip 以 GET 依 seq 排序查詢，並把資料列轉回 Comment', async () => {
  const row = { id: 'm1', clip_id: 'c1', body: '第一則', created_by: '小明', created_at: 1764000000000, user_id: 'user-1', seq: 7 };
  const fake = createFakeFetch([new Response(JSON.stringify([row]), { status: 200 })]);
  const repo = createSupabaseCommentRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  const comments = await repo.listByClip('c1');

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/comments?clip_id=eq.c1&order=seq.asc`);
  assert.equal(init.method, 'GET');
  assert.deepEqual(comments, [comment]);
});

test('Supabase CommentRepository：remove 以 DELETE 刪除指定 id 的資料列', async () => {
  const fake = createFakeFetch([new Response(null, { status: 204 })]);
  const repo = createSupabaseCommentRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.remove('m1');

  const { url, init } = fake.calls[0];
  assert.equal(url, `${URL_BASE}/rest/v1/comments?id=eq.m1`);
  assert.equal(init.method, 'DELETE');
});

test('Supabase Repository：查詢參數中的 id 經過 URL 編碼', async () => {
  const fake = createFakeFetch([new Response('[]', { status: 200 })]);
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.listByVideo('a&b=c');

  assert.equal(fake.calls[0].url, `${URL_BASE}/rest/v1/clips?video_id=eq.a%26b%3Dc&set_id=is.null&order=seq.asc`);
});

test('Supabase Repository：伺服器回應失敗（非 2xx）時拋出錯誤，訊息包含狀態碼', async () => {
  const fake = createFakeFetch([new Response('{"message":"permission denied"}', { status: 401 })]);
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await assert.rejects(repo.add(clip), /401/);
});

test('Supabase Repository：有 access token 時，在 Authorization 標頭帶 Bearer token', async () => {
  const fake = createFakeFetch([new Response('[]', { status: 200 })]);
  const repo = createSupabaseClipRepo({
    url: URL_BASE, key: KEY, fetch: fake.fetch, getAccessToken: async () => 'user-access-token',
  });

  await repo.listByVideo('abc');

  assert.deepEqual(fake.calls[0].init.headers, {
    apikey: KEY,
    'Content-Type': 'application/json',
    Authorization: 'Bearer user-access-token',
  });
});

test('Supabase ClipRepository：listByVideo 依討論串組篩選；setId 為 null 時篩出 set_id 為 null 的片段', async () => {
  const fake = createFakeFetch([new Response('[]', { status: 200 }), new Response('[]', { status: 200 })]);
  const repo = createSupabaseClipRepo({ url: URL_BASE, key: KEY, fetch: fake.fetch });

  await repo.listByVideo('abc', 's1');
  await repo.listByVideo('abc', null);

  assert.equal(fake.calls[0].url, `${URL_BASE}/rest/v1/clips?video_id=eq.abc&set_id=eq.s1&order=seq.asc`);
  assert.equal(fake.calls[1].url, `${URL_BASE}/rest/v1/clips?video_id=eq.abc&set_id=is.null&order=seq.asc`);
});
