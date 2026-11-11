// @ts-check

/**
 * 以可控時間模擬播放的假播放器。
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
    /** @param {(sec: number) => void} callback */
    onTimeUpdate(callback) {
      listeners.push(callback);
    },
    /**
     * 測試專用：讓時間往前推進，不屬於 PlayerAdapter 介面。
     * @param {number} sec
     */
    advance(sec) {
      if (playing) {
        currentTime += sec;
        for (const listener of listeners) {
          listener(currentTime);
        }
      }
    },
  };
}
