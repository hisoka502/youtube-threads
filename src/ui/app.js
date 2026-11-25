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
 */
export function createApp({ clipRepo, commentRepo, clipService, player, newId }) {
  /** @type {import('../types.js').AppState} */
  let state = { videoId: null, clips: [], error: null, selectedClipId: null, comments: [], userName: '' };

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
    state = { ...state, selectedClipId: clipId, comments: await commentRepo.listByClip(clipId), error: null };
  }

  return {
    getState() {
      return state;
    },

    /**
     * 設定使用者的名字，之後建立的片段與留言都帶這個名字。
     * @param {string} name
     */
    setUserName(name) {
      state = { ...state, userName: name.trim() };
    },

    /** @param {string} url */
    async loadVideo(url) {
      const videoId = parseUrl(url);
      if (videoId === null) {
        state = { ...state, error: 'INVALID_URL' };
        return;
      }
      player.load(videoId);
      state = { ...state, videoId, error: null };
      setClips(await clipRepo.listByVideo(videoId));
    },

    /**
     * 以 YouTube 顯示格式的時間字串（如 "2:15"）建立片段。end 為空字串時由 resolveRange 補為 start + 5 秒。
     * @param {{ start: string, end: string }} input
     */
    async createClip({ start, end }) {
      const { videoId } = state;
      if (videoId === null) {
        state = { ...state, error: 'NO_VIDEO' };
        return;
      }
      const startSec = parseTimecode(start);
      const endSec = end === '' ? undefined : parseTimecode(end);
      if (startSec === null || endSec === null) {
        state = { ...state, error: 'INVALID_TIMECODE' };
        return;
      }
      const result = await clipService.createClip({ videoId, startSec, endSec });
      if (!result.ok) {
        state = { ...state, error: result.error };
        return;
      }
      state = { ...state, clips: await clipRepo.listByVideo(videoId), error: null };
    },

    /**
     * 播放目前片段列表中的一個片段，並把討論串換成該片段的；不在列表中時什麼都不做。
     * @param {string} clipId
     */
    async playClip(clipId) {
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
      await openThread(clipId);
    },

    /**
     * 在選取的討論串新增留言。留言先不驗證（使用者決定）。
     * @param {string} body
     */
    async addComment(body) {
      const clipId = state.selectedClipId;
      if (clipId === null) {
        state = { ...state, error: 'NO_CLIP' };
        return;
      }
      await commentRepo.add({ id: newId(), clipId, body });
      state = { ...state, comments: await commentRepo.listByClip(clipId), error: null };
    },

    /**
     * 刪除片段（ClipService 會一併刪除該討論串的留言）。
     * @param {string} clipId
     */
    async deleteClip(clipId) {
      await clipService.deleteClip(clipId);
      const videoId = /** @type {string} */ (state.videoId);
      setClips(await clipRepo.listByVideo(videoId));
    },

    /**
     * 刪除選取的討論串中的一則留言。
     * @param {string} commentId
     */
    async deleteComment(commentId) {
      await commentRepo.remove(commentId);
      const clipId = /** @type {string} */ (state.selectedClipId);
      state = { ...state, comments: await commentRepo.listByClip(clipId) };
    },
  };
}
