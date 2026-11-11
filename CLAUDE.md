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
- Comment：id、clipId、body、createdBy、createdAt

片段之間允許重疊。每個片段就是一個討論串；討論串內的留言依建立順序線性排列，沒有「回覆某則留言」的功能（使用者決定）。

### 建議檔案結構

```
src/
  types.js            JSDoc typedef
  url/parseUrl.js
  time/timecode.js
  clip/clipRules.js
  clip/clipService.js
  data/memoryRepo.js
  video/fakeVideoInfo.js    VideoInfoProvider 假實作
  player/fakePlayer.js
  player/playRange.js
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

- [x] `"2:15"` → 135（原為 `"02:15"`；使用者決定只接受 YouTube 顯示格式，`"02:15"` 改為回傳 null）
- [x] `"1:02:03"` → 3723
- [x] 135 → `"2:15"`（使用者確認 YouTube 播放器分鐘不補 0）
- [x] 超過一小時的秒數格式化為 h:mm:ss
- [x] 格式錯誤的字串 → null（使用者決定：回傳 null，不拋出錯誤）
- [x] （新增）formatTimecode 遇到小數秒 → 無條件捨去（使用者在 YouTube 播放器實測：125.7 秒顯示 2:05）
- [x] （新增）parseTimecode 不接受小數秒（如 `"2:15.5"` → null）（使用者決定：只接受 YouTube 顯示格式）
- [x] （新增）formatTimecode(0) → `"0:00"`；整點小時 3600 → `"1:00:00"`
- [x] （新增）parseTimecode 不接受單一數字（如 `"90"` → null）（使用者決定：只接受 YouTube 顯示格式）
- [x] （新增）目前仍被接受的格式錯誤輸入，應回傳 null：科學記號 `"1e2"`、前後空白 `" 5"`、負數 `"-5"`、超過三段 `"1:2:3:4"`
- 不是 YouTube 顯示格式的輸入 → null（使用者決定）：
  - [x] 秒只有一位 `"2:5"`
  - [x] h:mm:ss 的分只有一位 `"1:2:03"`
  - [x] m:ss 的分 ≥ 60 `"75:00"`
  - [x] 分鐘補 0 `"02:15"`
  - [x] 小時補 0 `"01:02:03"`
  - [x] （新增）小時為 0 `"0:01:00"`（YouTube 會顯示為 `1:00`）

### 5.3 片段規則（clipRules）

- [x] endSec > startSec 才合法
- [x] startSec >= 0
- [x] endSec 不可超過影片長度
- [x] （新增）未提供 endSec 時，endSec = startSec + 5（使用者決定：預設 5 秒）
- [x] （新增）有提供 endSec 時維持原值
- [x] （新增）startSec + 5 超過影片長度時，endSec 截到影片長度（使用者決定）
- [x] （新增）使用者自己填的 endSec 超過影片長度時：不截斷，交由 isValidRange 判為不合法（使用者決定：維持原值，由畫面提示使用者修正）

### 5.4 留言內時間戳（timestamps）— 已移除

使用者決定：討論串先不開放在留言中寫時間戳，因為片段建立時已經限定了時間範圍。已寫好的 `findTimestamps` 已移除，移到第 7 節；需要時可從 git 歷史找回（commit `9c3d2a2`）。

### 5.5 回覆規則（replyRules）— 已移除

使用者決定：服務沒有「回覆」功能，每個片段是一個討論串，留言線性排列。Comment 不再有 parentId，已寫好的 `isValidReply` 已移除；需要時可從 git 歷史找回（commit `5ce66d0`）。

### 5.6 記憶體版儲存（memoryRepo）

- [x] 新增片段後可依 videoId 列出
- [x] 刪除片段
- [x] 新增留言後可依 clipId 列出
- [x] （新增）依 clipId 列出的留言依建立順序排列（討論串為線性對話；建立順序 = 呼叫 add 的順序）
- [x] 刪除留言
- [x] （新增）列出的結果被呼叫端修改時，不影響 Repository 內的資料（回傳複本）

### 5.6.1 ClipService（建立片段的流程，使用者決定另設 Service）

- [x] 由 VideoInfoProvider（假實作）取得影片長度，經 resolveRange 補齊後存入 ClipRepository
- [x] isValidRange 不通過時不存入，並回報錯誤（`{ ok: false, error: 'INVALID_RANGE' }`）
- [x] （新增）刪除片段時，該片段討論串的留言一併刪除（使用者決定）
- [x] （新增）id 由 Service 產生（透過注入的 newId 函式；測試時可預測）
- [x] （新增）找不到影片時（getDurationSec 回傳 null）不存入，回報 VIDEO_NOT_FOUND

### 5.7 假播放器（fakePlayer）與 playRange

`playRange` 是邏輯，依第 4 節放在轉接層之外，寫成獨立函式 `playRange(player, range)`，只使用 PlayerAdapter 的基本操作，假播放器與正式播放器共用。FakePlayer 另有測試專用的 `advance(sec)` 用來推進時間，不屬於 PlayerAdapter 介面。

- [x] seekTo 後 getCurrentTime 回傳該秒數（起始時間為 0）
- [x] （新增）play 後 advance 會推進時間；pause 時 advance 不推進
- [x] onTimeUpdate 可訂閱與取消訂閱（回傳取消訂閱的函式）
- [ ] （新增）同一個取消函式呼叫兩次，不影響其他訂閱者
- [ ] （新增）在通知過程中取消訂閱，其他訂閱者仍收到這次通知
- [ ] playRange 播到 endSec 自動暫停（從 startSec 開始播放）

### 5.8 之後才做

- [ ] YouTubePlayer 轉接層（手動驗證）
- [ ] UI

## 6. 待決定事項

處理到相關測試時，先停下來問使用者，不要自行假設：

- ~~時間單位用秒（可含小數，與 YouTube API 一致）還是毫秒？~~ **已決定：秒，可含小數**（與 YouTube IFrame API 一致）。比較兩個時間時避免用 `===` 比較小數運算結果。
- ~~回覆只允許兩層（主文＋回覆），還是無限巢狀？~~ **已決定：沒有回覆功能**，每個片段是一個討論串，留言線性排列。
- ~~驗證邏輯放在 Repository 內，還是另設 ClipService？~~ **已決定：另設 ClipService**。Repository 只負責存取，驗證邏輯放在 Service，只寫一次。
- 使用情境：個人筆記、小團體討論，還是公開社群？（影響權限設計，UI 階段前要確定）
- ~~片段型態：一定要起訖區間，還是也允許單一時間點？~~ **已決定：一定是起訖區間**（endSec 必須大於 startSec）。使用者未提供 endSec 時，endSec = startSec + 5 秒；超過影片長度則截到影片結尾。

## 7. 暫不處理（YAGNI）

登入與帳號、後端與資料庫選型、即時同步、通知、權限、搜尋、分享連結、手機版排版、留言內時間戳（原 5.4）。

## 8. 參考

- Kent Beck, "Canon TDD"（2023）
- Kent Beck, *Test-Driven Development: By Example*（2002）
- Kent Beck, *Tidy First?*（2023）
- YouTube IFrame Player API 官方文件
