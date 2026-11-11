// @ts-check
// JSDoc typedef：介面在寫測試時決定後再補進這裡。

/**
 * 檢查從網址取出的影片 ID 是否合法。
 * @typedef {(id: string) => boolean} IdValidator
 */

/**
 * parseUrl 的選項。
 * @typedef {object} ParseUrlOptions
 * @property {IdValidator} [isValidId] 預設接受任何非空字串
 */

/**
 * 片段的時間區間，單位為秒（可含小數）。
 * @typedef {object} ClipRange
 * @property {number} startSec
 * @property {number} endSec
 */

/**
 * 使用者建立片段時的輸入；endSec 可省略。
 * @typedef {object} ClipRangeInput
 * @property {number} startSec
 * @property {number} [endSec]
 */

/**
 * 留言中的一個時間戳。
 * @typedef {object} Timestamp
 * @property {string} text 原文中的時間戳字串，例如 "2:15"
 * @property {number} sec 對應的秒數
 */

export {};
