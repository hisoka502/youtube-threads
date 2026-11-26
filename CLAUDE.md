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
- [x] （新增）startSec 必須至少在影片結尾前 3 秒（startSec <= durationSec - 3），否則不合法（使用者決定；原因見 5.8：YouTube 跳到離結尾太近的位置會直接判定影片已結束並從頭重播。327/328 失敗、325/328 正常）

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
- [x] （新增）同一個取消函式呼叫兩次，不影響其他訂閱者
- [x] （新增）在通知過程中取消訂閱，其他訂閱者仍收到這次通知
- [x] playRange 播到 endSec 自動暫停（從 startSec 開始播放；超過 endSec 時停回 endSec）
- [x] （新增）自動暫停後，使用者再按播放可繼續播放（自動暫停只作用一次）
- [x] （新增）片段還沒播完就播放另一個片段時，前一個片段的自動暫停不應再作用（使用者決定：playRange 自己記住每個播放器目前的片段，新的呼叫自動取消前一個）
- [x] （新增）取代前一個片段後，新片段仍會在自己的 endSec 自動暫停
- [x] （新增）不同播放器各自獨立，互不取消

### 5.8 之後才做

- [x] YouTubePlayer 轉接層（手動驗證）（使用者已在自己的瀏覽器以 `dev/index.html` 驗證通過）
  - [x] （新增）seekTo、getCurrentTime 轉呼叫 IFrame API（以假的 YT.Player 物件測試對應關係）
  - [x] （新增）play、pause、isPlaying 對應 playVideo、pauseVideo、getPlayerState
  - [x] （新增）onTimeUpdate：IFrame API 沒有時間更新事件，播放中定期讀取 getCurrentTime 通知訂閱者
  - [x] （新增）取消訂閱；沒有訂閱者時停止定期讀取（多個訂閱者共用一個計時器）
  - [x] （新增）手動驗證頁面：`dev/index.html` ＋ `dev/server.js`（Node 內建 `node:http`，不新增依賴），由使用者在自己的瀏覽器驗證
  - [x] （新增）片段 endSec 等於影片長度時，影片播到結尾（ENDED）也要停在 endSec（使用者回報：5:28 的影片，片段 5:27 – 5:28 不會停止）
  - [x] （新增）片段開始時間很接近影片結尾時，影片從頭開始播放（使用者回報）。原因已由 `dev/index.html` 的播放器紀錄確認：getDuration 回報 328 的影片，seekTo(327) 後狀態直接變成「已結束」、時間變 0，接著 playVideo 從 0 秒重播；seekTo(325) 正常。使用者決定：建立片段時就拒絕（見 5.3）
- [x] UI（見 5.9）（第一版完成，使用者已在自己的瀏覽器驗證）

### 5.9 UI 畫面狀態（ui/app）

使用者決定：畫面狀態邏輯寫成不碰 DOM 的純 JavaScript（`src/ui/app.js`），用 `node:test` 測；接 DOM 的程式寫得很薄，手動驗證（與 YouTubePlayer 相同做法）。第一版包含：貼網址載入影片、建立片段、片段列表與播放、討論串留言。留言先不驗證（使用者決定）。

- [x] 貼上有效網址 → 狀態有 videoId，並列出該影片的片段
- [x] 無效網址 → 狀態有錯誤，不載入
- [x] （新增）載入成功後，清除先前的錯誤
- [x] （新增）已載入影片 A 後貼上無效網址：維持影片 A 與片段列表，只顯示錯誤（使用者決定）
- [x] 建立片段：輸入 timecode 字串，成功後列表多一筆
- [x] （新增）建立片段：結束時間留空 → 由 resolveRange 補為開始 + 5 秒
- [x] （新增）建立片段：尚未載入影片時 → 狀態有錯誤 NO_VIDEO，不建立
- [x] 建立片段：時間格式錯誤 → 狀態有錯誤，不建立
- [x] （新增）建立片段成功後，清除先前的錯誤
- [x] 建立片段：ClipService 回報錯誤（INVALID_RANGE、VIDEO_NOT_FOUND）→ 狀態有錯誤（以 INVALID_RANGE 測；兩者走同一條路徑，直接轉交 result.error）
- [x] 點片段 → 以 playRange 播放該片段（以 FakePlayer 測；player 由 createApp 注入）
- [x] （新增）playClip 給的 clipId 不在目前片段列表 → 什麼都不做（使用者決定：不播放、不顯示錯誤）
- [x] （新增）DOM 接線時：YouTube 播放器在影片載入後才建立，與 createApp 一開始就注入 player 的方式衝突 → 使用者決定：只建立一個 YT.Player，換影片時用 loadVideoById（見 5.10）
- [x] 選取片段 → 列出該討論串的留言
- 使用者決定：清掉不屬於目前載入影片的任何討論串（選取的討論串必須在目前的片段列表中）
  - [x] （新增）載入另一部影片後，清除先前的選取與留言，列出該影片的片段
  - [x] （新增）重新載入同一部影片時，保留選取的討論串（它仍屬於該影片）
- [x] 在選取的討論串新增留言 → 留言列表多一筆（id 由注入的 newId 產生）
- [x] （新增）尚未開啟討論串時新增留言 → 狀態有錯誤 NO_CLIP，不存入（使用者決定：留言只能在開啟的討論串中新增；DOM 層在未開啟討論串時不提供留言輸入）
- [x] （新增）新增留言成功後，清除先前的錯誤（使用者決定）
- [x] （新增）開啟討論串後，清除先前的錯誤（使用者決定）
- [x] 刪除片段 → 從列表移除（透過 ClipService.deleteClip，留言一併刪除）。使用者決定：刪除討論串不開放給所有人操作，畫面上不提供刪除片段的按鈕；邏輯保留，待做權限時（第 7 節）給有權限的人使用
- [x] （新增）刪除的是目前選取的片段 → 清除選取與留言列表（依上面的使用者決定）
- [x] 刪除留言 → 從留言列表移除
- [x] DOM 接線頁面（手動驗證）：`dev/app.html` ＋ `dev/app.js`，`node dev/server.js` 後開 http://localhost:8080/dev/app.html（使用者已在自己的瀏覽器驗證通過）
- [x] （新增）播放片段時，討論串自動換成該片段的（使用者要求）

### 5.10 DOM 接線的前置（使用者決定）

- PlayerAdapter 新增 `load(videoId)`；app.loadVideo 成功時呼叫它。YouTubePlayer 轉呼叫 `cueVideoById`（原為 `loadVideoById`；使用者決定載入影片但不自動播放）。
- VideoInfoProvider 從播放器讀取影片長度（`getDuration`），不需 API 金鑰；只能取得播放器目前載入的影片。
- 資料先用記憶體版，重新整理頁面即清空（使用者同意）。

- [x] FakePlayer：load(videoId) 後，測試專用的 getLoadedVideoId() 回傳該 ID
- [x] app.loadVideo 成功時呼叫 player.load(videoId)
- [x] app.loadVideo 無效網址時不呼叫 player.load
- [x] YouTubePlayer：load 轉呼叫 cueVideoById（原為 loadVideoById，使用者決定不自動播放）
- [x] playerVideoInfo：播放器目前載入的影片 → 回傳 getDuration
- [x] playerVideoInfo：不是目前載入的影片 → null
- [x] playerVideoInfo：getDuration 為 0（影片資訊尚未載入）→ null

### 5.11 補齊資料欄位（使用者決定）

- 片段標題（title）選填，未填存空字串，畫面上空白就不顯示。
- 建立者（createdBy）：頁面上填一次名字，之後建立的片段與留言都帶這個名字；未填名字不能建立片段或留言（錯誤 NO_NAME）。名字去掉前後空白，只有空白視同未填。
- 建立時間（createdAt）：片段與留言都記錄，單位為毫秒（與 `Date.now()` 相同），由注入的 `now()` 提供；畫面上顯示日期與時間。
- 影片標題先不做（使用者決定）。

- [x] ClipService：建立片段時存入 title；未提供時為空字串
- [x] ClipService：存入 createdBy
- [x] ClipService：createdAt 由注入的 now() 提供
- [x] app：setUserName(name) 後，狀態有 userName（去掉前後空白）
- [x] app：未填名字時建立片段 → 狀態有錯誤 NO_NAME，不建立（先檢查 NO_VIDEO）
- [x] app：建立片段時，把 title 與 userName（createdBy）交給 ClipService
- [x] app：未填名字時新增留言 → 狀態有錯誤 NO_NAME，不存入（先檢查 NO_CLIP）
- [x] app：新增留言時帶 createdBy（userName）與 createdAt（注入的 now()）
- [x] DOM 接線：名字欄位、片段標題欄位、顯示建立者與建立時間（手動驗證；使用者已在自己的瀏覽器驗證通過）

### 5.12 Supabase 版儲存（使用者決定：先做資料庫，登入先不做；由 Claude 挑選免費方案）

- 選用 Supabase 免費方案（每專案 500 MB、一週無活動會暫停，可在管理頁面恢復）。以瀏覽器內建 `fetch` 呼叫它的 REST API，不新增 npm 依賴。
- 沒有登入：任何拿到頁面的人都可以讀取、新增片段與留言、刪除留言；刪除片段在資料庫層以 RLS 禁止（對應 5.9 的使用者決定）。
- 資料表欄位用 snake_case（`video_id`、`start_sec`…），Repository 負責與程式內的 camelCase 物件互轉。
- 留言順序以資料庫自動遞增的 `seq` 欄位排序（等於建立順序，與記憶體版的「呼叫 add 的順序」一致）。
- `fetch` 由外部注入，測試時用假的 fetch 檢查送出的請求與回應的轉換；與真正的 Supabase 連線以手動驗證。

- [x] ClipRepository.add → POST `/rest/v1/clips`，金鑰只放在 apikey 標頭（新式 publishable key 不是 JWT，不可放在 Authorization），body 為 snake_case 的資料列
- [x] ClipRepository.listByVideo → GET `/rest/v1/clips?video_id=eq.{id}&order=seq.asc`，把資料列轉回 Clip
- [x] ClipRepository.remove → DELETE `/rest/v1/clips?id=eq.{id}`
- [x] CommentRepository.add → POST `/rest/v1/comments`
- [x] CommentRepository.listByClip → GET `/rest/v1/comments?clip_id=eq.{id}&order=seq.asc`，把資料列轉回 Comment
- [x] CommentRepository.remove → DELETE `/rest/v1/comments?id=eq.{id}`
- [x] 查詢參數中的 id 經過 URL 編碼
- [x] 伺服器回應失敗（非 2xx）→ 拋出錯誤，訊息包含狀態碼
- [x] 建表與 RLS 的 SQL（`db/schema.sql`），由使用者在 Supabase 執行（片段不可刪除；留言可讀、新增、刪除）
- [x] DOM 接線：設定檔有 Supabase 網址與金鑰時改用 Supabase 版（手動驗證）。`dev/config.js`（已列入 .gitignore，範本 `dev/config.example.js`）；使用者已以真正的 Supabase 專案驗證通過（曾遇到 PGRST205 找不到資料表，執行 `db/schema.sql` 後解決）
- Repository 拋出錯誤（網路或 Supabase 失敗）時 → 使用者決定：畫面顯示通用錯誤 STORAGE_FAILED（「資料存取失敗，請稍後再試」），詳細原因交給注入的 logError（畫面上用 console.error 寫到主控台）
  - [x] 新增留言時 Repository 失敗 → 狀態有錯誤 STORAGE_FAILED，錯誤物件交給 logError
  - [x] 載入影片時 Repository 失敗 → 同上
  - [x] （新增）載入影片時讀取片段失敗 → 播放器不換影片（使用者決定：片段讀取成功後才呼叫 player.load，失敗時播放器與片段列表都停在舊影片，避免畫面不一致）
  - [x] 其他會存取資料的動作（建立片段、開啟討論串、播放片段、刪除留言、刪除片段）同樣處理（播放片段與開啟討論串共用 openThread，以開啟討論串測）
- 上一個動作還在等回應時又執行下一個動作會互相干擾 → 使用者決定：處理中暫停操作
  - [x] 動作進行中，狀態的 busy 為 true；完成後為 false
  - [x] busy 時呼叫其他動作會被忽略（不改變狀態、不存取資料）。每個會存取資料的動作一開始就檢查 busy（以新增留言測）
  - [x] 動作失敗（STORAGE_FAILED）後，busy 也恢復為 false
  - [x] DOM：顯示 STORAGE_FAILED 訊息；busy 時停用按鈕與表單（手動驗證；使用者已在自己的瀏覽器驗證通過）

### 5.13 每部影片有自己的網址（使用者決定：分享連結採用「每部影片一個網址」）

- 頁面網址加上 `?v=影片ID`。打開這種網址時自動載入該影片與片段；載入影片後，瀏覽器網址列也更新成這個網址，方便複製分享。
- 讀取與產生網址的邏輯寫成純函式（`src/url/pageUrl.js`）；讀寫 `location`、`history` 的部分在 DOM 層，手動驗證。

- [x] pageVideoId：從頁面網址的查詢字串取出 v 參數；沒有或空字串時為 null
- [x] pageUrlFor：在頁面網址加上（或取代）v 參數，保留其他部分
- [x] DOM：打開帶 `?v=` 的網址時自動載入；載入影片後更新網址列（手動驗證；使用者已在自己的瀏覽器驗證通過）

### 5.14 登入（使用者決定：盡快做，讓人測試）

- Email ＋ 密碼，註冊後不需收信驗證（在 Supabase 關閉 Confirm email）。開放註冊。
- 未登入只能看（讀取片段與留言）；登入後可以建立片段、留言，只能刪除自己的留言；片段仍然沒有人能刪（後兩點為 Claude 依先前建議的預設，使用者可改）。
- 註冊時填顯示名稱，取代原本頁面上的「你的名字」欄位；createdBy 用顯示名稱。
- 以 `fetch` 呼叫 Supabase Auth 的 REST API（`/auth/v1/...`），不新增依賴。登入後，資料庫請求在 Authorization 標頭帶使用者的 access token；權限由資料庫 RLS 依 `auth.uid()` 判斷。
- 片段與留言新增 userId（資料庫欄位 user_id），用來判斷「自己的留言」。

- [ ] auth.signUp：POST `/auth/v1/signup`（email、password、顯示名稱），回傳工作階段（access token、refresh token、到期時間、使用者 id 與顯示名稱）
- [ ] auth.signIn：POST `/auth/v1/token?grant_type=password`，回傳工作階段
- [ ] auth：Supabase 回應失敗時拋出錯誤（含 Supabase 的錯誤碼）
- [ ] auth.refresh：POST `/auth/v1/token?grant_type=refresh_token`，回傳新的工作階段
- [ ] Repository：有 access token 時，在 Authorization 標頭帶 `Bearer {token}`；沒有時不帶
- [ ] Repository：片段與留言的 userId 與 user_id 互轉
- [ ] 工作階段：access token 快到期時，先用 refresh token 換新的再回傳
- [ ] app：登入、註冊、登出改變狀態的 user；未登入時建立片段或留言 → 錯誤 NOT_SIGNED_IN
- [ ] app：createdBy 用登入者的顯示名稱，userId 用登入者的 id
- [ ] app：只能刪除自己的留言（判斷函式供畫面決定是否顯示刪除按鈕；刪除別人的留言 → 什麼都不做）
- [ ] 登入失敗（帳號密碼錯誤、Email 已被註冊等）→ 畫面顯示錯誤
- [ ] 資料表與 RLS 更新的 SQL（`db/migrations/002_auth.sql`）
- [ ] DOM：登入／註冊表單、登出、重新整理後維持登入；未登入時隱藏建立與留言表單（手動驗證）

## 6. 待決定事項

處理到相關測試時，先停下來問使用者，不要自行假設：

- ~~時間單位用秒（可含小數，與 YouTube API 一致）還是毫秒？~~ **已決定：秒，可含小數**（與 YouTube IFrame API 一致）。比較兩個時間時避免用 `===` 比較小數運算結果。
- ~~回覆只允許兩層（主文＋回覆），還是無限巢狀？~~ **已決定：沒有回覆功能**，每個片段是一個討論串，留言線性排列。
- ~~驗證邏輯放在 Repository 內，還是另設 ClipService？~~ **已決定：另設 ClipService**。Repository 只負責存取，驗證邏輯放在 Service，只寫一次。
- ~~使用情境：個人筆記、小團體討論，還是公開社群？~~ **已決定：小團體討論**。登入、權限仍在第 7 節暫不處理。
- ~~片段型態：一定要起訖區間，還是也允許單一時間點？~~ **已決定：一定是起訖區間**（endSec 必須大於 startSec）。使用者未提供 endSec 時，endSec = startSec + 5 秒；超過影片長度則截到影片結尾。

## 7. 暫不處理（YAGNI）

YouTube 影片載入失敗的處理（影片不存在、私人影片等，需接 IFrame API 的 onError；使用者決定先不做）、即時同步、通知、權限、搜尋、分享連結（「每部影片一個網址」以外的形式，如每個討論串一個網址、總覽頁）、手機版排版、留言內時間戳（原 5.4）。

## 8. 參考

- Kent Beck, "Canon TDD"（2023）
- Kent Beck, *Test-Driven Development: By Example*（2002）
- Kent Beck, *Tidy First?*（2023）
- YouTube IFrame Player API 官方文件
