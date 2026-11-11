// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTimestamps } from '../../src/comment/timestamps.js';

test('findTimestamps：找出留言中的時間戳及其秒數', () => {
  assert.deepEqual(findTimestamps('看 2:15 這裡'), [{ text: '2:15', sec: 135 }]);
});
