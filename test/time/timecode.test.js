// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimecode, formatTimecode } from '../../src/time/timecode.js';

test('parseTimecode："2:15" → 135', () => {
  assert.equal(parseTimecode('2:15'), 135);
});

test('parseTimecode："1:02:03" → 3723', () => {
  assert.equal(parseTimecode('1:02:03'), 3723);
});

test('formatTimecode：135 → "2:15"（與 YouTube 一致，分鐘不補 0）', () => {
  assert.equal(formatTimecode(135), '2:15');
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

test('parseTimecode：分或秒超過 59 回傳 null', () => {
  assert.equal(parseTimecode('1:75'), null);
  assert.equal(parseTimecode('1:60:00'), null);
});

test('formatTimecode：小數秒無條件捨去（與 YouTube 播放器一致）', () => {
  assert.equal(formatTimecode(125.7), '2:05');
  assert.equal(formatTimecode(59.99), '0:59');
});

test('parseTimecode：不接受小數秒（只接受 YouTube 顯示格式）', () => {
  assert.equal(parseTimecode('2:15.5'), null);
});

test('parseTimecode：不接受單一數字（只接受 YouTube 顯示格式）', () => {
  assert.equal(parseTimecode('90'), null);
});

test('parseTimecode：科學記號、空白、負號、超過三段都回傳 null', () => {
  for (const text of ['1e2', ' 5', '-5', '1:2:3:4', ' 2:15', '-2:15', '1e1:05']) {
    assert.equal(parseTimecode(text), null, text);
  }
});

test('formatTimecode：0 秒與整點小時', () => {
  assert.equal(formatTimecode(0), '0:00');
  assert.equal(formatTimecode(3600), '1:00:00');
});

test('parseTimecode：秒必須是兩位數', () => {
  assert.equal(parseTimecode('2:5'), null);
});

test('parseTimecode：h:mm:ss 的分必須是兩位數', () => {
  assert.equal(parseTimecode('1:2:03'), null);
});

test('parseTimecode：沒有小時時，分不可超過 59', () => {
  assert.equal(parseTimecode('75:00'), null);
});

test('parseTimecode：第一段不可補 0（"0:15" 可以，"02:15" 不行）', () => {
  assert.equal(parseTimecode('02:15'), null);
  assert.equal(parseTimecode('0:15'), 15);
});

test('parseTimecode：小時不可補 0', () => {
  assert.equal(parseTimecode('01:02:03'), null);
});

test('parseTimecode：小時不可為 0', () => {
  assert.equal(parseTimecode('0:01:00'), null);
});
