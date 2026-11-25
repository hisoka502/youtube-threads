// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/ui/app.js';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../../src/data/memoryRepo.js';
import { createClipService } from '../../src/clip/clipService.js';
import { createFakeVideoInfo } from '../../src/video/fakeVideoInfo.js';
import { createFakePlayer } from '../../src/player/fakePlayer.js';

/** 測試用的固定時間（毫秒） */
const NOW = 1764000000000;

function setup() {
  const clipRepo = createMemoryClipRepo();
  const commentRepo = createMemoryCommentRepo();
  const videoInfo = createFakeVideoInfo({ abc: 120, xyz: 60 });
  let n = 0;
  const newId = () => `id-${++n}`;
  const clipService = createClipService({ clipRepo, commentRepo, videoInfo, newId, now: () => NOW });
  const player = createFakePlayer();
  const app = createApp({ clipRepo, commentRepo, clipService, player, newId });
  app.setUserName('小明');
  return { app, clipRepo, commentRepo, player };
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
    { id: 'id-1', videoId: 'abc', range: { startSec: 10, endSec: 20 }, title: '', createdBy: undefined, createdAt: NOW },
  ]);
});

test('UI：建立片段時時間格式錯誤，狀態有錯誤 INVALID_TIMECODE，不建立', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc');

  await app.createClip({ start: '02:15', end: '2:20' });

  const state = app.getState();
  assert.equal(state.error, 'INVALID_TIMECODE');
  assert.deepEqual(state.clips, []);
});

test('UI：ClipService 回報錯誤時，狀態有該錯誤，不建立', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc');

  await app.createClip({ start: '1:50', end: '2:30' });

  const state = app.getState();
  assert.equal(state.error, 'INVALID_RANGE');
  assert.deepEqual(state.clips, []);
});

test('UI：建立片段成功後，清除先前的錯誤', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc');
  await app.createClip({ start: '02:15', end: '2:20' });

  await app.createClip({ start: '0:10', end: '0:20' });

  assert.equal(app.getState().error, null);
});

test('UI：建立片段時結束時間留空，補為開始 + 5 秒', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc');

  await app.createClip({ start: '0:10', end: '' });

  const state = app.getState();
  assert.equal(state.error, null);
  assert.deepEqual(state.clips.map((c) => c.range), [{ startSec: 10, endSec: 15 }]);
});

test('UI：尚未載入影片時建立片段，狀態有錯誤 NO_VIDEO，不建立', async () => {
  const { app } = setup();

  await app.createClip({ start: '0:10', end: '0:20' });

  assert.equal(app.getState().error, 'NO_VIDEO');
});

test('UI：點片段時，以 playRange 從開始時間播放，播到結束時間自動暫停', async () => {
  const { app, clipRepo, player } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc');

  app.playClip('c1');

  assert.equal(player.getCurrentTime(), 10);
  assert.equal(player.isPlaying(), true);
  player.advance(6);
  assert.equal(player.isPlaying(), false);
  assert.equal(player.getCurrentTime(), 15);
});

test('UI：點的片段不在目前片段列表時，什麼都不做', async () => {
  const { app, player } = setup();
  await app.loadVideo('https://youtu.be/abc');
  const before = app.getState();

  app.playClip('missing');

  assert.equal(player.isPlaying(), false);
  assert.equal(player.getCurrentTime(), 0);
  assert.equal(app.getState(), before);
});

test('UI：選取片段後，列出該討論串的留言', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await commentRepo.add({ id: 'm2', clipId: 'other', body: '別的討論串' });
  await app.loadVideo('https://youtu.be/abc');

  await app.selectClip('c1');

  const state = app.getState();
  assert.equal(state.selectedClipId, 'c1');
  assert.deepEqual(state.comments, [{ id: 'm1', clipId: 'c1', body: '第一則' }]);
});

test('UI：在選取的討論串新增留言，留言列表多一筆', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc');
  await app.selectClip('c1');

  await app.addComment('第二則');

  assert.deepEqual(app.getState().comments, [
    { id: 'm1', clipId: 'c1', body: '第一則' },
    { id: 'id-1', clipId: 'c1', body: '第二則' },
  ]);
});

test('UI：刪除片段後，從片段列表移除', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'abc', range: { startSec: 20, endSec: 25 } });
  await app.loadVideo('https://youtu.be/abc');

  await app.deleteClip('c1');

  assert.deepEqual(app.getState().clips.map((c) => c.id), ['c2']);
});

test('UI：刪除留言後，從留言列表移除', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await commentRepo.add({ id: 'm2', clipId: 'c1', body: '第二則' });
  await app.loadVideo('https://youtu.be/abc');
  await app.selectClip('c1');

  await app.deleteComment('m1');

  assert.deepEqual(app.getState().comments.map((m) => m.id), ['m2']);
});

test('UI：載入另一部影片後，清掉不屬於該影片的討論串，列出該影片的片段', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'xyz', range: { startSec: 0, endSec: 5 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc');
  await app.selectClip('c1');

  await app.loadVideo('https://youtu.be/xyz');

  const state = app.getState();
  assert.deepEqual(state.clips.map((c) => c.id), ['c2']);
  assert.equal(state.selectedClipId, null);
  assert.deepEqual(state.comments, []);
});

test('UI：重新載入同一部影片時，保留選取的討論串', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc');
  await app.selectClip('c1');

  await app.loadVideo('https://www.youtube.com/watch?v=abc');

  const state = app.getState();
  assert.equal(state.selectedClipId, 'c1');
  assert.deepEqual(state.comments.map((m) => m.id), ['m1']);
});

test('UI：刪除目前選取的片段後，清除選取與留言列表', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc');
  await app.selectClip('c1');

  await app.deleteClip('c1');

  const state = app.getState();
  assert.equal(state.selectedClipId, null);
  assert.deepEqual(state.comments, []);
});

test('UI：尚未開啟討論串時新增留言，狀態有錯誤 NO_CLIP，不存入', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc');

  await app.addComment('沒有討論串');

  const state = app.getState();
  assert.equal(state.error, 'NO_CLIP');
  assert.deepEqual(state.comments, []);
  assert.deepEqual(await commentRepo.listByClip(/** @type {any} */ (null)), []);
});

test('UI：新增留言成功後，清除先前的錯誤', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc');
  await app.addComment('沒有討論串');
  await app.selectClip('c1');

  await app.addComment('第一則');

  assert.equal(app.getState().error, null);
});

test('UI：開啟討論串後，清除先前的錯誤', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc');
  await app.addComment('沒有討論串');

  await app.selectClip('c1');

  assert.equal(app.getState().error, null);
});

test('UI：載入影片成功時，播放器載入該影片', async () => {
  const { app, player } = setup();

  await app.loadVideo('https://youtu.be/abc');

  assert.equal(player.getLoadedVideoId(), 'abc');
});

test('UI：貼上無效網址時，播放器不載入影片', async () => {
  const { app, player } = setup();
  await app.loadVideo('https://youtu.be/abc');

  await app.loadVideo('not a url');

  assert.equal(player.getLoadedVideoId(), 'abc');
});

test('UI：播放片段時，討論串自動換成該片段的', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'abc', range: { startSec: 20, endSec: 25 } });
  await commentRepo.add({ id: 'm2', clipId: 'c2', body: 'c2 的留言' });
  await app.loadVideo('https://youtu.be/abc');
  await app.selectClip('c1');

  await app.playClip('c2');

  const state = app.getState();
  assert.equal(state.selectedClipId, 'c2');
  assert.deepEqual(state.comments.map((m) => m.id), ['m2']);
});

test('UI：setUserName 後，狀態有去掉前後空白的名字', () => {
  const { app } = setup();

  app.setUserName('  小明 ');

  assert.equal(app.getState().userName, '小明');
});

test('UI：未填名字時建立片段，狀態有錯誤 NO_NAME，不建立', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc');
  app.setUserName('   ');

  await app.createClip({ start: '0:10', end: '0:20' });

  const state = app.getState();
  assert.equal(state.error, 'NO_NAME');
  assert.deepEqual(state.clips, []);
});
