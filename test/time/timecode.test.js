// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimecode } from '../../src/time/timecode.js';

test('parseTimecode："02:15" → 135', () => {
  assert.equal(parseTimecode('02:15'), 135);
});

test('parseTimecode："1:02:03" → 3723', () => {
  assert.equal(parseTimecode('1:02:03'), 3723);
});
