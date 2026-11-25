// @ts-check

/** 使用者未提供 endSec 時的預設片段長度（秒） */
export const DEFAULT_CLIP_LENGTH_SEC = 5;

/**
 * startSec 至少要在影片結尾前這麼多秒。
 * YouTube 播放器跳到離結尾太近的位置時，會直接判定影片已結束，接著從 0 秒重播
 * （實測：getDuration 為 328 的影片，seekTo(327) 會重播，seekTo(325) 正常）。
 */
export const MIN_START_BEFORE_END_SEC = 3;

/**
 * 片段的時間區間是否合法。
 * @param {import('../types.js').ClipRange} range
 * @param {number} durationSec 影片長度（秒）
 * @returns {boolean}
 */
export function isValidRange(range, durationSec) {
  return (
    range.startSec >= 0 &&
    range.endSec > range.startSec &&
    range.endSec <= durationSec &&
    range.startSec <= durationSec - MIN_START_BEFORE_END_SEC
  );
}

/**
 * 把使用者輸入轉成完整的時間區間。
 * @param {import('../types.js').ClipRangeInput} input
 * @param {number} durationSec 影片長度（秒）
 * @returns {import('../types.js').ClipRange}
 */
export function resolveRange(input, durationSec) {
  const endSec =
    input.endSec ?? Math.min(input.startSec + DEFAULT_CLIP_LENGTH_SEC, durationSec);
  return { startSec: input.startSec, endSec };
}
