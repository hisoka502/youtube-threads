import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hello } from '../src/index.js';

test('hello returns a greeting', () => {
  assert.equal(hello(), 'Hello from YoutubeThreads');
});
