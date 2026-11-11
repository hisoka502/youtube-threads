// @ts-check

/**
 * 片段的時間區間是否合法。
 * @param {import('../types.js').ClipRange} range
 * @returns {boolean}
 */
export function isValidRange(range) {
  return range.endSec > range.startSec;
}
