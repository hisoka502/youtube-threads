// @ts-check

/**
 * 把時間碼字串轉成秒數。
 * @param {string} text 例如 "02:15"、"1:02:03"
 * @returns {number} 秒（可含小數）
 */
export function parseTimecode(text) {
  return text
    .split(':')
    .reduce((total, part) => total * 60 + Number(part), 0);
}
