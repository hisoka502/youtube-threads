# YouTube 片段討論串 — 開發前製文件

給 Claude Code 讀的專案說明。開始任何工作前先讀完本文件。

## 1. 專案目標

一個網頁應用：使用者貼上 YouTube 網址，在影片上標記一段時間區間（片段），並針對該片段開一個討論串留言。

## 2. 硬性限制

- **不下載、不剪輯 YouTube 影片。** 一律使用 YouTube IFrame Player API 嵌入原影片，系統只儲存「影片 ID ＋ 開始秒數 ＋ 結束秒數」。下載影片違反 YouTube 服務條款。
- **語言：純 JavaScript（ES Modules），不使用 TypeScript。** 型別用 JSDoc 註解描述，每個檔案開頭加 `// @ts-check`。
- **測試：Node 內建 `node:test` 與 `node:assert/strict`。** 不安裝測試框架。執行指令：`node --test`。
- **未經使用者同意，不新增任何 npm 依賴。**

## 3. 開發流程：Kent Beck 的 Canon TDD

嚴格依照以下循環，一次只處理一個測試：

1. 從第 5 節的測試清單挑一個項目。
2. 寫成一個可執行的測試，先執行並確認它失敗（紅），把失敗訊息給使用者看。
3. 寫最少的程式碼讓它通過（綠）。可以先寫死回傳值（Fake It），再用下一個測試案例逼出真正的實作（Triangulation）。
4. 視需要重構，重構時不改變行為、不加新功能，所有測試必須保持綠燈。
5. 在第 5 節勾選完成項目；過程中想到的新案例，加進清單，不要立刻實作。
6. 回到步驟 1。

### 規則

- 不可以一次寫好多個測試再一起實作。
- 沒有失敗的測試，就不寫產品程式碼。
- 介面（函式名稱、參數、回傳值）在寫測試時才決定，不預先設計完整的型別系統。決定後把 JSDoc typedef 補進 `src/types.js`。
- **Commit 規則（Tidy First?）：**
  - 每次測試轉綠就 commit 一次。
  - 「整理結構」與「改變行為」分成不同的 commit，不要混在一起。
  - Commit 訊息前綴：`test:`、`feat:`、`refactor:`、`tidy:`。
- **簡單設計（XP / YAGNI）：** 只寫目前測試需要的東西。第 7 節列的項目在被測試需要之前不要碰。

## 4. 架構方向

UI 與商業邏輯只依賴抽象介面；每個介面有「假實作」（開發與測試用）和「正式實作」兩種。

| 介面 | 假實作 | 正式實作（後期） |
|---|---|---|
| PlayerAdapter（播放器） | FakePlayer：以可控時間模擬播放 | YouTubePlayer：包裝 IFrame API |
| VideoInfoProvider（影片資訊） | 回傳固定資料 | YouTube Data API |
| ClipRepository / CommentRepository（資料存取） | 記憶體版 | 待定（Supabase / Firebase 等） |

正式的 YouTubePlayer 轉接層要寫得很薄，幾乎不含邏輯，以手動驗證為主；所有可測的邏輯放在轉接層之外。

### 核心資料（初步，以測試為準）

- Video：id、youtubeId、title、durationSec
- Clip：id、videoId、range（startSec, endSec）、title、createdBy、createdAt
- Comment：id、clipId、parentId（可為 null）、body、createdBy、createdAt

片段之間允許重疊。

### 建議檔案結構

```
src/
  types.js            JSDoc typedef
  url/parseUrl.js
  time/timecode.js
  clip/clipRules.js
  comment/timestamps.js
  comment/replyRules.js
  data/memoryRepo.js
  player/fakePlayer.js
  player/youtubePlayer.js   （最後才做）
test/
  （與 src 對應的 *.test.js）
```

## 5. 測試清單

由純邏輯往外，依序進行：

### 5.1 parseUrl（網址 → youtubeId）

- [x] `https://www.youtube.com/watch?v=ID` → ID
- [x] `https://youtu.be/ID` → ID
- [x] 帶其他參數（如 `&t=30s`、`&list=`）仍取出正確 ID
- [x] 無效網址 → null
- [x] （新增）其他 YouTube 主機：`youtube.com`（無 www）、`m.youtube.com`
- [x] （新增）其他路徑：`/shorts/ID`、`/embed/ID`、`/live/ID`
- [x] （新增）`watch` 網址缺少 `v` 參數、`youtu.be/` 無 ID → null
- [x] （新增）ID 格式檢查：使用者決定先不檢查格式，但預留可注入檢查函式的介面（預設接受任何非空字串）

### 5.2 時間格式（timecode）

- [x] `"02:15"` → 135
- [x] `"1:02:03"` → 3723
- [x] 135 → `"02:15"`
- [x] 超過一小時的秒數格式化為 h:mm:ss
- [ ] 格式錯誤的字串的處理方式（寫測試時與使用者確認）
- [ ] （新增）formatTimecode 遇到小數秒（如 135.42）：無條件捨去、四捨五入，還是顯示小數？（與使用者確認）
- [ ] （新增）parseTimecode 是否接受小數秒（如 `"02:15.5"`）？
- [ ] （新增）formatTimecode(0) → `"00:00"`；整點小時 3600 → `"1:00:00"`
- [ ] （新增）parseTimecode 是否接受單一數字（如 `"90"` → 90）？

### 5.3 片段規則（clipRules）

- [ ] endSec > startSec 才合法
- [ ] startSec >= 0
- [ ] endSec 不可超過影片長度

### 5.4 留言內時間戳（timestamps）

- [ ] 從留言文字找出所有時間戳及其秒數
- [ ] 沒有時間戳時回傳空陣列

### 5.5 回覆規則（replyRules）

- [ ] parentId 必須指向同一片段內的留言
- [ ] 巢狀層數限制（見第 6 節待決定事項）

### 5.6 記憶體版儲存（memoryRepo）

- [ ] 新增片段後可依 videoId 列出
- [ ] 刪除片段
- [ ] 新增留言後可依 clipId 列出
- [ ] 刪除留言

### 5.7 假播放器（fakePlayer）

- [ ] seekTo 後 getCurrentTime 回傳該秒數
- [ ] playRange 播到 endSec 自動暫停
- [ ] onTimeUpdate 可訂閱與取消訂閱

### 5.8 之後才做

- [ ] YouTubePlayer 轉接層（手動驗證）
- [ ] UI

## 6. 待決定事項

處理到相關測試時，先停下來問使用者，不要自行假設：

- ~~時間單位用秒（可含小數，與 YouTube API 一致）還是毫秒？~~ **已決定：秒，可含小數**（與 YouTube IFrame API 一致）。比較兩個時間時避免用 `===` 比較小數運算結果。
- 回覆只允許兩層（主文＋回覆），還是無限巢狀？
- 驗證邏輯放在 Repository 內，還是另設 ClipService？
- 使用情境：個人筆記、小團體討論，還是公開社群？（影響權限設計，UI 階段前要確定）
- 片段型態：一定要起訖區間，還是也允許單一時間點？

## 7. 暫不處理（YAGNI）

登入與帳號、後端與資料庫選型、即時同步、通知、權限、搜尋、分享連結、手機版排版。

## 8. 參考

- Kent Beck, "Canon TDD"（2023）
- Kent Beck, *Test-Driven Development: By Example*（2002）
- Kent Beck, *Tidy First?*（2023）
- YouTube IFrame Player API 官方文件
