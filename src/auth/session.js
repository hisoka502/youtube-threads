// @ts-check
// 登入工作階段的管理：保存、提供 access token（快到期時先換新）。

/** access token 離到期不到這麼久時，先換新的（毫秒） */
const REFRESH_BEFORE_MS = 60_000;

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
export function createSessionManager({ auth, storage, now }) {
  let session = storage.load();

  /** @param {import('../types.js').Session | null} next 登出時傳 null */
  function set(next) {
    session = next;
    storage.save(next);
  }

  return {
    set,

    /** 登入使用者的 access token；未登入時為 null */
    async getAccessToken() {
      if (session === null) return null;
      if (session.expiresAt - now() < REFRESH_BEFORE_MS) {
        try {
          set(await auth.refresh(session.refreshToken));
        } catch (error) {
          // Supabase 回應了錯誤碼：refresh token 已失效，視同登出。
          // 沒有錯誤碼（例如網路錯誤）：不登出，把錯誤丟給呼叫端
          if (!(error instanceof Error && 'code' in error)) throw error;
          set(null);
        }
      }
      return session?.accessToken ?? null;
    },
  };
}
