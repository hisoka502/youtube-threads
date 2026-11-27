// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/ui/app.js';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../../src/data/memoryRepo.js';
import { createClipService } from '../../src/clip/clipService.js';
import { createFakeVideoInfo } from '../../src/video/fakeVideoInfo.js';
import { createFakePlayer } from '../../src/player/fakePlayer.js';
import { createSessionManager } from '../../src/auth/session.js';

/** 測試用的固定時間（毫秒） */
const NOW = 1764000000000;

/**
 * 假的 Supabase Auth：任何 Email 與密碼都登入成功，使用者 id 為「user-」加上 Email 的 @ 前面部分。
 */
function createFakeAuth() {
  /** @param {string} email @param {string} displayName */
  const sessionFor = (email, displayName) => ({
    accessToken: `access-${email}`,
    refreshToken: `refresh-${email}`,
    expiresAt: NOW + 3600_000,
    user: { id: `user-${email.split('@')[0]}`, displayName },
  });
  return {
    /** @param {{ email: string, password: string }} input */
    async signIn({ email }) { return sessionFor(email, email.split('@')[0]); },
    /** @param {{ email: string, password: string, displayName: string }} input */
    async signUp({ email, displayName }) { return sessionFor(email, displayName); },
    /** @returns {Promise<import('../../src/types.js').Session>} */
    async refresh() { throw new Error('測試不應換新 token'); },
  };
}

/**
 * @param {object} [overrides] 測試時可換成會失敗的 Repository
 * @param {import('../../src/types.js').ClipRepository} [overrides.clipRepo]
 * @param {import('../../src/types.js').CommentRepository} [overrides.commentRepo]
 * @param {boolean} [overrides.signedIn] 預設 true（以「小明」登入）
 * @param {ReturnType<typeof createFakeAuth>} [overrides.auth] 測試時可換成會失敗的 auth
 */
function setup({ clipRepo = createMemoryClipRepo(), commentRepo = createMemoryCommentRepo(), signedIn = true, auth = createFakeAuth() } = {}) {
  const videoInfo = createFakeVideoInfo({ abc: 120, xyz: 60 });
  let n = 0;
  const newId = () => `id-${++n}`;
  const clipService = createClipService({ clipRepo, commentRepo, videoInfo, newId, now: () => NOW });
  const player = createFakePlayer();
  /** @type {unknown[]} */
  const logged = [];
  const logError = (/** @type {unknown} */ error) => { logged.push(error); };
  /** @type {import('../../src/types.js').Session | null} 預設以「小明」登入 */
  let savedSession = signedIn
    ? { accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 3600_000, user: { id: 'user-1', displayName: '小明' } }
    : null;
  const storage = { load: () => savedSession, save: (/** @type {any} */ s) => { savedSession = s; } };
  const sessions = createSessionManager({ auth, storage, now: () => NOW });
  let rooms = 0;
  const newRoomId = () => `room-${++rooms}`;
  const app = createApp({ clipRepo, commentRepo, clipService, player, newId, newRoomId, now: () => NOW, logError, auth, sessions });
  return { app, clipRepo, commentRepo, player, logged, auth, sessions };
}

test('UI：貼上有效網址後，狀態有 videoId，並列出該影片的片段', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'other', range: { startSec: 0, endSec: 5 } });

  await app.loadVideo('https://youtu.be/abc', { setId: null });

  const state = app.getState();
  assert.equal(state.videoId, 'abc');
  assert.deepEqual(state.clips, [{ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } }]);
});

test('UI：貼上無效網址時，狀態有錯誤 INVALID_URL，不載入影片', async () => {
  const { app } = setup();

  await app.loadVideo('https://example.com/watch?v=abc', { setId: null });

  const state = app.getState();
  assert.equal(state.error, 'INVALID_URL');
  assert.equal(state.videoId, null);
});

test('UI：載入成功後，清除先前的錯誤', async () => {
  const { app } = setup();
  await app.loadVideo('not a url', { setId: null });

  await app.loadVideo('https://youtu.be/abc', { setId: null });

  assert.equal(app.getState().error, null);
});

test('UI：已載入影片後貼上無效網址，維持原本的影片與片段列表', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.loadVideo('not a url', { setId: null });

  const state = app.getState();
  assert.equal(state.error, 'INVALID_URL');
  assert.equal(state.videoId, 'abc');
  assert.deepEqual(state.clips.map((c) => c.id), ['c1']);
});

test('UI：輸入 timecode 建立片段，成功後片段列表多一筆', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.createClip({ start: '0:10', end: '0:20' });

  assert.deepEqual(app.getState().clips, [
    { id: 'id-1', videoId: 'abc', range: { startSec: 10, endSec: 20 }, title: '', createdBy: '小明', createdAt: NOW, userId: 'user-1', setId: null },
  ]);
});

test('UI：建立片段時時間格式錯誤，狀態有錯誤 INVALID_TIMECODE，不建立', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.createClip({ start: '02:15', end: '2:20' });

  const state = app.getState();
  assert.equal(state.error, 'INVALID_TIMECODE');
  assert.deepEqual(state.clips, []);
});

test('UI：ClipService 回報錯誤時，狀態有該錯誤，不建立', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.createClip({ start: '1:50', end: '2:30' });

  const state = app.getState();
  assert.equal(state.error, 'INVALID_RANGE');
  assert.deepEqual(state.clips, []);
});

test('UI：建立片段成功後，清除先前的錯誤', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.createClip({ start: '02:15', end: '2:20' });

  await app.createClip({ start: '0:10', end: '0:20' });

  assert.equal(app.getState().error, null);
});

test('UI：建立片段時結束時間留空，補為開始 + 5 秒', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });

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
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  app.playClip('c1');

  assert.equal(player.getCurrentTime(), 10);
  assert.equal(player.isPlaying(), true);
  player.advance(6);
  assert.equal(player.isPlaying(), false);
  assert.equal(player.getCurrentTime(), 15);
});

test('UI：點的片段不在目前片段列表時，什麼都不做', async () => {
  const { app, player } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });
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
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.selectClip('c1');

  const state = app.getState();
  assert.equal(state.selectedClipId, 'c1');
  assert.deepEqual(state.comments, [{ id: 'm1', clipId: 'c1', body: '第一則' }]);
});

test('UI：在選取的討論串新增留言，留言列表多一筆', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.addComment('第二則');

  assert.deepEqual(app.getState().comments, [
    { id: 'm1', clipId: 'c1', body: '第一則' },
    { id: 'id-1', clipId: 'c1', body: '第二則', createdBy: '小明', createdAt: NOW, userId: 'user-1' },
  ]);
});

test('UI：刪除片段後，從片段列表移除', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'abc', range: { startSec: 20, endSec: 25 } });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.deleteClip('c1');

  assert.deepEqual(app.getState().clips.map((c) => c.id), ['c2']);
});

test('UI：刪除留言後，從留言列表移除', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則', userId: 'user-1' });
  await commentRepo.add({ id: 'm2', clipId: 'c1', body: '第二則' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.deleteComment('m1');

  assert.deepEqual(app.getState().comments.map((m) => m.id), ['m2']);
});

test('UI：載入另一部影片後，清掉不屬於該影片的討論串，列出該影片的片段', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'xyz', range: { startSec: 0, endSec: 5 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.loadVideo('https://youtu.be/xyz', { setId: null });

  const state = app.getState();
  assert.deepEqual(state.clips.map((c) => c.id), ['c2']);
  assert.equal(state.selectedClipId, null);
  assert.deepEqual(state.comments, []);
});

test('UI：重新載入同一部影片時，保留選取的討論串', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.loadVideo('https://www.youtube.com/watch?v=abc', { setId: null });

  const state = app.getState();
  assert.equal(state.selectedClipId, 'c1');
  assert.deepEqual(state.comments.map((m) => m.id), ['m1']);
});

test('UI：刪除目前選取的片段後，清除選取與留言列表', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.deleteClip('c1');

  const state = app.getState();
  assert.equal(state.selectedClipId, null);
  assert.deepEqual(state.comments, []);
});

test('UI：尚未開啟討論串時新增留言，狀態有錯誤 NO_CLIP，不存入', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.addComment('沒有討論串');

  const state = app.getState();
  assert.equal(state.error, 'NO_CLIP');
  assert.deepEqual(state.comments, []);
  assert.deepEqual(await commentRepo.listByClip(/** @type {any} */ (null)), []);
});

test('UI：新增留言成功後，清除先前的錯誤', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.addComment('沒有討論串');
  await app.selectClip('c1');

  await app.addComment('第一則');

  assert.equal(app.getState().error, null);
});

test('UI：開啟討論串後，清除先前的錯誤', async () => {
  const { app, clipRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.addComment('沒有討論串');

  await app.selectClip('c1');

  assert.equal(app.getState().error, null);
});

test('UI：載入影片成功時，播放器載入該影片', async () => {
  const { app, player } = setup();

  await app.loadVideo('https://youtu.be/abc', { setId: null });

  assert.equal(player.getLoadedVideoId(), 'abc');
});

test('UI：貼上無效網址時，播放器不載入影片', async () => {
  const { app, player } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.loadVideo('not a url', { setId: null });

  assert.equal(player.getLoadedVideoId(), 'abc');
});

test('UI：播放片段時，討論串自動換成該片段的', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 } });
  await clipRepo.add({ id: 'c2', videoId: 'abc', range: { startSec: 20, endSec: 25 } });
  await commentRepo.add({ id: 'm2', clipId: 'c2', body: 'c2 的留言' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.playClip('c2');

  const state = app.getState();
  assert.equal(state.selectedClipId, 'c2');
  assert.deepEqual(state.comments.map((m) => m.id), ['m2']);
});

test('UI：未登入時建立片段，狀態有錯誤 NOT_SIGNED_IN，不建立', async () => {
  const { app } = setup({ signedIn: false });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.createClip({ start: '0:10', end: '0:20' });

  const state = app.getState();
  assert.equal(state.error, 'NOT_SIGNED_IN');
  assert.deepEqual(state.clips, []);
});

test('UI：建立片段時，片段帶有標題、建立者（登入者的顯示名稱）與 userId', async () => {
  const { app } = setup();
  await app.signIn({ email: 'hua@example.com', password: 'secret123' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.createClip({ start: '0:10', end: '0:20', title: '開場' });

  const [clip] = app.getState().clips;
  assert.equal(clip.title, '開場');
  assert.equal(clip.createdBy, 'hua');
  assert.equal(clip.userId, 'user-hua');
});

test('UI：未登入、有填名字時可以留言，建立者為「名字（訪客）」，userId 為 null', async () => {
  const { app, clipRepo } = setup({ signedIn: false });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');
  app.setGuestName('阿明');

  await app.addComment('訪客的留言');

  const state = app.getState();
  assert.equal(state.error, null);
  assert.deepEqual(state.comments.map((m) => [m.body, m.createdBy, m.userId]), [['訪客的留言', '阿明（訪客）', null]]);
});

test('UI：新增留言時，留言帶有建立者（登入者的顯示名稱）、userId 與建立時間', async () => {
  const { app, clipRepo } = setup();
  await app.signIn({ email: 'hua@example.com', password: 'secret123' });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.addComment('第一則');

  const [comment] = app.getState().comments;
  assert.equal(comment.createdBy, 'hua');
  assert.equal(comment.userId, 'user-hua');
  assert.equal(comment.createdAt, NOW);
});

/**
 * 把 Repository 的某個方法換成一定失敗的版本。
 * @template {object} T
 * @param {T} repo
 * @param {keyof T} method
 * @param {Error} error
 * @returns {T}
 */
function failOn(repo, method, error) {
  return { ...repo, [method]: async () => { throw error; } };
}

test('UI：新增留言時資料存取失敗，狀態有錯誤 STORAGE_FAILED，錯誤交給 logError', async () => {
  const boom = new Error('Supabase 請求失敗');
  const { app, clipRepo, logged } = setup({ commentRepo: failOn(createMemoryCommentRepo(), 'add', boom) });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.addComment('第一則');

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(logged, [boom]);
});

test('UI：載入影片時資料存取失敗，狀態有錯誤 STORAGE_FAILED，錯誤交給 logError', async () => {
  const boom = new Error('Supabase 請求失敗');
  const { app, logged } = setup({ clipRepo: failOn(createMemoryClipRepo(), 'listByVideo', boom) });

  await app.loadVideo('https://youtu.be/abc', { setId: null });

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(logged, [boom]);
});

test('UI：建立片段時資料存取失敗，狀態有錯誤 STORAGE_FAILED', async () => {
  const boom = new Error('Supabase 請求失敗');
  const { app, logged } = setup({ clipRepo: failOn(createMemoryClipRepo(), 'add', boom) });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.createClip({ start: '0:10', end: '0:20' });

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(logged, [boom]);
});

test('UI：開啟討論串時資料存取失敗，狀態有錯誤 STORAGE_FAILED', async () => {
  const boom = new Error('Supabase 請求失敗');
  const { app, clipRepo, logged } = setup({ commentRepo: failOn(createMemoryCommentRepo(), 'listByClip', boom) });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.selectClip('c1');

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(logged, [boom]);
});

test('UI：刪除留言時資料存取失敗，狀態有錯誤 STORAGE_FAILED', async () => {
  const boom = new Error('Supabase 請求失敗');
  const commentRepo = createMemoryCommentRepo();
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '第一則', createdBy: '小明', createdAt: NOW, userId: 'user-1' });
  const { app, clipRepo, logged } = setup({ commentRepo: failOn(commentRepo, 'remove', boom) });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.deleteComment('m1');

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(logged, [boom]);
});

test('UI：刪除片段時資料存取失敗，狀態有錯誤 STORAGE_FAILED', async () => {
  const boom = new Error('Supabase 請求失敗');
  const clipRepo = createMemoryClipRepo();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  const { app, logged } = setup({ clipRepo: failOn(clipRepo, 'remove', boom) });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.deleteClip('c1');

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(logged, [boom]);
});

/**
 * 把 Repository 的某個方法換成「呼叫後要等 release() 才完成」的版本，用來檢查進行中的狀態。
 * @template {object} T
 * @param {T} repo
 * @param {keyof T} method
 */
function holdOn(repo, method) {
  /** @type {(() => void)[]} */
  const waiting = [];
  const original = /** @type {(...args: unknown[]) => Promise<unknown>} */ (repo[method]);
  const held = {
    ...repo,
    [method]: async (/** @type {unknown[]} */ ...args) => {
      await new Promise((resolve) => { waiting.push(() => resolve(undefined)); });
      return original(...args);
    },
  };
  // release 讓所有正在等待的呼叫一起完成
  return { repo: /** @type {T} */ (held), release: () => waiting.splice(0).forEach((done) => done()) };
}

test('UI：動作進行中 busy 為 true，完成後為 false', async () => {
  const hold = holdOn(createMemoryCommentRepo(), 'add');
  const { app, clipRepo } = setup({ commentRepo: hold.repo });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');
  assert.equal(app.getState().busy, false);

  const pending = app.addComment('第一則');
  assert.equal(app.getState().busy, true);
  await new Promise((resolve) => setImmediate(resolve));
  hold.release();
  await pending;

  assert.equal(app.getState().busy, false);
});

test('UI：busy 時呼叫其他動作會被忽略', async () => {
  const hold = holdOn(createMemoryCommentRepo(), 'add');
  const { app, clipRepo } = setup({ commentRepo: hold.repo });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  const first = app.addComment('第一則');
  const second = app.addComment('第二則');
  await new Promise((resolve) => setImmediate(resolve));
  hold.release();
  await Promise.all([first, second]);

  assert.deepEqual(app.getState().comments.map((m) => m.body), ['第一則']);
});

test('UI：資料存取失敗後，busy 也恢復為 false', async () => {
  const { app } = setup({ clipRepo: failOn(createMemoryClipRepo(), 'listByVideo', new Error('Supabase 請求失敗')) });

  await app.loadVideo('https://youtu.be/abc', { setId: null });

  assert.equal(app.getState().error, 'STORAGE_FAILED');
  assert.equal(app.getState().busy, false);
});

test('UI：載入影片時讀取片段失敗，播放器不換影片', async () => {
  const { app, player } = setup({ clipRepo: failOn(createMemoryClipRepo(), 'listByVideo', new Error('Supabase 請求失敗')) });

  await app.loadVideo('https://youtu.be/abc', { setId: null });

  assert.equal(player.getLoadedVideoId(), null);
});

test('UI：登入後，狀態有登入的使用者', async () => {
  const { app } = setup();

  await app.signIn({ email: 'hua@example.com', password: 'secret123' });

  assert.deepEqual(app.getState().user, { id: 'user-hua', displayName: 'hua' });
});

test('UI：建立時已有保存的工作階段（重新整理頁面），狀態一開始就有登入的使用者', () => {
  const auth = createFakeAuth();
  const session = { accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 3600_000, user: { id: 'user-1', displayName: '小明' } };
  const sessions = createSessionManager({ auth, storage: { load: () => session, save: () => {} }, now: () => NOW });
  const clipRepo = createMemoryClipRepo();
  const commentRepo = createMemoryCommentRepo();
  const clipService = createClipService({ clipRepo, commentRepo, videoInfo: createFakeVideoInfo({}), newId: () => 'x', now: () => NOW });

  const app = createApp({
    clipRepo, commentRepo, clipService, player: createFakePlayer(), newId: () => 'x', newRoomId: () => 'r', now: () => NOW,
    logError: () => {}, auth, sessions,
  });

  assert.deepEqual(app.getState().user, { id: 'user-1', displayName: '小明' });
});

test('UI：canDeleteComment 只對自己的留言回傳 true；未登入時一律 false', () => {
  const mine = { id: 'm1', clipId: 'c1', body: 'a', createdBy: '小明', createdAt: NOW, userId: 'user-1' };
  const others = { ...mine, id: 'm2', userId: 'user-hua' };

  assert.equal(setup().app.canDeleteComment(mine), true);
  assert.equal(setup().app.canDeleteComment(others), false);
  assert.equal(setup({ signedIn: false }).app.canDeleteComment(mine), false);
});

test('UI：刪除別人的留言時，什麼都不做', async () => {
  const { app, clipRepo, commentRepo } = setup();
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW, userId: 'user-hua' });
  await commentRepo.add({ id: 'm1', clipId: 'c1', body: '小華的留言', createdBy: '小華', createdAt: NOW, userId: 'user-hua' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');

  await app.deleteComment('m1');

  assert.deepEqual((await commentRepo.listByClip('c1')).map((m) => m.id), ['m1']);
});

test('UI：註冊後，狀態有登入的使用者（顯示名稱為註冊時填的）', async () => {
  const { app } = setup({ signedIn: false });

  await app.signUp({ email: 'hua@example.com', password: 'secret123', displayName: '小華' });

  assert.deepEqual(app.getState().user, { id: 'user-hua', displayName: '小華' });
});

test('UI：註冊時顯示名稱空白，狀態有錯誤 NO_NAME，不註冊', async () => {
  const { app } = setup({ signedIn: false });

  await app.signUp({ email: 'hua@example.com', password: 'secret123', displayName: '   ' });

  assert.equal(app.getState().error, 'NO_NAME');
  assert.equal(app.getState().user, null);
});

test('UI：登出後，狀態的 user 為 null，保存的工作階段也清除', async () => {
  const { app, sessions } = setup();

  app.signOut();

  assert.equal(app.getState().user, null);
  assert.equal(sessions.getUser(), null);
});

/**
 * 登入與註冊都失敗的假 auth。
 * @param {Error} error
 */
function createFailingAuth(error) {
  return { ...createFakeAuth(), signIn: async () => { throw error; }, signUp: async () => { throw error; } };
}

test('UI：登入時帳號或密碼錯誤，狀態有錯誤 INVALID_CREDENTIALS', async () => {
  const error = Object.assign(new Error('Supabase Auth 失敗'), { code: 'invalid_credentials' });
  const { app } = setup({ signedIn: false, auth: createFailingAuth(error) });

  await app.signIn({ email: 'hua@example.com', password: 'wrong' });

  assert.equal(app.getState().error, 'INVALID_CREDENTIALS');
  assert.equal(app.getState().user, null);
});

test('UI：註冊時 Email 已被註冊或密碼太弱，狀態有對應的錯誤', async () => {
  for (const [code, expected] of [['user_already_exists', 'EMAIL_TAKEN'], ['weak_password', 'WEAK_PASSWORD']]) {
    const error = Object.assign(new Error('Supabase Auth 失敗'), { code });
    const { app } = setup({ signedIn: false, auth: createFailingAuth(error) });

    await app.signUp({ email: 'hua@example.com', password: '1', displayName: '小華' });

    assert.equal(app.getState().error, expected, code);
  }
});

test('UI：登入時遇到其他 Supabase 錯誤碼 → AUTH_FAILED；網路錯誤（沒有錯誤碼）→ STORAGE_FAILED 並交給 logError', async () => {
  const other = Object.assign(new Error('Supabase Auth 失敗'), { code: 'over_request_rate_limit' });
  const a = setup({ signedIn: false, auth: createFailingAuth(other) });
  await a.app.signIn({ email: 'hua@example.com', password: 'secret123' });
  assert.equal(a.app.getState().error, 'AUTH_FAILED');

  const network = new TypeError('Failed to fetch');
  const b = setup({ signedIn: false, auth: createFailingAuth(network) });
  await b.app.signIn({ email: 'hua@example.com', password: 'secret123' });
  assert.equal(b.app.getState().error, 'STORAGE_FAILED');
  assert.deepEqual(b.logged, [network]);
});

test('UI：貼上網址載入影片時，以 newRoomId 產生新的復盤編號', async () => {
  const { app } = setup();

  await app.loadVideo('https://youtu.be/abc');

  assert.equal(app.getState().setId, 'room-1');
});

test('UI：打開分享網址（給定復盤）時沿用它，只列出該組的片段', async () => {
  const { app, clipRepo } = setup();
  const base = { videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW, userId: 'user-hua' };
  await clipRepo.add({ ...base, id: 'c1', setId: 's1' });
  await clipRepo.add({ ...base, id: 'c2', setId: 's2' });

  await app.loadVideo('https://youtu.be/abc', { setId: 's1' });

  assert.equal(app.getState().setId, 's1');
  assert.deepEqual(app.getState().clips.map((c) => c.id), ['c1']);
});

test('UI：建立片段時帶目前的復盤，建立後仍列在該組', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: 's1' });

  await app.createClip({ start: '0:10', end: '0:20' });

  const { clips } = app.getState();
  assert.equal(clips.length, 1);
  assert.equal(clips[0].setId, 's1');
});

test('UI：updateClip 以 timecode 字串修改片段的時間範圍，成功後列表更新', async () => {
  const { app } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.createClip({ start: '0:10', end: '0:20' });
  const [clip] = app.getState().clips;

  await app.updateClip(clip.id, { start: '0:30', end: '0:45' });

  const state = app.getState();
  assert.equal(state.error, null);
  assert.deepEqual(state.clips.map((c) => c.range), [{ startSec: 30, endSec: 45 }]);
});

test('UI：未登入時修改片段，狀態有錯誤 NOT_SIGNED_IN，不修改', async () => {
  const { app, clipRepo } = setup({ signedIn: false });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW, userId: 'user-hua' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.updateClip('c1', { start: '0:30', end: '0:45' });

  assert.equal(app.getState().error, 'NOT_SIGNED_IN');
  assert.deepEqual((await clipRepo.listByVideo('abc')).map((c) => c.range), [{ startSec: 10, endSec: 15 }]);
});

test('UI：修改片段時時間格式錯誤 → INVALID_TIMECODE；區間不合法 → INVALID_RANGE；都不修改', async () => {
  const { app, clipRepo } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.createClip({ start: '0:10', end: '0:20' });
  const [clip] = app.getState().clips;

  await app.updateClip(clip.id, { start: '02:15', end: '' });
  assert.equal(app.getState().error, 'INVALID_TIMECODE');

  await app.updateClip(clip.id, { start: '1:50', end: '2:30' });
  assert.equal(app.getState().error, 'INVALID_RANGE');

  assert.deepEqual((await clipRepo.listByVideo('abc')).map((c) => c.range), [{ startSec: 10, endSec: 20 }]);
});

test('UI：未登入時刪除片段，狀態有錯誤 NOT_SIGNED_IN，不刪除', async () => {
  const { app, clipRepo } = setup({ signedIn: false });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW, userId: 'user-hua' });
  await app.loadVideo('https://youtu.be/abc', { setId: null });

  await app.deleteClip('c1');

  assert.equal(app.getState().error, 'NOT_SIGNED_IN');
  assert.deepEqual((await clipRepo.listByVideo('abc')).map((c) => c.id), ['c1']);
});

test('UI：setGuestName 後，狀態有去掉前後空白的訪客名字', () => {
  const { app } = setup({ signedIn: false });

  app.setGuestName('  阿明 ');

  assert.equal(app.getState().guestName, '阿明');
});

test('UI：未登入、沒填名字時留言，狀態有錯誤 NO_NAME，不存入', async () => {
  const { app, clipRepo } = setup({ signedIn: false });
  await clipRepo.add({ id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '', createdBy: '小華', createdAt: NOW });
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  await app.selectClip('c1');
  app.setGuestName('   ');

  await app.addComment('沒有名字');

  assert.equal(app.getState().error, 'NO_NAME');
  assert.deepEqual(app.getState().comments, []);
});

test('UI：建立片段時開始欄位空白，以播放器目前的時間（捨去到整秒）為開始', async () => {
  const { app, player } = setup();
  await app.loadVideo('https://youtu.be/abc', { setId: null });
  player.seekTo(65.7);

  await app.createClip({ start: '', end: '' });

  assert.equal(app.getState().error, null);
  assert.deepEqual(app.getState().clips.map((c) => c.range), [{ startSec: 65, endSec: 70 }]);
});
