// @ts-check

/**
 * 播放一個片段：從 startSec 開始播放，播到 endSec 自動暫停並停在 endSec。
 * @param {import('../types.js').PlayerAdapter} player
 * @param {import('../types.js').ClipRange} range
 */
export function playRange(player, range) {
  const unsubscribe = player.onTimeUpdate((sec) => {
    if (sec >= range.endSec) {
      unsubscribe();
      player.pause();
      player.seekTo(range.endSec);
    }
  });
  player.seekTo(range.startSec);
  player.play();
}
