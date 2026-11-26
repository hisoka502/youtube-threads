// @ts-check
// Supabase 版儲存：以 fetch 呼叫 Supabase 的 REST API（PostgREST），不需要安裝套件。
// 資料表欄位用 snake_case，這裡負責與程式內的 camelCase 物件互轉。

/**
 * @typedef {object} SupabaseOptions
 * @property {string} url 專案網址，例如 https://xxxx.supabase.co
 * @property {string} key 瀏覽器端用的公開金鑰（anon / publishable key）
 * @property {typeof fetch} fetch 測試時可替換
 */

/** @param {SupabaseOptions} options */
function headers({ key }) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/**
 * @param {SupabaseOptions} options
 * @returns {import('../types.js').ClipRepository}
 */
export function createSupabaseClipRepo(options) {
  const { url, fetch } = options;
  return {
    async add(clip) {
      await fetch(`${url}/rest/v1/clips`, {
        method: 'POST',
        headers: headers(options),
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
    async listByVideo() {
      return [];
    },
    async remove() {},
  };
}
