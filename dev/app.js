// @ts-check
// DOM 接線：只建立物件、把 getState() 畫到畫面上、把事件接到 app 的動作。
// 所有可測的邏輯都在 src/ui/app.js；這個檔案以手動驗證為主。
import { createApp } from '../src/ui/app.js';
import { createYouTubePlayer } from '../src/player/youtubePlayer.js';
import { createPlayerVideoInfo } from '../src/video/playerVideoInfo.js';
import { createMemoryClipRepo, createMemoryCommentRepo } from '../src/data/memoryRepo.js';
import { createSupabaseClipRepo, createSupabaseCommentRepo } from '../src/data/supabaseRepo.js';
import { createSupabaseAuth } from '../src/auth/supabaseAuth.js';
import { createSessionManager } from '../src/auth/session.js';
import { createClipService } from '../src/clip/clipService.js';
import { formatTimecode } from '../src/time/timecode.js';
import { pageVideoId, pageSetId, pageUrlFor } from '../src/url/pageUrl.js';

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
  NOT_SIGNED_IN: '請先登入',
  NO_NAME: '請填寫顯示名稱',
  INVALID_CREDENTIALS: 'Email 或密碼錯誤',
  EMAIL_TAKEN: '這個 Email 已經註冊過，請直接登入',
  WEAK_PASSWORD: '密碼太短或太簡單（至少 6 個字元）',
  AUTH_FAILED: '登入失敗，請稍後再試（詳細原因在瀏覽器主控台）',
  STORAGE_FAILED: '資料存取失敗，請稍後再試（詳細原因在瀏覽器主控台）',
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

/** 工作階段存在 localStorage，重新整理頁面後仍維持登入；瀏覽器不允許存取時當作沒有保存 */
const sessionStorageKey = 'youtube-threads-session';
const localSessionStorage = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(sessionStorageKey) ?? 'null');
    } catch {
      return null;
    }
  },
  /** @param {import('../src/types.js').Session | null} session */
  save(session) {
    try {
      if (session === null) localStorage.removeItem(sessionStorageKey);
      else localStorage.setItem(sessionStorageKey, JSON.stringify(session));
    } catch {
      // 無法保存時，只是重新整理後要重新登入
    }
  },
};

/** 沒有 Supabase 時用的本機假登入：任何 Email 與密碼都能登入（只供開發） */
const localAuth = {
  /** @param {{ email: string, displayName?: string }} input */
  async signIn({ email, displayName }) {
    return {
      accessToken: 'local', refreshToken: 'local', expiresAt: Date.now() + 365 * 86400_000,
      user: { id: `local-${email}`, displayName: displayName ?? email.split('@')[0] },
    };
  },
  /** @param {{ email: string, password: string, displayName: string }} input */
  async signUp(input) { return localAuth.signIn(input); },
  async refresh() { return /** @type {any} */ (localSessionStorage.load()); },
};

const config = await loadConfig();
const fetchFn = globalThis.fetch.bind(globalThis);
const supabase = config && { url: config.supabaseUrl, key: config.supabaseKey, fetch: fetchFn };
const auth = supabase ? createSupabaseAuth(supabase) : localAuth;
const sessions = createSessionManager({ auth, storage: localSessionStorage, now: () => Date.now() });
const repoOptions = supabase && { ...supabase, getAccessToken: () => sessions.getAccessToken() };
const clipRepo = repoOptions ? createSupabaseClipRepo(repoOptions) : createMemoryClipRepo();
const commentRepo = repoOptions ? createSupabaseCommentRepo(repoOptions) : createMemoryCommentRepo();
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
const app = createApp({
  clipRepo, commentRepo, clipService, player, newId,
  now: () => Date.now(),
  logError: (error) => console.error(error),
  auth,
  sessions,
});

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
  document.body.classList.toggle('busy', state.busy);

  const signedIn = state.user !== null;
  $('signed-in').hidden = !signedIn;
  $('signed-out').hidden = signedIn;
  $('user-display-name').textContent = state.user?.displayName ?? '';
  // 未登入只能瀏覽：不顯示建立片段與留言的表單
  $('clip-form').hidden = !signedIn;
  $('comment-form').hidden = !signedIn;

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
        li.append(body, meta(comment));
        // 只能刪除自己的留言
        if (app.canDeleteComment(comment)) li.append(button('刪除', () => run(() => app.deleteComment(comment.id))));
        return li;
      }),
    );
  }
  syncDisabled();
}

/** 處理中（busy）時停用所有按鈕與輸入欄位。 */
function syncDisabled() {
  const { busy } = app.getState();
  for (const el of document.querySelectorAll('button, input, textarea')) {
    /** @type {HTMLButtonElement | HTMLInputElement} */ (el).disabled = busy;
  }
}

/**
 * 執行一個 app 動作，完成後重畫。
 * @param {() => Promise<void> | void} action
 */
async function run(action) {
  const pending = action();
  render(); // 動作開始時 busy 已設為 true，先重畫一次以停用按鈕
  await pending;
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

/**
 * 載入影片；成功後把網址列更新成這組討論串的網址（?v=影片ID&s=討論串組id），方便複製分享。
 * @param {string} youtubeUrl
 * @param {{ setId?: string | null }} [options] 省略 setId 時產生新的一組（貼上網址帶進影片）
 */
async function loadVideo(youtubeUrl, options) {
  await app.loadVideo(youtubeUrl, options);
  const { videoId, setId } = app.getState();
  if (videoId !== null) history.replaceState(null, '', pageUrlFor(location.href, videoId, setId));
}

onSubmit('load-form', () => loadVideo(input('url').value.trim()));
onSubmit('sign-in-form', async () => {
  await app.signIn({ email: input('sign-in-email').value.trim(), password: input('sign-in-password').value });
  if (app.getState().user !== null) input('sign-in-password').value = '';
});
onSubmit('sign-up-form', async () => {
  await app.signUp({
    email: input('sign-up-email').value.trim(),
    password: input('sign-up-password').value,
    displayName: input('sign-up-name').value,
  });
  if (app.getState().user !== null) input('sign-up-password').value = '';
});
$('sign-out').addEventListener('click', () => run(() => app.signOut()));
onSubmit('clip-form', async () => {
  await app.createClip({ start: input('start').value, end: input('end').value, title: input('title').value.trim() });
  if (app.getState().error === null) {
    for (const id of ['start', 'end', 'title']) input(id).value = '';
  }
});
onSubmit('comment-form', async () => {
  const body = /** @type {HTMLTextAreaElement} */ ($('body'));
  await app.addComment(body.value);
  if (app.getState().error === null) body.value = '';
});

player.onTimeUpdate((sec) => {
  $('current').textContent = `${formatTimecode(sec)}（${sec.toFixed(2)} 秒）`;
});

render();

// 打開分享網址（?v=影片ID&s=討論串組id）時，自動載入那部影片與那組討論串；
// 沒有 s 的舊網址顯示加入此功能前建立的片段
const sharedVideoId = pageVideoId(location.href);
if (sharedVideoId !== null) {
  input('url').value = `https://www.youtube.com/watch?v=${sharedVideoId}`;
  run(() => loadVideo(input('url').value, { setId: pageSetId(location.href) }));
}
