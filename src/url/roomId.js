// @ts-check

/** 房間號碼使用的字元：數字 2–9 與去掉 i、l、o 的小寫英文字母（共 31 個，不易看錯） */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const LENGTH = 8;

/**
 * 產生房間號碼（網址的 s 參數）。
 * @param {(n: number) => Uint8Array} [randomBytes] 隨機位元組來源；預設為 crypto.getRandomValues
 * @returns {string}
 */
export function newRoomId(randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(randomBytes(LENGTH), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
