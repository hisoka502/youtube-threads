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
