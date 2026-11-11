// @ts-check
// 手動驗證用的本機伺服器。只用 Node 內建模組，不需要安裝任何套件。
// 瀏覽器不允許從 file:// 載入 ES 模組，所以需要透過 http 提供檔案。
//
// 執行：node dev/server.js   然後打開 http://localhost:8080/dev/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT ?? 8080);

/** 只開放這些資料夾，避免把 .git 等其他檔案提供出去 */
const ALLOWED_DIRS = ['dev', 'src'].map((dir) => resolve(root, dir) + sep);

/** @type {Record<string, string>} */
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const path = decodeURIComponent(pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  const file = resolve(root, `.${path}`);

  if (!ALLOWED_DIRS.some((dir) => file.startsWith(dir))) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(file);
    res
      .writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' })
      .end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`手動驗證頁面：http://localhost:${port}/dev/`);
});
