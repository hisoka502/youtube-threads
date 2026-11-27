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
    async listByVideo(videoId, setId = null) {
      return structuredClone(clips.filter((c) => c.videoId === videoId && (c.setId ?? null) === setId));
    },
    async listSetIds(videoId) {
      const latest = new Map();
      for (const c of clips) {
        if (c.videoId !== videoId || (c.setId ?? null) === null) continue;
        latest.set(c.setId, Math.max(latest.get(c.setId) ?? -Infinity, c.createdAt));
      }
      return [...latest.keys()].sort((a, b) => latest.get(b) - latest.get(a));
    },
    async remove(id) {
      clips = clips.filter((c) => c.id !== id);
    },
    async updateRange(id, range) {
      clips = clips.map((c) => (c.id === id ? { ...c, range: structuredClone(range) } : c));
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
