// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createYouTubePlayer } from '../../src/player/youtubePlayer.js';

/** 假的 YT.Player：只實作轉接層用到的方法，並記錄呼叫。 */
function createFakeYT() {
  /** @type {unknown[][]} */
  const calls = [];
  let time = 0;
  let state = -1; // YT.PlayerState.UNSTARTED
  return {
    calls,
    /** @param {number} t */
    setTime(t) { time = t; },
    /** @param {number} sec @param {boolean} allowSeekAhead */
    seekTo(sec, allowSeekAhead) { calls.push(['seekTo', sec, allowSeekAhead]); time = sec; },
    getCurrentTime() { return time; },
    playVideo() { calls.push(['playVideo']); state = 1; },
    pauseVideo() { calls.push(['pauseVideo']); state = 2; },
    getPlayerState() { return state; },
  };
}

/** 假的計時器：tick() 等於經過一次間隔。 */
function createFakeTimer() {
  /** @type {Map<number, () => void>} */
  const timers = new Map();
  let nextId = 1;
  return {
    /** @param {() => void} fn */
    setInterval(fn) { const id = nextId++; timers.set(id, fn); return id; },
    /** @param {number} id */
    clearInterval(id) { timers.delete(id); },
    tick() { for (const fn of [...timers.values()]) fn(); },
    get activeCount() { return timers.size; },
  };
}

test('YouTubePlayer：seekTo 轉呼叫 IFrame API（允許跳到未緩衝處），getCurrentTime 直接轉回', () => {
  const yt = createFakeYT();
  const player = createYouTubePlayer(yt);

  player.seekTo(30);
  yt.setTime(31.4);

  assert.deepEqual(yt.calls, [['seekTo', 30, true]]);
  assert.equal(player.getCurrentTime(), 31.4);
});

test('YouTubePlayer：play、pause 轉呼叫 playVideo、pauseVideo；isPlaying 依 getPlayerState 判斷', () => {
  const yt = createFakeYT();
  const player = createYouTubePlayer(yt);

  assert.equal(player.isPlaying(), false);
  player.play();
  assert.equal(player.isPlaying(), true);
  player.pause();
  assert.equal(player.isPlaying(), false);
  assert.deepEqual(yt.calls, [['playVideo'], ['pauseVideo']]);
});

test('YouTubePlayer：onTimeUpdate 在播放中定期通知目前秒數，暫停時不通知', () => {
  const yt = createFakeYT();
  const timer = createFakeTimer();
  const player = createYouTubePlayer(yt, timer);
  /** @type {number[]} */
  const received = [];
  player.onTimeUpdate((sec) => received.push(sec));

  player.play();
  yt.setTime(12.25);
  timer.tick();
  player.pause();
  yt.setTime(13);
  timer.tick();

  assert.deepEqual(received, [12.25]);
});

test('YouTubePlayer：onTimeUpdate 回傳的函式可取消訂閱；呼叫兩次不影響其他訂閱者', () => {
  const yt = createFakeYT();
  const timer = createFakeTimer();
  const player = createYouTubePlayer(yt, timer);
  /** @type {number[]} */
  const a = [];
  /** @type {number[]} */
  const b = [];
  const unsubscribeA = player.onTimeUpdate((sec) => a.push(sec));
  player.onTimeUpdate((sec) => b.push(sec));

  player.play();
  yt.setTime(1);
  timer.tick();
  unsubscribeA();
  unsubscribeA();
  yt.setTime(2);
  timer.tick();

  assert.deepEqual(a, [1]);
  assert.deepEqual(b, [1, 2]);
});
