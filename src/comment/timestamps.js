// @ts-check
import { parseTimecode } from '../time/timecode.js';

/** 看起來像時間戳的字串：以冒號分隔的數字，例如 2:15、1:02:03 */
const CANDIDATE = /\d+(?::\d+)+/g;

/**
 * 找出留言文字中的所有時間戳。
 * @param {string} text 留言內容
 * @returns {import('../types.js').Timestamp[]}
 */
export function findTimestamps(text) {
  return [...text.matchAll(CANDIDATE)].map((match) => ({
    text: match[0],
    sec: /** @type {number} */ (parseTimecode(match[0])),
  }));
}
