// @ts-check

// YouTube 播放器的顯示格式：
//   m:ss     分 0–59，不補 0；秒 00–59，固定兩位
//   h:mm:ss  時不補 0、沒有上限；分、秒 00–59，固定兩位
const M_SS = /^(0|[1-9]|[1-5]\d):([0-5]\d)$/;
const H_MM_SS = /^(0|[1-9]\d*):([0-5]\d):([0-5]\d)$/;

/**
 * 把 YouTube 顯示格式的時間碼字串轉成秒數。
 * @param {string} text m:ss 或 h:mm:ss，例如 "2:15"、"1:02:03"
 * @returns {number | null} 整數秒；格式錯誤時回傳 null
 */
export function parseTimecode(text) {
  const match = M_SS.exec(text) ?? H_MM_SS.exec(text);
  if (!match) {
    return null;
  }
  return match
    .slice(1)
    .reduce((sum, part) => sum * 60 + Number(part), 0);
}

/**
 * 把秒數格式化成時間碼字串。
 * @param {number} sec
 * @returns {string} 未滿一小時為 "m:ss"，否則為 "h:mm:ss"
 */
export function formatTimecode(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  // 與 YouTube 播放器一致：未滿一小時分鐘不補 0（2:15），有小時則補 0（1:02:03）
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** @param {number} n */
function pad2(n) {
  return String(n).padStart(2, '0');
}
