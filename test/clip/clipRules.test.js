// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidRange } from '../../src/clip/clipRules.js';

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
