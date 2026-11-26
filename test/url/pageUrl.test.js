// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageVideoId } from '../../src/url/pageUrl.js';

test('pageVideoId：從頁面網址取出 v 參數', () => {
  assert.equal(pageVideoId('https://example.com/dev/app.html?v=abc'), 'abc');
});

test('pageVideoId：沒有 v 參數或 v 是空字串時回傳 null', () => {
  assert.equal(pageVideoId('https://example.com/dev/app.html'), null);
  assert.equal(pageVideoId('https://example.com/dev/app.html?v='), null);
});
