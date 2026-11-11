// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakePlayer } from '../../src/player/fakePlayer.js';

test('FakePlayer：seekTo 後 getCurrentTime 回傳該秒數', () => {
  const player = createFakePlayer();
  player.seekTo(42);
  assert.equal(player.getCurrentTime(), 42);
});
