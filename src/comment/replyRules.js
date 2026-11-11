// @ts-check

/**
 * 新留言的 parentId 是否合法。
 * @param {{ clipId: string, parentId: string | null }} comment 要新增的留言
 * @param {import('../types.js').Comment[]} existing 已存在的留言
 * @returns {boolean}
 */
export function isValidReply(comment, existing) {
  if (comment.parentId === null) {
    return true;
  }
  const parent = existing.find((c) => c.id === comment.parentId);
  return parent?.clipId === comment.clipId;
}
