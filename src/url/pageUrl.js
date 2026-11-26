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
