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
