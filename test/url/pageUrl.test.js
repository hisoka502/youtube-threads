// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageVideoId } from '../../src/url/pageUrl.js';

test('pageVideoId：從頁面網址取出 v 參數', () => {
  assert.equal(pageVideoId('https://example.com/dev/app.html?v=abc'), 'abc');
});
