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
 * 片段。
 * @typedef {object} Clip
 * @property {string} id
 * @property {string} videoId
 * @property {ClipRange} range
 * @property {string} title 選填；未填為空字串
 * @property {string} createdBy 建立者的名字
 * @property {number} createdAt 建立時間（毫秒，與 Date.now() 相同）
 * @property {string} userId 建立者的使用者 id
 * @property {string | null} [setId] 所屬的復盤（網址的 s 參數）；加入此功能前建立的片段為 null
 */

/**
 * 片段的儲存介面。只負責存取，不做驗證（驗證在 ClipService）。
 * @typedef {object} ClipRepository
 * @property {(clip: Clip) => Promise<void>} add
 * @property {(videoId: string, setId?: string | null) => Promise<Clip[]>} listByVideo setId 為 null 或省略時，列出沒有復盤的片段
 * @property {(videoId: string) => Promise<string[]>} listSetIds 該影片有片段的復盤編號，不重複，最近有新片段的在前；不含沒有編號的片段
 * @property {(id: string) => Promise<void>} remove
 * @property {(id: string, range: ClipRange) => Promise<void>} updateRange 只修改時間範圍
 */

/**
 * 留言。片段即討論串，留言線性排列，沒有回覆功能。
 * @typedef {object} Comment
 * @property {string} id
 * @property {string} clipId 所屬片段（討論串）
 * @property {string} body
 * @property {string} createdBy 建立者的名字
 * @property {number} createdAt 建立時間（毫秒，與 Date.now() 相同）
 * @property {string | null} userId 建立者的使用者 id（用來判斷「自己的留言」）；訪客留言為 null
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
 * @typedef {ClipRangeInput & { videoId: string, title?: string, createdBy: string, userId: string, setId?: string | null }} ClipInput
 */

/**
 * 建立片段的結果。
 * @typedef {{ ok: true, clip: Clip } | { ok: false, error: string }} CreateClipResult
 */

/**
 * 播放器介面。正式實作（YouTubePlayer）只做很薄的包裝，可測的邏輯放在外面（例如 playRange）。
 * @typedef {object} PlayerAdapter
 * @property {(videoId: string) => void} load 載入另一部影片，不自動播放（YouTubePlayer 轉呼叫 cueVideoById）
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
 * @property {(videoId: string) => void} cueVideoById 只載入影片，不自動播放
 */

/**
 * YT.Player 中 playerVideoInfo 用到的方法。
 * @typedef {object} YTVideoInfoLike
 * @property {() => { video_id: string }} getVideoData 播放器目前載入的影片
 * @property {() => number} getDuration 秒；影片資訊尚未載入時為 0
 */

/**
 * 計時函式。YouTubePlayer 用它定期讀取播放時間；測試時可替換成假的計時器。
 * @typedef {object} Timer
 * @property {(fn: () => void, ms: number) => unknown} setInterval
 * @property {(id: unknown) => void} clearInterval
 */

/**
 * 畫面狀態（src/ui/app.js）。欄位在測試需要時再加。
 * @typedef {object} AppState
 * @property {string | null} videoId 尚未載入影片時為 null
 * @property {Clip[]} clips 目前影片的片段
 * @property {string | null} error 最近一次動作的錯誤碼（如 'INVALID_URL'）；沒有錯誤時為 null
 * @property {string | null} selectedClipId 目前選取的片段（討論串）；未選取時為 null
 * @property {Comment[]} comments 選取的討論串的留言，依建立順序
 * @property {boolean} busy 正在等待資料存取完成
 * @property {User | null} user 登入的使用者；未登入時為 null
 * @property {string | null} setId 目前的復盤（網址的 s 參數）
 * @property {string} guestName 訪客（未登入）留言時的名字（已去掉前後空白）；未填為空字串
 */

/**
 * 登入的使用者。
 * @typedef {object} User
 * @property {string} id Supabase Auth 的使用者 id
 * @property {string} displayName 註冊時填的顯示名稱
 */

/**
 * 登入的工作階段。
 * @typedef {object} Session
 * @property {string} accessToken 帶在資料庫請求的 Authorization 標頭
 * @property {string} refreshToken 用來換新的 access token
 * @property {number} expiresAt access token 到期時間（毫秒）
 * @property {User} user
 */

export {};
