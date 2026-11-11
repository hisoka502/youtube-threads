// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakePlayer } from '../../src/player/fakePlayer.js';
import { playRange } from '../../src/player/playRange.js';

test('playRange：跳到 startSec 並開始播放', () => {
  const player = createFakePlayer();
  playRange(player, { startSec: 10, endSec: 20 });
  assert.equal(player.getCurrentTime(), 10);
  assert.equal(player.isPlaying(), true);
});
