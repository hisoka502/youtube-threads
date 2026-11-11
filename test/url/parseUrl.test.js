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

test('帶其他參數仍取出正確 ID', () => {
  assert.equal(
    parseUrl('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&t=30s'),
    'dQw4w9WgXcQ',
  );
  assert.equal(parseUrl('https://youtu.be/9bZkp7q19f0?t=30'), '9bZkp7q19f0');
});

test('無效網址回傳 null', () => {
  assert.equal(parseUrl('not a url'), null);
  assert.equal(parseUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
});

test('其他 YouTube 主機：youtube.com、m.youtube.com', () => {
  assert.equal(parseUrl('https://youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(parseUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});
