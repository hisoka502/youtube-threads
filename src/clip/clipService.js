// @ts-check
import { resolveRange } from './clipRules.js';

/**
 * 建立與刪除片段的流程。驗證邏輯放在這裡，Repository 只負責存取。
 * @param {object} deps
 * @param {import('../types.js').ClipRepository} deps.clipRepo
 * @param {import('../types.js').VideoInfoProvider} deps.videoInfo
 * @param {() => string} deps.newId 產生新片段的 id
 */
export function createClipService({ clipRepo, videoInfo, newId }) {
  return {
    /**
     * @param {import('../types.js').ClipInput} input
     * @returns {Promise<import('../types.js').CreateClipResult>}
     */
    async createClip(input) {
      const durationSec = /** @type {number} */ (await videoInfo.getDurationSec(input.videoId));
      const range = resolveRange(input, durationSec);
      const clip = { id: newId(), videoId: input.videoId, range };
      await clipRepo.add(clip);
      return { ok: true, clip };
    },
  };
}
