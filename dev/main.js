// @ts-check
// 手動驗證頁面的接線程式：只把已經有測試的函式接起來，不放新的邏輯。
import { parseUrl } from '../src/url/parseUrl.js';
import { parseTimecode, formatTimecode } from '../src/time/timecode.js';
import { resolveRange, isValidRange } from '../src/clip/clipRules.js';
import { createYouTubePlayer } from '../src/player/youtubePlayer.js';
import { playRange } from '../src/player/playRange.js';

/** @param {string} id */
const $ = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));

/** @type {any} 瀏覽器載入 iframe_api 後提供的全域物件 */
const w = window;

/** IFrame API 載入完成時 resolve */
const apiReady = new Promise((resolve) => {
  if (w.YT?.Player) {
    resolve(undefined);
  } else {
    w.onYouTubeIframeAPIReady = () => resolve(undefined);
  }
});

/** @type {import('../src/types.js').PlayerAdapter | null} */
let player = null;
/** @type {any} */
let ytPlayer = null;
let durationSec = 0;

/** @param {string} text @param {boolean} [isError] */
function showMessage(text, isError = false) {
  const el = $('message');
  el.textContent = text;
  el.className = isError ? 'error' : '';
}

$('load').addEventListener('click', async () => {
  const videoId = parseUrl($('url').value.trim());
  if (videoId === null) {
    showMessage('無法辨識的 YouTube 網址', true);
    return;
  }
  await apiReady;

  // 重新載入時，換一個新的容器給新的播放器
  ytPlayer?.destroy();
  $('player-box').innerHTML = '<div id="player"></div>';
  player = null;

  ytPlayer = new w.YT.Player('player', {
    videoId,
    events: {
      /** @param {any} event */
      onReady(event) {
        player = createYouTubePlayer(event.target);
        durationSec = event.target.getDuration();
        $('duration').textContent = formatTimecode(durationSec);
        player.onTimeUpdate((sec) => {
          $('current').textContent = `${formatTimecode(sec)}（${sec.toFixed(2)} 秒）`;
        });
        showMessage(`已載入影片 ${videoId}`);
      },
      onStateChange() {
        if (!player) return;
        $('state').textContent = player.isPlaying() ? '播放中' : '未播放';
        const sec = player.getCurrentTime();
        $('current').textContent = `${formatTimecode(sec)}（${sec.toFixed(2)} 秒）`;
      },
    },
  });
});

$('play').addEventListener('click', () => {
  if (!player) {
    showMessage('請先載入影片', true);
    return;
  }
  const startSec = parseTimecode($('start').value);
  if (startSec === null) {
    showMessage('開始時間格式錯誤（請用 YouTube 顯示格式，例如 2:15 或 1:02:03）', true);
    return;
  }
  const endText = $('end').value;
  const endSec = endText === '' ? undefined : parseTimecode(endText);
  if (endSec === null) {
    showMessage('結束時間格式錯誤（請用 YouTube 顯示格式，例如 2:20）', true);
    return;
  }
  const range = resolveRange({ startSec, endSec }, durationSec);
  if (!isValidRange(range, durationSec)) {
    showMessage(`片段不合法：${formatTimecode(range.startSec)} – ${formatTimecode(range.endSec)}（影片長度 ${formatTimecode(durationSec)}）`, true);
    return;
  }
  playRange(player, range);
  showMessage(`播放片段 ${formatTimecode(range.startSec)} – ${formatTimecode(range.endSec)}`);
});
