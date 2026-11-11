// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTimestamps } from '../../src/comment/timestamps.js';

test('findTimestamps：找出留言中的時間戳及其秒數', () => {
  assert.deepEqual(findTimestamps('看 2:15 這裡'), [{ text: '2:15', sec: 135 }]);
});

test('findTimestamps：依出現順序找出所有時間戳', () => {
  assert.deepEqual(findTimestamps('從 1:02:03 開始，到 0:45 也很好笑'), [
    { text: '1:02:03', sec: 3723 },
    { text: '0:45', sec: 45 },
  ]);
});

test('findTimestamps：沒有時間戳時回傳空陣列', () => {
  assert.deepEqual(findTimestamps('這段好好笑'), []);
  assert.deepEqual(findTimestamps(''), []);
});

test('findTimestamps：不是 YouTube 顯示格式的字串不算時間戳', () => {
  assert.deepEqual(findTimestamps('02:15、3:2、2:75 都不是，2:15 才是'), [
    { text: '2:15', sec: 135 },
  ]);
});
