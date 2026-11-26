// @ts-check
// 部署用的 Supabase 設定（GitHub Pages 上使用）。本機有 dev/config.js 時會優先使用本機的設定。
// publishable key 本來就公開給瀏覽器，資料安全靠資料庫的權限規則（RLS）。
// 不可放 secret / service_role key。
export default {
  supabaseUrl: 'https://qjxynuykmbixvrtqunaz.supabase.co',
  supabaseKey: 'sb_publishable_owyhqdMtfUwYzdUIAqZqhA_CQqY-osZ',
};
