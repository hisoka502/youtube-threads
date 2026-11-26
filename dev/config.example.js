// @ts-check
// Supabase 設定範本。複製成同一資料夾的 config.js 後填入自己專案的值。
// config.js 已列在 .gitignore，不會被 commit。
// 兩個值都在 Supabase 管理頁面：Project Settings → API Keys / Data API。
// 金鑰請用瀏覽器端用的公開金鑰（publishable key，或舊式的 anon key），不要用 secret / service_role key。
export default {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseKey: 'sb_publishable_xxxx',
};
