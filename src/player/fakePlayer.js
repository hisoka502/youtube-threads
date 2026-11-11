// @ts-check

/**
 * 以可控時間模擬播放的假播放器。
 * @returns {import('../types.js').PlayerAdapter & { advance: (sec: number) => void }}
 */
export function createFakePlayer() {
  let currentTime = 0;
  let playing = false;
  /** @type {((sec: number) => void)[]} */
  const listeners = [];
  return {
    /** @param {number} sec */
    seekTo(sec) {
      currentTime = sec;
    },
    getCurrentTime() {
      return currentTime;
    },
    play() {
      playing = true;
    },
    pause() {
      playing = false;
    },
    isPlaying() {
      return playing;
    },
    /**
     * @param {(sec: number) => void} callback
     * @returns {() => void} 呼叫後取消訂閱
     */
    onTimeUpdate(callback) {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
    /**
     * 測試專用：讓時間往前推進，不屬於 PlayerAdapter 介面。
     * @param {number} sec
     */
    advance(sec) {
      if (playing) {
        currentTime += sec;
        for (const listener of [...listeners]) {
          listener(currentTime);
        }
      }
    },
  };
}
