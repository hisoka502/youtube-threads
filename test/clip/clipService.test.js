// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClipService } from '../../src/clip/clipService.js';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../../src/data/memoryRepo.js';
import { createFakeVideoInfo } from '../../src/video/fakeVideoInfo.js';

function setup() {
  const clipRepo = createMemoryClipRepo();
  const commentRepo = createMemoryCommentRepo();
  const videoInfo = createFakeVideoInfo({ v1: 120 });
  let n = 0;
  const newId = () => `id-${++n}`;
  const service = createClipService({ clipRepo, commentRepo, videoInfo, newId });
  return { service, clipRepo, commentRepo };
}

test('ClipService：建立片段時補齊 endSec，並存入 Repository', async () => {
  const { service, clipRepo } = setup();

  const result = await service.createClip({ videoId: 'v1', startSec: 10 });

  const expected = { id: 'id-1', videoId: 'v1', range: { startSec: 10, endSec: 15 } };
  assert.deepEqual(result, { ok: true, clip: expected });
  assert.deepEqual(await clipRepo.listByVideo('v1'), [expected]);
});

test('ClipService：區間不合法時不存入，並回報 INVALID_RANGE', async () => {
  const { service, clipRepo } = setup();

  const result = await service.createClip({ videoId: 'v1', startSec: 100, endSec: 130 });

  assert.deepEqual(result, { ok: false, error: 'INVALID_RANGE' });
  assert.deepEqual(await clipRepo.listByVideo('v1'), []);
});

test('ClipService：刪除片段時，一併刪除該片段討論串的留言', async () => {
  const { service, clipRepo, commentRepo } = setup();
  await service.createClip({ videoId: 'v1', startSec: 10 }); // id-1
  await service.createClip({ videoId: 'v1', startSec: 20 }); // id-2
  await commentRepo.add({ id: 'm1', clipId: 'id-1', body: 'a' });
  await commentRepo.add({ id: 'm2', clipId: 'id-1', body: 'b' });
  await commentRepo.add({ id: 'm3', clipId: 'id-2', body: 'c' });

  await service.deleteClip('id-1');

  assert.deepEqual((await clipRepo.listByVideo('v1')).map((c) => c.id), ['id-2']);
  assert.deepEqual(await commentRepo.listByClip('id-1'), []);
  assert.deepEqual((await commentRepo.listByClip('id-2')).map((c) => c.id), ['m3']);
});

test('ClipService：找不到影片時不存入，並回報 VIDEO_NOT_FOUND', async () => {
  const { service, clipRepo } = setup();

  const result = await service.createClip({ videoId: 'nope', startSec: 10 });

  assert.deepEqual(result, { ok: false, error: 'VIDEO_NOT_FOUND' });
  assert.deepEqual(await clipRepo.listByVideo('nope'), []);
});
