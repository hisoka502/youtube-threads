// @ts-check

/** YT.PlayerState.PLAYING */
const PLAYING = 1;

/**
 * 包裝 YouTube IFrame Player API 的播放器。只做轉呼叫，不含片段邏輯。
 * @param {import('../types.js').YTPlayerLike} yt 已建立好的 YT.Player
 */
export function createYouTubePlayer(yt) {
  return {
    /** @param {number} sec */
    seekTo(sec) {
      yt.seekTo(sec, true);
    },
    getCurrentTime() {
      return yt.getCurrentTime();
    },
    play() {
      yt.playVideo();
    },
    pause() {
      yt.pauseVideo();
    },
    isPlaying() {
      return yt.getPlayerState() === PLAYING;
    },
  };
}
