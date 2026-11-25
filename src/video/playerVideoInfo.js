// @ts-check

/**
 * 從 YouTube 播放器讀取影片長度的 VideoInfoProvider，不需要 API 金鑰。
 * @param {import('../types.js').YTVideoInfoLike} yt 已建立好的 YT.Player
 * @returns {import('../types.js').VideoInfoProvider}
 */
export function createPlayerVideoInfo(yt) {
  return {
    async getDurationSec() {
      return yt.getDuration();
    },
  };
}
