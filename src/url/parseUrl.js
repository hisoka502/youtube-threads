// @ts-check

/**
 * 從 YouTube 網址取出影片 ID。
 * @param {string} url
 * @returns {string | null} 無法辨識時回傳 null
 */
export function parseUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname === 'youtu.be') {
    return u.pathname.slice(1);
  }
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(u.hostname)) {
    const [, first, second] = u.pathname.split('/');
    if (['shorts', 'embed', 'live'].includes(first)) {
      return second;
    }
    return u.searchParams.get('v');
  }
  return null;
}
