// @ts-check

/**
 * 記憶體版的片段儲存。
 * @returns {import('../types.js').ClipRepository}
 */
export function createMemoryClipRepo() {
  /** @type {import('../types.js').Clip[]} */
  let clips = [];
  return {
    async add(clip) {
      clips.push(structuredClone(clip));
    },
    async listByVideo(videoId) {
      return structuredClone(clips.filter((c) => c.videoId === videoId));
    },
    async remove(id) {
      clips = clips.filter((c) => c.id !== id);
    },
  };
}

/**
 * 記憶體版的留言儲存。
 * @returns {import('../types.js').CommentRepository}
 */
export function createMemoryCommentRepo() {
  /** @type {import('../types.js').Comment[]} */
  let comments = [];
  return {
    async add(comment) {
      comments.push(structuredClone(comment));
    },
    async listByClip(clipId) {
      return structuredClone(comments.filter((c) => c.clipId === clipId));
    },
    async remove(id) {
      comments = comments.filter((c) => c.id !== id);
    },
  };
}
