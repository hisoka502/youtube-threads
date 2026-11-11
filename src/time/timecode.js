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

/**
 * 把秒數格式化成時間碼字串。
 * @param {number} sec
 * @returns {string} 未滿一小時為 "mm:ss"，否則為 "h:mm:ss"
 */
export function formatTimecode(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mmss = `${pad2(m)}:${pad2(s)}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** @param {number} n */
function pad2(n) {
  return String(n).padStart(2, '0');
}
