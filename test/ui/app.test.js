// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/ui/app.js';
import { createMemoryClipRepo } from '../../src/data/memoryRepo.js';

test('UI：貼上有效網址後，狀態有 videoId，並列出該影片的片段', async () => {
  const clipRepo = createMemoryClipRepo();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'other', range: { startSec: 0, endSec: 5 } });
  const app = createApp({ clipRepo });

  await app.loadVideo('https://youtu.be/abc');

  const state = app.getState();
  assert.equal(state.videoId, 'abc');
  assert.deepEqual(state.clips, [{ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } }]);
});

test('UI：貼上無效網址時，狀態有錯誤 INVALID_URL，不載入影片', async () => {
  const app = createApp({ clipRepo: createMemoryClipRepo() });

  await app.loadVideo('https://example.com/watch?v=abc');

  const state = app.getState();
  assert.equal(state.error, 'INVALID_URL');
  assert.equal(state.videoId, null);
});

test('UI：載入成功後，清除先前的錯誤', async () => {
  const app = createApp({ clipRepo: createMemoryClipRepo() });
  await app.loadVideo('not a url');

  await app.loadVideo('https://youtu.be/abc');

  assert.equal(app.getState().error, null);
});
