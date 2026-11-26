// @ts-check
// Supabase 版儲存：以 fetch 呼叫 Supabase 的 REST API（PostgREST），不需要安裝套件。
// 資料表欄位用 snake_case，這裡負責與程式內的 camelCase 物件互轉。

/**
 * @typedef {object} SupabaseOptions
 * @property {string} url 專案網址，例如 https://xxxx.supabase.co
 * @property {string} key 瀏覽器端用的公開金鑰（anon / publishable key）
 * @property {typeof fetch} fetch 測試時可替換
 * @property {() => Promise<string | null>} [getAccessToken] 登入使用者的 access token；未登入時回傳 null
 */

/**
 * clips 資料表的一列。
 * @typedef {object} ClipRow
 * @property {string} id
 * @property {string} video_id
 * @property {number} start_sec
 * @property {number} end_sec
 * @property {string} title
 * @property {string} created_by
 * @property {number} created_at
 */

/**
 * comments 資料表的一列。
 * @typedef {object} CommentRow
 * @property {string} id
 * @property {string} clip_id
 * @property {string} body
 * @property {string} created_by
 * @property {number} created_at
 */

/** @param {SupabaseOptions} options */
function headers({ key }) {
  return {
    // 新式的 publishable key 不是 JWT，只放在 apikey；Authorization 保留給登入使用者的權杖
    apikey: key,
    'Content-Type': 'application/json',
  };
}

/**
 * 送出請求；伺服器回應失敗（非 2xx）時拋出錯誤。
 * @param {SupabaseOptions} options
 * @param {string} path 例如 /rest/v1/clips?id=eq.c1
 * @param {RequestInit} init
 */
async function request(options, path, init) {
  const accessToken = (await options.getAccessToken?.()) ?? null;
  const allHeaders = accessToken === null
    ? headers(options)
    : { ...headers(options), Authorization: `Bearer ${accessToken}` };
  const response = await options.fetch(`${options.url}${path}`, { ...init, headers: allHeaders });
  if (!response.ok) {
    throw new Error(`Supabase 請求失敗：${init.method} ${path} 回應 ${response.status} ${await response.text()}`);
  }
  return response;
}

/**
 * @param {SupabaseOptions} options
 * @returns {import('../types.js').ClipRepository}
 */
export function createSupabaseClipRepo(options) {
  return {
    async add(clip) {
      await request(options, `/rest/v1/clips`, {
        method: 'POST',
        body: JSON.stringify({
          id: clip.id,
          video_id: clip.videoId,
          start_sec: clip.range.startSec,
          end_sec: clip.range.endSec,
          title: clip.title,
          created_by: clip.createdBy,
          created_at: clip.createdAt,
        }),
      });
    },
    async listByVideo(videoId) {
      const response = await request(options, `/rest/v1/clips?video_id=eq.${encodeURIComponent(videoId)}&order=seq.asc`, {
        method: 'GET',
      });
      /** @type {ClipRow[]} */
      const rows = await response.json();
      return rows.map((row) => ({
        id: row.id,
        videoId: row.video_id,
        range: { startSec: row.start_sec, endSec: row.end_sec },
        title: row.title,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));
    },
    async remove(id) {
      await request(options, `/rest/v1/clips?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
  };
}

/**
 * @param {SupabaseOptions} options
 * @returns {import('../types.js').CommentRepository}
 */
export function createSupabaseCommentRepo(options) {
  return {
    async add(comment) {
      await request(options, `/rest/v1/comments`, {
        method: 'POST',
        body: JSON.stringify({
          id: comment.id,
          clip_id: comment.clipId,
          body: comment.body,
          created_by: comment.createdBy,
          created_at: comment.createdAt,
        }),
      });
    },
    async listByClip(clipId) {
      const response = await request(options, `/rest/v1/comments?clip_id=eq.${encodeURIComponent(clipId)}&order=seq.asc`, {
        method: 'GET',
      });
      /** @type {CommentRow[]} */
      const rows = await response.json();
      return rows.map((row) => ({
        id: row.id,
        clipId: row.clip_id,
        body: row.body,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));
    },
    async remove(id) {
      await request(options, `/rest/v1/comments?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
  };
}
