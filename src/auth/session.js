// @ts-check
// 登入工作階段的管理：保存、提供 access token。

/**
 * 工作階段的存放處（畫面上用 localStorage，測試時用記憶體）。
 * @typedef {object} SessionStorage
 * @property {() => import('../types.js').Session | null} load
 * @property {(session: import('../types.js').Session | null) => void} save
 */

/**
 * @param {object} deps
 * @param {{ refresh: (refreshToken: string) => Promise<import('../types.js').Session> }} deps.auth
 * @param {SessionStorage} deps.storage
 * @param {() => number} deps.now 目前時間（毫秒）
 */
export function createSessionManager({ storage }) {
  let session = storage.load();
  return {
    /** @param {import('../types.js').Session | null} next 登出時傳 null */
    set(next) {
      session = next;
      storage.save(next);
    },

    /** 登入使用者的 access token；未登入時為 null */
    async getAccessToken() {
      return session?.accessToken ?? null;
    },
  };
}
