// Local dev server for emojify — zero deps, mirrors Vercel's behavior:
//   - static files from the repo root with cleanUrls (/world -> world/index.html)
//   - /api/* proxied to a live deployment (default https://emojify.me) with the
//     Origin header rewritten so the same-origin guard accepts the call
// Usage: node scripts/dev.mjs [port]        (default 4321)
//        API_UPSTREAM=https://... node scripts/dev.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = normalize(new URL('..', import.meta.url).pathname);
const PORT = Number(process.argv[2]) || 4321;
const UPSTREAM = process.env.API_UPSTREAM || 'https://emojify.me';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.webp': 'image/webp',
};

async function proxyApi(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    const r = await fetch(UPSTREAM + req.url, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        // the prod guard requires Origin host === Host — impersonate the upstream
        Origin: UPSTREAM,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const body = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, {
      'Content-Type': r.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `upstream ${UPSTREAM} unreachable: ${e.message}` }));
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) return proxyApi(req, res);

  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = normalize(join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const st = await stat(file).catch(() => null);
    if (st?.isDirectory()) file = join(file, 'index.html');
    else if (!st && !extname(file)) file = file + '/index.html'; // cleanUrls
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(PORT, () => {
  console.log(`emojify dev server → http://localhost:${PORT}`);
  console.log(`  /api/* proxied to ${UPSTREAM} (Origin rewritten for the guard)`);
});
