# YoutubeThreads

YouTube 片段討論串。開發規範見 [CLAUDE.md](CLAUDE.md)。

需要 Node.js >= 22，無外部依賴。

```bash
node --test
```

## 手動驗證 YouTubePlayer

YouTube IFrame Player API 只能在瀏覽器中執行，`node --test` 無法涵蓋。在自己的電腦上：

```bash
npm run dev
```

打開 http://localhost:8080/dev/ ，依頁面上的「驗證項目」逐項確認。
