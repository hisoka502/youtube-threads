// @ts-check

/**
 * 假的影片資訊來源：回傳事先給定的影片長度。
 * @param {Record<string, number>} durations videoId → 影片長度（秒）
 * @returns {import('../types.js').VideoInfoProvider}
 */
export function createFakeVideoInfo(durations) {
  return {
    async getDurationSec(videoId) {
      return durations[videoId] ?? null;
    },
  };
}
