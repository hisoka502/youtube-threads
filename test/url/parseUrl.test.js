// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUrl } from '../../src/url/parseUrl.js';

test('watch?v=ID 網址取出 ID', () => {
  assert.equal(parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('youtu.be 短網址取出 ID', () => {
  assert.equal(parseUrl('https://youtu.be/9bZkp7q19f0'), '9bZkp7q19f0');
});
