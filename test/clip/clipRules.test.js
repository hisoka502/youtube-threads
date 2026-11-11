// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidRange } from '../../src/clip/clipRules.js';

test('isValidRange：endSec 大於 startSec 為合法', () => {
  assert.equal(isValidRange({ startSec: 10, endSec: 20 }), true);
});

test('isValidRange：endSec 小於或等於 startSec 為不合法', () => {
  assert.equal(isValidRange({ startSec: 20, endSec: 10 }), false);
  assert.equal(isValidRange({ startSec: 10, endSec: 10 }), false);
});
