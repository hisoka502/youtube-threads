// @ts-check
import { parseUrl } from '../url/parseUrl.js';

/**
 * 畫面狀態邏輯。不碰 DOM；接 DOM 的程式只讀取 getState() 並呼叫這裡的動作。
 * @param {object} deps
 * @param {import('../types.js').ClipRepository} deps.clipRepo
 */
export function createApp({ clipRepo }) {
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
  };
}
