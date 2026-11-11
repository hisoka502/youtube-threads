// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../../src/data/memoryRepo.js';

/**
 * @param {string} id
 * @param {string} videoId
 * @returns {import('../../src/types.js').Clip}
 */
const clip = (id, videoId) => ({ id, videoId, range: { startSec: 10, endSec: 15 } });

test('ClipRepo：新增片段後可依 videoId 列出', async () => {
  const repo = createMemoryClipRepo();
  await repo.add(clip('c1', 'v1'));
  assert.deepEqual(await repo.listByVideo('v1'), [clip('c1', 'v1')]);
});

test('ClipRepo：只列出指定 videoId 的片段', async () => {
  const repo = createMemoryClipRepo();
  await repo.add(clip('c1', 'v1'));
  await repo.add(clip('c2', 'v2'));
  assert.deepEqual(
    (await repo.listByVideo('v1')).map((c) => c.id),
    ['c1'],
  );
});

test('ClipRepo：刪除片段後不再列出', async () => {
  const repo = createMemoryClipRepo();
  await repo.add(clip('c1', 'v1'));
  await repo.add(clip('c2', 'v1'));
  await repo.remove('c1');
  assert.deepEqual(
    (await repo.listByVideo('v1')).map((c) => c.id),
    ['c2'],
  );
});

/**
 * @param {string} id
 * @param {string} clipId
 * @returns {import('../../src/types.js').Comment}
 */
const comment = (id, clipId) => ({ id, clipId, body: `留言 ${id}` });

test('CommentRepo：新增留言後可依 clipId 列出', async () => {
  const repo = createMemoryCommentRepo();
  await repo.add(comment('m1', 'c1'));
  await repo.add(comment('m2', 'c2'));
  assert.deepEqual(await repo.listByClip('c1'), [comment('m1', 'c1')]);
});

test('CommentRepo：留言依建立順序排列（線性討論串）', async () => {
  const repo = createMemoryCommentRepo();
  await repo.add(comment('m1', 'c1'));
  await repo.add(comment('m2', 'c1'));
  await repo.add(comment('m3', 'c1'));
  assert.deepEqual(
    (await repo.listByClip('c1')).map((c) => c.id),
    ['m1', 'm2', 'm3'],
  );
});
