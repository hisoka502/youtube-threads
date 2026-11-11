// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidRange } from '../../src/clip/clipRules.js';

test('isValidRange：endSec 大於 startSec 為合法', () => {
  assert.equal(isValidRange({ startSec: 10, endSec: 20 }), true);
});
