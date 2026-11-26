// @ts-check
// DOM 接線：只建立物件、把 getState() 畫到畫面上、把事件接到 app 的動作。
// 所有可測的邏輯都在 src/ui/app.js；這個檔案以手動驗證為主。
import { createApp } from '../src/ui/app.js';
import { createYouTubePlayer } from '../src/player/youtubePlayer.js';
import { createPlayerVideoInfo } from '../src/video/playerVideoInfo.js';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../src/data/memoryRepo.js';
import { createSupabaseClipRepo, createSupabaseCommentRepo } from '../src/data/supabaseRepo.js';
import { createClipService } from '../src/clip/clipService.js';
import { formatTimecode } from '../src/time/timecode.js';

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} id */
const input = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));

/** 錯誤碼 → 畫面上的訊息 */
/** @type {Record<string, string>} */
const ERROR_TEXT = {
  INVALID_URL: '無法辨識的 YouTube 網址',
  NO_VIDEO: '請先載入影片',
  INVALID_TIMECODE: '時間格式錯誤（請用 YouTube 顯示格式，例如 2:15 或 1:02:03）',
  INVALID_RANGE: '片段不合法：結束時間必須大於開始時間、不可超過影片長度，且開始時間至少要在影片結尾前 3 秒',
  VIDEO_NOT_FOUND: '還讀不到影片長度，請等影片載入完成後再試',
  NO_CLIP: '請先開啟一個討論串',
  NO_NAME: '請先填寫你的名字',
};

/** @type {any} 瀏覽器載入 iframe_api 後提供的全域物件 */
const w = window;

/** @returns {Promise<any>} IFrame API 載入且播放器就緒後，回傳 YT.Player */
function createYTPlayer() {
  return new Promise((resolve) => {
    const build = () => {
      const yt = new w.YT.Player('player', { events: { onReady: () => resolve(yt) } });
    };
    if (w.YT?.Player) build();
    else w.onYouTubeIframeAPIReady = build;
  });
}

const yt = await createYTPlayer();
const player = createYouTubePlayer(yt);
/** 讀取 dev/config.js；檔案不存在時回傳 null（改用記憶體版） */
async function loadConfig() {
  try {
    return (await import('./config.js')).default;
  } catch {
    return null;
  }
}

const config = await loadConfig();
const supabase = config && { url: config.supabaseUrl, key: config.supabaseKey, fetch: globalThis.fetch.bind(globalThis) };
const clipRepo = supabase ? createSupabaseClipRepo(supabase) : createMemoryClipRepo();
const commentRepo = supabase ? createSupabaseCommentRepo(supabase) : createMemoryCommentRepo();
$('storage').textContent = supabase
  ? `資料存在 Supabase（${config.supabaseUrl}）。`
  : '資料存在記憶體，重新整理後會清空（沒有找到 dev/config.js）。';
const newId = () => crypto.randomUUID();
const clipService = createClipService({
  clipRepo,
  commentRepo,
  videoInfo: createPlayerVideoInfo(yt),
  newId,
  now: () => Date.now(),
});
const app = createApp({ clipRepo, commentRepo, clipService, player, newId, now: () => Date.now() });

/**
 * @param {string} text
 * @param {() => void} onClick
 */
function button(text, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.addEventListener('click', onClick);
  return el;
}

const dateTimeFormat = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

/**
 * 建立者與建立時間，例如「小明 · 2026/11/25 14:03」。
 * @param {{ createdBy: string, createdAt: number }} item
 */
function meta(item) {
  const el = document.createElement('span');
  el.className = 'meta';
  el.textContent = `${item.createdBy} · ${dateTimeFormat.format(item.createdAt)}`;
  return el;
}

/**
 * 片段的時間區間與標題（標題空白就不顯示）。
 * @param {import('../src/types.js').Clip} clip
 */
function clipLabel(clip) {
  const range = `${formatTimecode(clip.range.startSec)} – ${formatTimecode(clip.range.endSec)}`;
  return clip.title === '' ? range : `${range}「${clip.title}」`;
}

/** 依 app.getState() 重畫整個畫面。 */
function render() {
  const state = app.getState();

  $('error').textContent = state.error === null ? '' : (ERROR_TEXT[state.error] ?? state.error);

  const clips = $('clips');
  clips.replaceChildren(
    ...state.clips.map((clip) => {
      const li = document.createElement('li');
      li.classList.toggle('selected', clip.id === state.selectedClipId);
      const title = document.createElement('span');
      title.textContent = clipLabel(clip);
      li.append(
        title,
        meta(clip),
        button('播放', () => run(() => app.playClip(clip.id))),
        button('討論串', () => run(() => app.selectClip(clip.id))),
      );
      return li;
    }),
  );
  $('no-clips').hidden = state.videoId === null || state.clips.length > 0;

  const selected = state.clips.find((c) => c.id === state.selectedClipId);
  $('thread').hidden = selected === undefined;
  $('no-thread').hidden = selected !== undefined;
  if (selected !== undefined) {
    $('thread-title').textContent = `片段 ${clipLabel(selected)} 的討論串`;
    $('comments').replaceChildren(
      ...state.comments.map((comment) => {
        const li = document.createElement('li');
        const body = document.createElement('span');
        body.className = 'comment-body';
        body.textContent = comment.body;
        li.append(body, meta(comment), button('刪除', () => run(() => app.deleteComment(comment.id))));
        return li;
      }),
    );
  }
}

/**
 * 執行一個 app 動作，完成後重畫。
 * @param {() => Promise<void> | void} action
 */
async function run(action) {
  await action();
  render();
}

/**
 * @param {string} id
 * @param {() => Promise<void> | void} action
 */
function onSubmit(id, action) {
  $(id).addEventListener('submit', (event) => {
    event.preventDefault();
    run(action);
  });
}

onSubmit('load-form', () => app.loadVideo(input('url').value.trim()));
onSubmit('clip-form', async () => {
  await app.createClip({ start: input('start').value, end: input('end').value, title: input('title').value.trim() });
  if (app.getState().error === null) {
    for (const id of ['start', 'end', 'title']) input(id).value = '';
  }
});
input('user-name').addEventListener('input', () => app.setUserName(input('user-name').value));
onSubmit('comment-form', async () => {
  const body = /** @type {HTMLTextAreaElement} */ ($('body'));
  await app.addComment(body.value);
  if (app.getState().error === null) body.value = '';
});

player.onTimeUpdate((sec) => {
  $('current').textContent = `${formatTimecode(sec)}（${sec.toFixed(2)} 秒）`;
});

render();
