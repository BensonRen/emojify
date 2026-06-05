// Local host for the game on the LAN, with a feedback sink the static
// `python -m http.server` can't provide. Serves game/ statically AND accepts
//   POST /api/feedback  {cardId,pack,title,line,model,emoji,vote}
// appending one JSON line per click to game/data/feedback.jsonl (append-only
// event log; the last event per card+model is the current vote).
//
// Zero dependencies (node: builtins only). This is local tooling, not part of
// the shipped static site. Usage: node game/scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize, extname, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // game/
const FEEDBACK = join(ROOT, 'data', 'feedback.jsonl');
const PORT = Number(process.argv[2] || process.env.PORT || 8000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function readBody(req, cap = 1 << 16) {
  return new Promise((res, rej) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > cap) rej(new Error('too large')); else chunks.push(c); });
    req.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

const send = (res, code, body, type = 'application/json; charset=utf-8') =>
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ── Feedback sink ──────────────────────────────────────────────
  if (url.pathname === '/api/feedback') {
    if (req.method !== 'POST') return send(res, 405, JSON.stringify({ ok: false, error: 'POST only' }));
    try {
      const v = JSON.parse(await readBody(req));
      // minimal validation; the endpoint never throws to the client (UX > strictness)
      const row = {
        ts: new Date().toISOString(),
        cardId: String(v.cardId ?? ''), pack: String(v.pack ?? ''),
        title: String(v.title ?? ''), line: String(v.line ?? ''),
        model: String(v.model ?? ''), emoji: String(v.emoji ?? ''),
        vote: v.vote === 'up' || v.vote === 'down' ? v.vote : '',
      };
      if (!row.cardId || !row.model || !row.vote) return send(res, 200, JSON.stringify({ ok: false, error: 'bad payload' }));
      await mkdir(dirname(FEEDBACK), { recursive: true });
      await appendFile(FEEDBACK, JSON.stringify(row) + '\n');
      return send(res, 200, JSON.stringify({ ok: true }));
    } catch (e) {
      return send(res, 200, JSON.stringify({ ok: false, error: String(e) }));
    }
  }

  // ── Static files (rooted at game/, no path traversal) ──────────
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed', 'text/plain');
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    send(res, 404, 'not found', 'text/plain');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`game served on http://0.0.0.0:${PORT}  (feedback -> ${FEEDBACK})`);
});
