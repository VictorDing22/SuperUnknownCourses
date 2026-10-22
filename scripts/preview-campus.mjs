#!/usr/bin/env node
/**
 * 本地预览校园版构建产物（basePath = /plaza）。
 *
 * 为什么需要它：`pnpm build:campus` 产出的 HTML 里资源路径是 `/plaza/_next/...`，
 * 直接用 `python3 -m http.server -d out` 挂在根目录会全部 404。
 * 这个脚本把 `out/` 挂到 `/plaza/` 下，尽量贴近服务器上的 nginx 行为。
 *
 * Usage:
 *   pnpm build:campus
 *   pnpm preview:campus        # http://localhost:4000/plaza/
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const PREFIX = '/plaza';
const PORT = Number(process.env.PORT ?? 4000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

if (!fs.existsSync(OUT)) {
  console.error('找不到 out/，先运行：pnpm build:campus');
  process.exit(1);
}

function resolveFile(urlPath) {
  // 只有 /plaza/... 才映射到 out/；根路径重定向到 /plaza/
  const rel = urlPath.startsWith(PREFIX + '/') ? urlPath.slice(PREFIX.length) : urlPath;
  let file = path.join(OUT, decodeURIComponent(rel));
  if (!file.startsWith(OUT)) return null; // 目录穿越保护
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/' || url.pathname === PREFIX) {
    res.writeHead(302, { Location: `${PREFIX}/` });
    return res.end();
  }

  if (!url.pathname.startsWith(PREFIX)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`只服务 ${PREFIX}/ 下的路径（模拟服务器上的挂载点）`);
  }

  const file = resolveFile(url.pathname);
  if (!file) {
    // 和 nginx 的 try_files 兜底一致：找不到就回首页
    const fallback = path.join(OUT, 'index.html');
    if (fs.existsSync(fallback)) {
      res.writeHead(200, { 'Content-Type': TYPES['.html'] });
      return fs.createReadStream(fallback).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }

  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`校园版预览：http://localhost:${PORT}${PREFIX}/`);
  console.log(`（产物目录：${path.relative(ROOT, OUT)}/）`);
});
