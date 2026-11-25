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
  let state = { videoId: null, clips: [], error: null, selectedClipId: null, comments: [] };

  return {
    getState() {
      return state;
    },

    /** @param {string} url */
    async loadVideo(url) {
      const videoId = parseUrl(url);
      if (videoId === null) {
        state = { ...state, error: 'INVALID_URL' };
        return;
      }
      state = { ...state, videoId, clips: await clipRepo.listByVideo(videoId), error: null };
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
     * 播放目前片段列表中的一個片段；不在列表中時什麼都不做。
     * @param {string} clipId
     */
    playClip(clipId) {
      const clip = state.clips.find((c) => c.id === clipId);
      if (clip === undefined) return;
      playRange(player, clip.range);
    },

    /**
     * 選取片段（討論串），列出它的留言。
     * @param {string} clipId
     */
    async selectClip(clipId) {
      state = { ...state, selectedClipId: clipId, comments: await commentRepo.listByClip(clipId) };
    },

    /**
     * 在選取的討論串新增留言。留言先不驗證（使用者決定）。
     * @param {string} body
     */
    async addComment(body) {
      const clipId = /** @type {string} */ (state.selectedClipId);
      await commentRepo.add({ id: newId(), clipId, body });
      state = { ...state, comments: await commentRepo.listByClip(clipId) };
    },

    /**
     * 刪除片段（ClipService 會一併刪除該討論串的留言）。
     * @param {string} clipId
     */
    async deleteClip(clipId) {
      await clipService.deleteClip(clipId);
      const videoId = /** @type {string} */ (state.videoId);
      state = { ...state, clips: await clipRepo.listByVideo(videoId) };
    },
  };
}
