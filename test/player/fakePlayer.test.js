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

test('FakePlayer：未播放或 pause 後，advance 不推進時間', () => {
  const player = createFakePlayer();
  player.advance(5);
  assert.equal(player.getCurrentTime(), 0);

  player.play();
  player.advance(2);
  player.pause();
  player.advance(5);
  assert.equal(player.isPlaying(), false);
  assert.equal(player.getCurrentTime(), 2);
});

test('FakePlayer：onTimeUpdate 在時間推進時收到目前秒數', () => {
  const player = createFakePlayer();
  /** @type {number[]} */
  const received = [];
  player.onTimeUpdate((sec) => received.push(sec));

  player.play();
  player.advance(1);
  player.advance(1);

  assert.deepEqual(received, [1, 2]);
});

test('FakePlayer：onTimeUpdate 回傳的函式可取消訂閱，不影響其他訂閱者', () => {
  const player = createFakePlayer();
  /** @type {number[]} */
  const a = [];
  /** @type {number[]} */
  const b = [];
  const unsubscribeA = player.onTimeUpdate((sec) => a.push(sec));
  player.onTimeUpdate((sec) => b.push(sec));

  player.play();
  player.advance(1);
  unsubscribeA();
  player.advance(1);

  assert.deepEqual(a, [1]);
  assert.deepEqual(b, [1, 2]);
});

test('FakePlayer：同一個取消函式呼叫兩次，不影響其他訂閱者', () => {
  const player = createFakePlayer();
  /** @type {number[]} */
  const b = [];
  const unsubscribeA = player.onTimeUpdate(() => {});
  player.onTimeUpdate((sec) => b.push(sec));

  unsubscribeA();
  unsubscribeA();
  player.play();
  player.advance(1);

  assert.deepEqual(b, [1]);
});

test('FakePlayer：在通知過程中取消訂閱，其他訂閱者仍收到這次通知', () => {
  const player = createFakePlayer();
  /** @type {number[]} */
  const b = [];
  const unsubscribeA = player.onTimeUpdate(() => unsubscribeA());
  player.onTimeUpdate((sec) => b.push(sec));

  player.play();
  player.advance(1);

  assert.deepEqual(b, [1]);
});
