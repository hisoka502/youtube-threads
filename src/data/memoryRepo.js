// @ts-check

/**
 * 記憶體版的片段儲存。
 * @returns {import('../types.js').ClipRepository}
 */
export function createMemoryClipRepo() {
  /** @type {import('../types.js').Clip[]} */
  const clips = [];
  return {
    async add(clip) {
      clips.push(clip);
    },
    async listByVideo(videoId) {
      return clips.filter((c) => c.videoId === videoId);
    },
  };
}
