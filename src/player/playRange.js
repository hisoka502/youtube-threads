// @ts-check

/**
 * 播放一個片段：從 startSec 開始播放。
 * @param {import('../types.js').PlayerAdapter} player
 * @param {import('../types.js').ClipRange} range
 */
export function playRange(player, range) {
  player.seekTo(range.startSec);
  player.play();
}
