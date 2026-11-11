// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakePlayer } from '../../src/player/fakePlayer.js';

test('FakePlayer：seekTo 後 getCurrentTime 回傳該秒數', () => {
  const player = createFakePlayer();
  player.seekTo(42);
  assert.equal(player.getCurrentTime(), 42);
});

test('FakePlayer：seekTo 可接受小數秒，且起始時間為 0', () => {
  const player = createFakePlayer();
  assert.equal(player.getCurrentTime(), 0);
  player.seekTo(7.5);
  assert.equal(player.getCurrentTime(), 7.5);
});

test('FakePlayer：play 後 advance 會推進時間', () => {
  const player = createFakePlayer();
  player.seekTo(10);
  player.play();
  player.advance(3);
  assert.equal(player.isPlaying(), true);
  assert.equal(player.getCurrentTime(), 13);
});
