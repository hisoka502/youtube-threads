// @ts-check
import { parseUrl } from '../url/parseUrl.js';
import { parseTimecode } from '../time/timecode.js';
import { playRange } from '../player/playRange.js';

/**
 * 畫面狀態邏輯。不碰 DOM；接 DOM 的程式只讀取 getState() 並呼叫這裡的動作。
 * @param {object} deps
 * @param {import('../types.js').ClipRepository} deps.clipRepo
 * @param {import('../types.js').CommentRepository} deps.commentRepo
 * @param {ReturnType<typeof import('../clip/clipService.js').createClipService>} deps.clipService
 * @param {import('../types.js').PlayerAdapter} deps.player
 * @param {() => string} deps.newId 產生新留言的 id
 * @param {() => number} deps.now 目前時間（毫秒，與 Date.now() 相同）
 * @param {(error: unknown) => void} deps.logError 資料存取失敗時，接收詳細的錯誤（畫面上寫到主控台）
 * @param {{
 *   signIn: (input: { email: string, password: string }) => Promise<import('../types.js').Session>,
 *   signUp: (input: { email: string, password: string, displayName: string }) => Promise<import('../types.js').Session>,
 * }} deps.auth
 * @param {{ set: (session: import('../types.js').Session | null) => void, getUser: () => import('../types.js').User | null }} deps.sessions 工作階段（重新整理頁面後仍保存）
 */
export function createApp({ clipRepo, commentRepo, clipService, player, newId, now, logError, auth, sessions }) {
  /** @type {import('../types.js').AppState} */
  let state = { videoId: null, clips: [], error: null, selectedClipId: null, comments: [], busy: false, user: sessions.getUser(), setId: null, guestName: '' };

  /**
   * 更新片段列表。選取的討論串不在新的列表中時（換了影片或被刪除），一併清除選取與留言。
   * @param {import('../types.js').Clip[]} clips
   */
  function setClips(clips) {
    state = { ...state, clips };
    if (!clips.some((c) => c.id === state.selectedClipId)) {
      state = { ...state, selectedClipId: null, comments: [] };
    }
  }

  /**
   * 開啟片段的討論串：選取它並列出留言。
   * @param {string} clipId
   */
  async function openThread(clipId) {
    await guardStorage(async () => {
      state = { ...state, selectedClipId: clipId, comments: await commentRepo.listByClip(clipId), error: null };
    });
  }

  /**
   * 執行會存取資料的步驟：進行中 busy 為 true；失敗時把錯誤交給 logError，狀態設為 STORAGE_FAILED。
   * @param {() => Promise<void>} step
   */
  async function guardStorage(step) {
    state = { ...state, busy: true };
    try {
      await step();
    } catch (error) {
      logError(error);
      state = { ...state, error: 'STORAGE_FAILED' };
    } finally {
      state = { ...state, busy: false };
    }
  }

  /** Supabase Auth 的錯誤碼 → 畫面上的錯誤碼 */
  /** @type {Record<string, string>} */
  const AUTH_ERRORS = {
    invalid_credentials: 'INVALID_CREDENTIALS',
    user_already_exists: 'EMAIL_TAKEN',
    weak_password: 'WEAK_PASSWORD',
  };

  /**
   * 執行登入或註冊：進行中 busy 為 true；失敗時把 Supabase 的錯誤碼轉成畫面上的錯誤碼。
   * @param {() => Promise<void>} step
   */
  async function guardAuth(step) {
    state = { ...state, busy: true };
    try {
      await step();
    } catch (error) {
      const code = /** @type {{ code?: string }} */ (error).code;
      if (code === undefined) {
        // 沒有 Supabase 錯誤碼：連不上伺服器等，與資料存取失敗相同處理
        logError(error);
        state = { ...state, error: 'STORAGE_FAILED' };
      } else {
        state = { ...state, error: AUTH_ERRORS[code] ?? 'AUTH_FAILED' };
      }
    } finally {
      state = { ...state, busy: false };
    }
  }

  /**
   * 目前登入的使用者能不能刪除這則留言（只能刪除自己的留言）。
   * @param {import('../types.js').Comment} comment
   */
  function canDeleteComment(comment) {
    return state.user !== null && comment.userId === state.user.id;
  }

  return {
    getState() {
      return state;
    },

    canDeleteComment,

    /**
     * 以 Email 與密碼登入。
     * @param {{ email: string, password: string }} input
     */
    async signIn(input) {
      await guardAuth(async () => {
        const session = await auth.signIn(input);
        sessions.set(session);
        state = { ...state, user: session.user, error: null };
      });
    },

    /**
     * 設定訪客（未登入）留言時使用的名字。
     * @param {string} name
     */
    setGuestName(name) {
      state = { ...state, guestName: name.trim() };
    },

    /** 登出：清除保存的工作階段。 */
    signOut() {
      sessions.set(null);
      state = { ...state, user: null };
    },

    /**
     * 註冊並登入。
     * @param {{ email: string, password: string, displayName: string }} input
     */
    async signUp(input) {
      const displayName = input.displayName.trim();
      if (displayName === '') {
        state = { ...state, error: 'NO_NAME' };
        return;
      }
      await guardAuth(async () => {
        const session = await auth.signUp({ ...input, displayName });
        sessions.set(session);
        state = { ...state, user: session.user, error: null };
      });
    },

    /**
     * 載入影片與它的片段。
     * @param {string} url YouTube 網址
     * @param {{ setId?: string | null }} [options] 討論串組；省略時產生新的一組，null 為加入此功能前建立的片段
     */
    async loadVideo(url, options = {}) {
      if (state.busy) return; // 處理中暫停操作
      const videoId = parseUrl(url);
      if (videoId === null) {
        state = { ...state, error: 'INVALID_URL' };
        return;
      }
      // 沒給討論串組（貼上網址帶進影片）時產生新的一組；給了（打開分享網址）則沿用
      const setId = options.setId === undefined ? newId() : options.setId;
      await guardStorage(async () => {
        const clips = await clipRepo.listByVideo(videoId, setId);
        // 片段讀取成功才換播放器的影片，失敗時播放器與片段列表都停在舊影片
        player.load(videoId);
        state = { ...state, videoId, setId, error: null };
        setClips(clips);
      });
    },

    /**
     * 以 YouTube 顯示格式的時間字串（如 "2:15"）建立片段。end 為空字串時由 resolveRange 補為 start + 5 秒。
     * @param {{ start: string, end: string, title?: string }} input
     */
    async createClip({ start, end, title }) {
      if (state.busy) return; // 處理中暫停操作
      const { videoId } = state;
      if (videoId === null) {
        state = { ...state, error: 'NO_VIDEO' };
        return;
      }
      if (state.user === null) {
        state = { ...state, error: 'NOT_SIGNED_IN' };
        return;
      }
      const startSec = parseTimecode(start);
      const endSec = end === '' ? undefined : parseTimecode(end);
      if (startSec === null || endSec === null) {
        state = { ...state, error: 'INVALID_TIMECODE' };
        return;
      }
      await guardStorage(async () => {
        const { user } = state;
        const result = await clipService.createClip({
          videoId, startSec, endSec, title, createdBy: user.displayName, userId: user.id, setId: state.setId,
        });
        if (!result.ok) {
          state = { ...state, error: result.error };
          return;
        }
        state = { ...state, clips: await clipRepo.listByVideo(videoId, state.setId), error: null };
      });
    },

    /**
     * 修改片段的時間範圍（YouTube 顯示格式的時間字串；end 為空字串時補為 start + 5 秒）。
     * @param {string} clipId
     * @param {{ start: string, end: string }} input
     */
    async updateClip(clipId, { start, end }) {
      if (state.busy) return; // 處理中暫停操作
      if (state.user === null) {
        state = { ...state, error: 'NOT_SIGNED_IN' };
        return;
      }
      const clip = state.clips.find((c) => c.id === clipId);
      if (clip === undefined) return;
      const startSec = parseTimecode(start);
      const endSec = end === '' ? undefined : parseTimecode(end);
      if (startSec === null || endSec === null) {
        state = { ...state, error: 'INVALID_TIMECODE' };
        return;
      }
      await guardStorage(async () => {
        const result = await clipService.updateClipRange(clip, { startSec, endSec });
        if (!result.ok) {
          state = { ...state, error: result.error };
          return;
        }
        state = { ...state, clips: await clipRepo.listByVideo(clip.videoId, state.setId), error: null };
      });
    },

    /**
     * 播放目前片段列表中的一個片段，並把討論串換成該片段的；不在列表中時什麼都不做。
     * @param {string} clipId
     */
    async playClip(clipId) {
      if (state.busy) return; // 處理中暫停操作
      const clip = state.clips.find((c) => c.id === clipId);
      if (clip === undefined) return;
      playRange(player, clip.range);
      await openThread(clipId);
    },

    /**
     * 選取片段（討論串），列出它的留言。
     * @param {string} clipId
     */
    async selectClip(clipId) {
      if (state.busy) return; // 處理中暫停操作
      await openThread(clipId);
    },

    /**
     * 在選取的討論串新增留言。留言先不驗證（使用者決定）。
     * @param {string} body
     */
    async addComment(body) {
      if (state.busy) return; // 處理中暫停操作
      const clipId = state.selectedClipId;
      if (clipId === null) {
        state = { ...state, error: 'NO_CLIP' };
        return;
      }
      // 登入者用顯示名稱；訪客（未登入）用填的名字並標示「（訪客）」，沒有使用者 id
      const { user } = state;
      if (user === null && state.guestName === '') {
        state = { ...state, error: 'NO_NAME' };
        return;
      }
      const createdBy = user === null ? `${state.guestName}（訪客）` : user.displayName;
      const userId = user === null ? null : user.id;
      await guardStorage(async () => {
        await commentRepo.add({ id: newId(), clipId, body, createdBy, createdAt: now(), userId });
        state = { ...state, comments: await commentRepo.listByClip(clipId), error: null };
      });
    },

    /**
     * 刪除片段（ClipService 會一併刪除該討論串的留言）。
     * @param {string} clipId
     */
    async deleteClip(clipId) {
      if (state.busy) return; // 處理中暫停操作
      if (state.user === null) {
        state = { ...state, error: 'NOT_SIGNED_IN' };
        return;
      }
      await guardStorage(async () => {
        await clipService.deleteClip(clipId);
        const videoId = /** @type {string} */ (state.videoId);
        setClips(await clipRepo.listByVideo(videoId, state.setId));
      });
    },

    /**
     * 刪除選取的討論串中的一則留言。
     * @param {string} commentId
     */
    async deleteComment(commentId) {
      if (state.busy) return; // 處理中暫停操作
      const comment = state.comments.find((c) => c.id === commentId);
      if (comment === undefined || !canDeleteComment(comment)) return; // 只能刪除自己的留言
      await guardStorage(async () => {
        await commentRepo.remove(commentId);
        const clipId = /** @type {string} */ (state.selectedClipId);
        state = { ...state, comments: await commentRepo.listByClip(clipId) };
      });
    },
  };
}
