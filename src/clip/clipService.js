// @ts-check
import { isValidRange, resolveRange } from './clipRules.js';

/**
 * 建立與刪除片段的流程。驗證邏輯放在這裡，Repository 只負責存取。
 * @param {object} deps
 * @param {import('../types.js').ClipRepository} deps.clipRepo
 * @param {import('../types.js').CommentRepository} deps.commentRepo
 * @param {import('../types.js').VideoInfoProvider} deps.videoInfo
 * @param {() => string} deps.newId 產生新片段的 id
 */
export function createClipService({ clipRepo, commentRepo, videoInfo, newId }) {
  return {
    /**
     * @param {import('../types.js').ClipInput} input
     * @returns {Promise<import('../types.js').CreateClipResult>}
     */
    async createClip(input) {
      const durationSec = /** @type {number} */ (await videoInfo.getDurationSec(input.videoId));
      const range = resolveRange(input, durationSec);
      if (!isValidRange(range, durationSec)) {
        return { ok: false, error: 'INVALID_RANGE' };
      }
      const clip = { id: newId(), videoId: input.videoId, range };
      await clipRepo.add(clip);
      return { ok: true, clip };
    },

    /**
     * 刪除片段，並一併刪除該片段討論串的留言。
     * @param {string} id
     */
    async deleteClip(id) {
      for (const comment of await commentRepo.listByClip(id)) {
        await commentRepo.remove(comment.id);
      }
      await clipRepo.remove(id);
    },
  };
}
