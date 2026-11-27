// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newRoomId } from '../../src/url/roomId.js';

/**
 * 假的隨機來源：依序回傳給定的位元組。
 * @param {number[]} bytes
 */
function fixedBytes(bytes) {
  let i = 0;
  return (/** @type {number} */ n) => Uint8Array.from(bytes.slice(i, (i += n)));
}

test('newRoomId：位元組取餘數對應字元表，產生 8 個字元', () => {
  assert.equal(newRoomId(fixedBytes([0, 1, 2, 3, 4, 5, 6, 7])), '23456789');
  assert.equal(newRoomId(fixedBytes([8, 9, 10, 30, 31, 32, 62, 0])), 'abcz2322');
});

test('newRoomId：位元組 ≥ 248 時捨棄，改用下一個位元組（避免某些字元較常出現）', () => {
  const bytes = [248, 0, 255, 1, 2, 3, 4, 5, 6, 7];
  assert.equal(newRoomId(fixedBytes(bytes)), '23456789');
});
