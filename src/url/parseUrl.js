// @ts-check

/**
 * 從 YouTube 網址取出影片 ID。
 * @param {string} url
 * @returns {string | null}
 */
export function parseUrl(url) {
  const u = new URL(url);
  if (u.hostname === 'youtu.be') {
    return u.pathname.slice(1);
  }
  return u.searchParams.get('v');
}
