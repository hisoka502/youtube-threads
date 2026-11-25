// @ts-check
import { parseUrl } from '../url/parseUrl.js';
import { parseTimecode } from '../time/timecode.js';

/**
 * 畫面狀態邏輯。不碰 DOM；接 DOM 的程式只讀取 getState() 並呼叫這裡的動作。
 * @param {object} deps
 * @param {import('../types.js').ClipRepository} deps.clipRepo
 * @param {ReturnType<typeof import('../clip/clipService.js').createClipService>} deps.clipService
 */
export function createApp({ clipRepo, clipService }) {
  /** @type {import('../types.js').AppState} */
  let state = { videoId: null, clips: [], error: null };

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
     * 以 YouTube 顯示格式的時間字串（如 "2:15"）建立片段。
     * @param {{ start: string, end: string }} input
     */
    async createClip({ start, end }) {
      const videoId = /** @type {string} */ (state.videoId);
      const startSec = /** @type {number} */ (parseTimecode(start));
      const endSec = /** @type {number} */ (parseTimecode(end));
      await clipService.createClip({ videoId, startSec, endSec });
      state = { ...state, clips: await clipRepo.listByVideo(videoId) };
    },
  };
}
