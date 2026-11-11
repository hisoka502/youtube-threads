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

test('YouTubePlayer：seekTo 轉呼叫 IFrame API（允許跳到未緩衝處），getCurrentTime 直接轉回', () => {
  const yt = createFakeYT();
  const player = createYouTubePlayer(yt);

  player.seekTo(30);
  yt.setTime(31.4);

  assert.deepEqual(yt.calls, [['seekTo', 30, true]]);
  assert.equal(player.getCurrentTime(), 31.4);
});
