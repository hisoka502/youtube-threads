// @ts-check

/**
 * 每個播放器目前播放中片段的取消訂閱函式。
 * 新的 playRange 呼叫會先取消前一個，避免前一個片段的自動暫停影響新片段。
 * @type {WeakMap<import('../types.js').PlayerAdapter, () => void>}
 */
const activeRanges = new WeakMap();

/**
 * 播放一個片段：從 startSec 開始播放，播到 endSec 自動暫停並停在 endSec。
 * 同一個播放器上若有尚未播完的片段，會先取消它的自動暫停。
 * @param {import('../types.js').PlayerAdapter} player
 * @param {import('../types.js').ClipRange} range
 */
export function playRange(player, range) {
  activeRanges.get(player)?.();

  const unsubscribe = player.onTimeUpdate((sec) => {
    if (sec >= range.endSec) {
      unsubscribe();
      player.pause();
      player.seekTo(range.endSec);
    }
  });
  activeRanges.set(player, unsubscribe);

  player.seekTo(range.startSec);
  player.play();
}
