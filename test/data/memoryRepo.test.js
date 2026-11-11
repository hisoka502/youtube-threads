// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryClipRepo } from '../../src/data/memoryRepo.js';

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
