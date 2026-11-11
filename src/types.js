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
 * 片段。其他欄位（title、createdBy、createdAt）在測試需要時再加。
 * @typedef {object} Clip
 * @property {string} id
 * @property {string} videoId
 * @property {ClipRange} range
 */

/**
 * 片段的儲存介面。只負責存取，不做驗證（驗證在 ClipService）。
 * @typedef {object} ClipRepository
 * @property {(clip: Clip) => Promise<void>} add
 * @property {(videoId: string) => Promise<Clip[]>} listByVideo
 * @property {(id: string) => Promise<void>} remove
 */

export {};
