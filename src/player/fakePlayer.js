// @ts-check

/**
 * 以可控時間模擬播放的假播放器。
 */
export function createFakePlayer() {
  let currentTime = 0;
  let playing = false;
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
    isPlaying() {
      return playing;
    },
    /**
     * 測試專用：讓時間往前推進，不屬於 PlayerAdapter 介面。
     * @param {number} sec
     */
    advance(sec) {
      currentTime += sec;
    },
  };
}
