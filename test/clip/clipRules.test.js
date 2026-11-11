// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidRange, resolveRange } from '../../src/clip/clipRules.js';

test('isValidRange：endSec 大於 startSec 為合法', () => {
  assert.equal(isValidRange({ startSec: 10, endSec: 20 }, 120), true);
});

test('isValidRange：endSec 小於或等於 startSec 為不合法', () => {
  assert.equal(isValidRange({ startSec: 20, endSec: 10 }, 120), false);
  assert.equal(isValidRange({ startSec: 10, endSec: 10 }, 120), false);
});

test('isValidRange：startSec 不可為負數，0 可以', () => {
  assert.equal(isValidRange({ startSec: -1, endSec: 5 }, 120), false);
  assert.equal(isValidRange({ startSec: 0, endSec: 5 }, 120), true);
});

test('isValidRange：endSec 不可超過影片長度，等於影片長度可以', () => {
  assert.equal(isValidRange({ startSec: 100, endSec: 121 }, 120), false);
  assert.equal(isValidRange({ startSec: 100, endSec: 120 }, 120), true);
});

test('resolveRange：未提供 endSec 時，endSec = startSec + 5', () => {
  assert.deepEqual(resolveRange({ startSec: 10 }, 120), { startSec: 10, endSec: 15 });
});

test('resolveRange：預設長度從任意 startSec 起算', () => {
  assert.deepEqual(resolveRange({ startSec: 30.5 }, 120), { startSec: 30.5, endSec: 35.5 });
});

test('resolveRange：有提供 endSec 時維持原值', () => {
  assert.deepEqual(resolveRange({ startSec: 10, endSec: 40 }, 120), { startSec: 10, endSec: 40 });
});

test('resolveRange：預設長度超過影片長度時，endSec 截到影片結尾', () => {
  assert.deepEqual(resolveRange({ startSec: 118 }, 120), { startSec: 118, endSec: 120 });
});
