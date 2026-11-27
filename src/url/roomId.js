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
  // 256 不是 31 的倍數；只用小於 248（31 × 8）的位元組，每個字元出現的機率才會相同
  const limit = ALPHABET.length * Math.floor(256 / ALPHABET.length);
  let id = '';
  while (id.length < LENGTH) {
    for (const byte of randomBytes(LENGTH - id.length)) {
      if (byte < limit) id += ALPHABET[byte % ALPHABET.length];
    }
  }
  return id;
}
