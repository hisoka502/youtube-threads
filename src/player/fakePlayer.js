// @ts-check

/**
 * 以可控時間模擬播放的假播放器。
 */
export function createFakePlayer() {
  return {
    /** @param {number} sec */
    seekTo(sec) {},
    getCurrentTime() {
      return 42;
    },
  };
}
