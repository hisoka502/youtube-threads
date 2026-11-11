// @ts-check

/** YT.PlayerState.PLAYING */
const PLAYING = 1;

/** 定期讀取播放時間的間隔（毫秒） */
const POLL_INTERVAL_MS = 250;

/** @type {import('../types.js').Timer} */
const defaultTimer = {
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(/** @type {any} */ (id)),
};

/**
 * 包裝 YouTube IFrame Player API 的播放器。只做轉呼叫，不含片段邏輯。
 * IFrame API 沒有時間更新事件，所以 onTimeUpdate 以定期讀取 getCurrentTime 實作。
 * @param {import('../types.js').YTPlayerLike} yt 已建立好的 YT.Player
 * @param {import('../types.js').Timer} [timer] 測試時可替換
 * @returns {import('../types.js').PlayerAdapter}
 */
export function createYouTubePlayer(yt, timer = defaultTimer) {
  /** @type {((sec: number) => void)[]} */
  const listeners = [];
  /** @type {unknown} */
  let intervalId = null;

  function poll() {
    if (yt.getPlayerState() !== PLAYING) {
      return;
    }
    const sec = yt.getCurrentTime();
    for (const listener of [...listeners]) {
      listener(sec);
    }
  }

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
    /**
     * @param {(sec: number) => void} callback
     * @returns {() => void} 呼叫後取消訂閱
     */
    onTimeUpdate(callback) {
      listeners.push(callback);
      if (intervalId === null) {
        intervalId = timer.setInterval(poll, POLL_INTERVAL_MS);
      }
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
        // 沒有訂閱者時停止定期讀取
        if (listeners.length === 0 && intervalId !== null) {
          timer.clearInterval(intervalId);
          intervalId = null;
        }
      };
    },
  };
}
