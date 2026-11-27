// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryClipRepo, createMemoryCommentRepo, createMemoryReviewNameRepo } from '../../src/data/memoryRepo.js';

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

test('CommentRepo：刪除留言後不再列出，其餘順序不變', async () => {
  const repo = createMemoryCommentRepo();
  await repo.add(comment('m1', 'c1'));
  await repo.add(comment('m2', 'c1'));
  await repo.add(comment('m3', 'c1'));
  await repo.remove('m2');
  assert.deepEqual(
    (await repo.listByClip('c1')).map((c) => c.id),
    ['m1', 'm3'],
  );
});

test('ClipRepo：修改列出或傳入的物件，不影響 Repository 內的資料', async () => {
  const repo = createMemoryClipRepo();
  const original = clip('c1', 'v1');
  await repo.add(original);

  original.range.startSec = 99;
  const [listed] = await repo.listByVideo('v1');
  listed.range.endSec = 99;

  assert.deepEqual(await repo.listByVideo('v1'), [clip('c1', 'v1')]);
});

test('CommentRepo：修改列出或傳入的物件，不影響 Repository 內的資料', async () => {
  const repo = createMemoryCommentRepo();
  const original = comment('m1', 'c1');
  await repo.add(original);

  original.body = '被改掉';
  const [listed] = await repo.listByClip('c1');
  listed.body = '也被改掉';

  assert.deepEqual(await repo.listByClip('c1'), [comment('m1', 'c1')]);
});

test('ClipRepository：listByVideo 依復盤篩選；setId 為 null 時篩出沒有復盤的片段', async () => {
  const repo = createMemoryClipRepo();
  const base = { videoId: 'abc', range: { startSec: 0, endSec: 5 }, title: '', createdBy: '小明', createdAt: 0, userId: 'user-1' };
  await repo.add({ ...base, id: 'c1', setId: 's1' });
  await repo.add({ ...base, id: 'c2', setId: 's2' });
  await repo.add({ ...base, id: 'c3', setId: null });

  assert.deepEqual((await repo.listByVideo('abc', 's1')).map((c) => c.id), ['c1']);
  assert.deepEqual((await repo.listByVideo('abc', null)).map((c) => c.id), ['c3']);
});

test('ClipRepository：updateRange 修改片段的時間範圍，其他欄位不變', async () => {
  const repo = createMemoryClipRepo();
  const clip = { id: 'c1', videoId: 'abc', range: { startSec: 10, endSec: 15 }, title: '開場', createdBy: '小明', createdAt: 0, userId: 'user-1', setId: null };
  await repo.add(clip);

  await repo.updateRange('c1', { startSec: 20, endSec: 30 });

  assert.deepEqual(await repo.listByVideo('abc'), [{ ...clip, range: { startSec: 20, endSec: 30 } }]);
});

test('ClipRepository：listSetIds 列出該影片有片段的復盤編號，不重複，最近有新片段的在前，不含沒有編號的片段', async () => {
  const repo = createMemoryClipRepo();
  const base = { range: { startSec: 0, endSec: 5 }, title: '', createdBy: '小明', userId: 'user-1' };
  await repo.add({ ...base, id: 'c1', videoId: 'abc', setId: 's1', createdAt: 100 });
  await repo.add({ ...base, id: 'c2', videoId: 'abc', setId: 's2', createdAt: 200 });
  await repo.add({ ...base, id: 'c3', videoId: 'abc', setId: 's1', createdAt: 300 });
  await repo.add({ ...base, id: 'c4', videoId: 'abc', setId: null, createdAt: 400 });
  await repo.add({ ...base, id: 'c5', videoId: 'xyz', setId: 's9', createdAt: 500 });

  assert.deepEqual(await repo.listSetIds('abc'), ['s1', 's2']);
});

test('ReviewNameRepository：set 後 listBySets 回傳這些復盤的名稱；再次 set 會取代；沒有名稱的不列出', async () => {
  const repo = createMemoryReviewNameRepo();
  await repo.set('s1', '一軍');
  await repo.set('s1', '一軍檢討');
  await repo.set('s2', '二軍');

  assert.deepEqual(await repo.listBySets(['s1', 's3']), { s1: '一軍檢討' });
});
