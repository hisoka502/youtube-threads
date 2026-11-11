// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClipService } from '../../src/clip/clipService.js';
import { createMemoryClipRepo } from '../../src/data/memoryRepo.js';
import { createFakeVideoInfo } from '../../src/video/fakeVideoInfo.js';

function setup() {
  const clipRepo = createMemoryClipRepo();
  const videoInfo = createFakeVideoInfo({ v1: 120 });
  let n = 0;
  const newId = () => `id-${++n}`;
  const service = createClipService({ clipRepo, videoInfo, newId });
  return { service, clipRepo };
}

test('ClipService：建立片段時補齊 endSec，並存入 Repository', async () => {
  const { service, clipRepo } = setup();

  const result = await service.createClip({ videoId: 'v1', startSec: 10 });

  const expected = { id: 'id-1', videoId: 'v1', range: { startSec: 10, endSec: 15 } };
  assert.deepEqual(result, { ok: true, clip: expected });
  assert.deepEqual(await clipRepo.listByVideo('v1'), [expected]);
});
