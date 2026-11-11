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

/**
 * 留言。片段即討論串，留言線性排列，沒有回覆功能。
 * 其他欄位（createdBy、createdAt）在測試需要時再加。
 * @typedef {object} Comment
 * @property {string} id
 * @property {string} clipId 所屬片段（討論串）
 * @property {string} body
 */

/**
 * 留言的儲存介面。只負責存取，不做驗證。
 * @typedef {object} CommentRepository
 * @property {(comment: Comment) => Promise<void>} add
 * @property {(clipId: string) => Promise<Comment[]>} listByClip
 * @property {(id: string) => Promise<void>} remove
 */

/**
 * 影片資訊來源。
 * @typedef {object} VideoInfoProvider
 * @property {(videoId: string) => Promise<number | null>} getDurationSec 找不到影片時回傳 null
 */

/**
 * 建立片段的輸入；endSec 可省略。
 * @typedef {ClipRangeInput & { videoId: string }} ClipInput
 */

/**
 * 建立片段的結果。
 * @typedef {{ ok: true, clip: Clip } | { ok: false, error: string }} CreateClipResult
 */

/**
 * 播放器介面。正式實作（YouTubePlayer）只做很薄的包裝，可測的邏輯放在外面（例如 playRange）。
 * @typedef {object} PlayerAdapter
 * @property {(sec: number) => void} seekTo
 * @property {() => number} getCurrentTime 秒（可含小數）
 * @property {() => void} play
 * @property {() => void} pause
 * @property {() => boolean} isPlaying
 * @property {(callback: (sec: number) => void) => () => void} onTimeUpdate 回傳取消訂閱的函式
 */

/**
 * YT.Player（YouTube IFrame Player API）中轉接層用到的方法。
 * @typedef {object} YTPlayerLike
 * @property {(seconds: number, allowSeekAhead: boolean) => void} seekTo
 * @property {() => number} getCurrentTime
 * @property {() => void} playVideo
 * @property {() => void} pauseVideo
 * @property {() => number} getPlayerState 1 為播放中（YT.PlayerState.PLAYING）
 */

/**
 * 計時函式。YouTubePlayer 用它定期讀取播放時間；測試時可替換成假的計時器。
 * @typedef {object} Timer
 * @property {(fn: () => void, ms: number) => unknown} setInterval
 * @property {(id: unknown) => void} clearInterval
 */

export {};
