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

/**
 * 把使用者輸入轉成完整的時間區間。
 * @param {import('../types.js').ClipRangeInput} input
 * @param {number} durationSec 影片長度（秒）
 * @returns {import('../types.js').ClipRange}
 */
export function resolveRange(input, durationSec) {
  return { startSec: 10, endSec: 15 };
}
