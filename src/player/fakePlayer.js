// @ts-check

/**
 * 以可控時間模擬播放的假播放器。
 */
export function createFakePlayer() {
  let currentTime = 0;
  return {
    /** @param {number} sec */
    seekTo(sec) {
      currentTime = sec;
    },
    getCurrentTime() {
      return currentTime;
    },
  };
}
