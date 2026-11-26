// @ts-check
// Supabase Auth：以 fetch 呼叫 /auth/v1 的 REST API，不需要安裝套件。

/**
 * @typedef {object} SupabaseAuthOptions
 * @property {string} url 專案網址
 * @property {string} key 瀏覽器端用的公開金鑰
 * @property {typeof fetch} fetch 測試時可替換
 */

/**
 * Supabase Auth 回傳的工作階段（只列出用到的欄位）。
 * @typedef {object} SessionBody
 * @property {string} access_token
 * @property {string} refresh_token
 * @property {number} expires_at 秒
 * @property {{ id: string, user_metadata: { display_name?: string } }} user
 */

/**
 * @param {SessionBody} body
 * @returns {import('../types.js').Session}
 */
function toSession(body) {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_at * 1000,
    user: { id: body.user.id, displayName: body.user.user_metadata.display_name ?? '' },
  };
}

/** @param {SupabaseAuthOptions} options */
export function createSupabaseAuth(options) {
  /**
   * POST 到 Supabase Auth，回傳轉換後的工作階段。
   * @param {string} path 例如 /auth/v1/signup
   * @param {object} body
   */
  async function postForSession(path, body) {
    const response = await options.fetch(`${options.url}${path}`, {
      method: 'POST',
      headers: { apikey: options.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return toSession(await response.json());
  }

  return {
    /**
     * 註冊並登入（Supabase 需關閉 Confirm email，註冊後才會直接回傳工作階段）。
     * @param {{ email: string, password: string, displayName: string }} input
     */
    async signUp({ email, password, displayName }) {
      return postForSession('/auth/v1/signup', { email, password, data: { display_name: displayName } });
    },

    /**
     * 以 Email 與密碼登入。
     * @param {{ email: string, password: string }} input
     */
    async signIn({ email, password }) {
      return postForSession('/auth/v1/token?grant_type=password', { email, password });
    },
  };
}
