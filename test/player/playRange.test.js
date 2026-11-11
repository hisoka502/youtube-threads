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

test('playRange：播到 endSec 自動暫停，並停在 endSec', () => {
  const player = createFakePlayer();
  playRange(player, { startSec: 10, endSec: 20 });

  player.advance(5);
  assert.equal(player.isPlaying(), true, '15 秒時仍在播放');

  player.advance(7); // 超過 endSec，到 22 秒
  assert.equal(player.isPlaying(), false);
  assert.equal(player.getCurrentTime(), 20);
});

test('playRange：自動暫停後，使用者再按播放可繼續播放', () => {
  const player = createFakePlayer();
  playRange(player, { startSec: 10, endSec: 20 });
  player.advance(10); // 到 20 秒，自動暫停

  player.play();
  player.advance(3);

  assert.equal(player.isPlaying(), true);
  assert.equal(player.getCurrentTime(), 23);
});

test('playRange：前一個片段還沒播完就播放另一個片段時，前一個的自動暫停不再作用', () => {
  const player = createFakePlayer();
  playRange(player, { startSec: 10, endSec: 20 }); // 片段 A
  player.advance(2);

  playRange(player, { startSec: 50, endSec: 60 }); // 片段 B
  player.advance(1);

  assert.equal(player.isPlaying(), true, 'B 應繼續播放');
  assert.equal(player.getCurrentTime(), 51);
});

test('playRange：取代前一個片段後，新片段仍會在自己的 endSec 自動暫停', () => {
  const player = createFakePlayer();
  playRange(player, { startSec: 10, endSec: 20 });
  playRange(player, { startSec: 50, endSec: 60 });
  player.advance(11);
  assert.equal(player.isPlaying(), false);
  assert.equal(player.getCurrentTime(), 60);
});

test('playRange：不同播放器各自獨立，互不取消', () => {
  const p1 = createFakePlayer();
  const p2 = createFakePlayer();
  playRange(p1, { startSec: 10, endSec: 20 });
  playRange(p2, { startSec: 50, endSec: 60 });

  p1.advance(11);

  assert.equal(p1.isPlaying(), false, 'p1 仍會在自己的 endSec 暫停');
  assert.equal(p1.getCurrentTime(), 20);
});
