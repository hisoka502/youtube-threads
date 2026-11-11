// @ts-check

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
    range.endSec <= durationSec
  );
}
