// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerVideoInfo } from '../../src/video/playerVideoInfo.js';

/**
 * 假的 YT.Player：只提供影片資訊相關的方法。
 * @param {string} videoId 播放器目前載入的影片
 * @param {number} durationSec
 */
function createFakeYT(videoId, durationSec) {
  return {
    getVideoData() { return { video_id: videoId }; },
    getDuration() { return durationSec; },
  };
}

test('playerVideoInfo：播放器目前載入的影片，回傳 getDuration 的長度', async () => {
  const videoInfo = createPlayerVideoInfo(createFakeYT('abc', 212.5));

  assert.equal(await videoInfo.getDurationSec('abc'), 212.5);
});

test('playerVideoInfo：不是播放器目前載入的影片，回傳 null', async () => {
  const videoInfo = createPlayerVideoInfo(createFakeYT('abc', 212.5));

  assert.equal(await videoInfo.getDurationSec('other'), null);
});

test('playerVideoInfo：getDuration 為 0（影片資訊尚未載入）時，回傳 null', async () => {
  const videoInfo = createPlayerVideoInfo(createFakeYT('abc', 0));

  assert.equal(await videoInfo.getDurationSec('abc'), null);
});
