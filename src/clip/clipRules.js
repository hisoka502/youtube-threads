// @ts-check

/** 使用者未提供 endSec 時的預設片段長度（秒） */
export const DEFAULT_CLIP_LENGTH_SEC = 5;

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
  const endSec = input.endSec ?? input.startSec + DEFAULT_CLIP_LENGTH_SEC;
  return { startSec: input.startSec, endSec };
}
