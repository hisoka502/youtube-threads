// @ts-check

const SHORT_HOST = 'youtu.be';
const WATCH_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com'];
/** 路徑第一段為這些值時，第二段是影片 ID，例如 /shorts/ID */
const ID_PATH_PREFIXES = ['shorts', 'embed', 'live'];

/** @type {import('../types.js').IdValidator} */
const acceptAny = () => true;

/**
 * 從 YouTube 網址取出影片 ID。
 * @param {string} url
 * @param {import('../types.js').ParseUrlOptions} [options]
 * @returns {string | null} 無法辨識，或未通過 isValidId 時回傳 null
 */
export function parseUrl(url, { isValidId = acceptAny } = {}) {
  const id = extractId(url);
  if (!id || !isValidId(id)) {
    return null;
  }
  return id;
}

/**
 * @param {string} url
 * @returns {string | null | undefined}
 */
function extractId(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname === SHORT_HOST) {
    return u.pathname.slice(1);
  }
  if (WATCH_HOSTS.includes(u.hostname)) {
    const [, first, second] = u.pathname.split('/');
    if (ID_PATH_PREFIXES.includes(first)) {
      return second;
    }
    return u.searchParams.get('v');
  }
  return null;
}
