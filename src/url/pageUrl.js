// @ts-check
// 本站頁面網址的讀取與產生：每部影片的網址是頁面網址加上 ?v=影片ID。

/**
 * 從頁面網址取出影片 ID（v 參數）。
 * @param {string} pageUrl 例如 location.href
 * @returns {string | null}
 */
export function pageVideoId(pageUrl) {
  return new URL(pageUrl).searchParams.get('v') || null;
}

/**
 * 產生某部影片的頁面網址：加上（或取代）v 參數，保留其他查詢參數與 #。
 * @param {string} pageUrl 目前的頁面網址，例如 location.href
 * @param {string} videoId
 * @returns {string}
 */
export function pageUrlFor(pageUrl, videoId) {
  const url = new URL(pageUrl);
  url.searchParams.set('v', videoId);
  return url.toString();
}

/**
 * 從頁面網址取出討論串組 id（s 參數）。
 * @param {string} pageUrl
 * @returns {string | null}
 */
export function pageSetId(pageUrl) {
  return new URL(pageUrl).searchParams.get('s') || null;
}
