// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimecode, formatTimecode } from '../../src/time/timecode.js';

test('parseTimecode："02:15" → 135', () => {
  assert.equal(parseTimecode('02:15'), 135);
});

test('parseTimecode："1:02:03" → 3723', () => {
  assert.equal(parseTimecode('1:02:03'), 3723);
});

test('formatTimecode：135 → "02:15"', () => {
  assert.equal(formatTimecode(135), '02:15');
});

test('formatTimecode：超過一小時格式化為 h:mm:ss', () => {
  assert.equal(formatTimecode(3723), '1:02:03');
});

test('parseTimecode：非數字字串回傳 null', () => {
  assert.equal(parseTimecode('abc'), null);
});

test('parseTimecode：空字串或缺少數字的段落回傳 null', () => {
  assert.equal(parseTimecode(''), null);
  assert.equal(parseTimecode('1:'), null);
});
