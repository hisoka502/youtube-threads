// @ts-check

/**
 * 把 YouTube 顯示格式的時間碼字串轉成秒數。
 * @param {string} text m:ss 或 h:mm:ss，例如 "2:15"、"1:02:03"
 * @returns {number | null} 整數秒；格式錯誤時回傳 null
 */
export function parseTimecode(text) {
  const parts = text.split(':');
  // 只接受 m:ss 或 h:mm:ss
  if (parts.length !== 2 && parts.length !== 3) {
    return null;
  }
  // 每段只能是數字（不接受小數點、空白、正負號、空字串）
  if (!parts.every((part) => /^\d+$/.test(part))) {
    return null;
  }
  const numbers = parts.map(Number);
  // 第一段之後（分、秒）必須小於 60
  if (numbers.slice(1).some((n) => n >= 60)) {
    return null;
  }
  return numbers.reduce((sum, n) => sum * 60 + n, 0);
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
