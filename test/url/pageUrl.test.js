// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageVideoId, pageUrlFor, pageSetId } from '../../src/url/pageUrl.js';

test('pageVideoId：從頁面網址取出 v 參數', () => {
  assert.equal(pageVideoId('https://example.com/dev/app.html?v=abc'), 'abc');
});

test('pageVideoId：沒有 v 參數或 v 是空字串時回傳 null', () => {
  assert.equal(pageVideoId('https://example.com/dev/app.html'), null);
  assert.equal(pageVideoId('https://example.com/dev/app.html?v='), null);
});

test('pageUrlFor：在頁面網址加上 v 參數；已有 v 時取代，保留其他部分', () => {
  assert.equal(pageUrlFor('https://example.com/dev/app.html', 'abc'), 'https://example.com/dev/app.html?v=abc');
  assert.equal(pageUrlFor('https://example.com/dev/app.html?v=old&x=1#top', 'abc'), 'https://example.com/dev/app.html?v=abc&x=1#top');
});

test('pageSetId：從頁面網址取出 s 參數；沒有或空字串時回傳 null', () => {
  assert.equal(pageSetId('https://example.com/dev/app.html?v=abc&s=set-1'), 'set-1');
  assert.equal(pageSetId('https://example.com/dev/app.html?v=abc'), null);
  assert.equal(pageSetId('https://example.com/dev/app.html?v=abc&s='), null);
});
