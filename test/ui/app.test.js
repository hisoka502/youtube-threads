// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/ui/app.js';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../../src/data/memoryRepo.js';
import { createClipService } from '../../src/clip/clipService.js';
import { createFakeVideoInfo } from '../../src/video/fakeVideoInfo.js';

function setup() {
  const clipRepo = createMemoryClipRepo();
  const commentRepo = createMemoryCommentRepo();
  const videoInfo = createFakeVideoInfo({ abc: 120 });
  let n = 0;
  const newId = () => `id-${++n}`;
  const clipService = createClipService({ clipRepo, commentRepo, videoInfo, newId });
  const app = createApp({ clipRepo, clipService });
  return { app, clipRepo };
}

test('UI：貼上有效網址後，狀態有 videoId，並列出該影片的片段', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'other', range: { startSec: 0, endSec: 5 } });

  await app.loadVideo('https://youtu.be/abc');

  const state = app.getState();
  assert.equal(state.videoId, 'abc');
  assert.deepEqual(state.clips, [{ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } }]);
});

test('UI：貼上無效網址時，狀態有錯誤 INVALID_URL，不載入影片', async () => {
  const { app } = setup();

  await app.loadVideo('https://example.com/watch?v=abc');

  const state = app.getState();
  assert.equal(state.error, 'INVALID_URL');
  assert.equal(state.videoId, null);
});

test('UI：載入成功後，清除先前的錯誤', async () => {
  const { app } = setup();
  await app.loadVideo('not a url');

  await app.loadVideo('https://youtu.be/abc');

  assert.equal(app.getState().error, null);
});

test('UI：已載入影片後貼上無效網址，維持原本的影片與片段列表', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc');

  await app.loadVideo('not a url');

  const state = app.getState();
  assert.equal(state.error, 'INVALID_URL');
  assert.equal(state.videoId, 'abc');
  assert.deepEqual(state.clips.map((c) => c.id), ['c1']);
});

test('UI：輸入 timecode 建立片段，成功後片段列表多一筆', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc');

  await app.createClip({ start: '0:10', end: '0:20' });

  assert.deepEqual(app.getState().clips, [
    { id: 'id-1', videoId: 'abc', range: { startSec: 10, endSec: 20 } },
  ]);
});
