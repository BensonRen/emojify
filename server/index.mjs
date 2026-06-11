// ─── emojify world server ───
// Presence (who else is on the planet) + the shared mural (r/place model: one
// tile per visitor per cooldown — the constraint IS the collaboration).
// Runs on aries (monorepo deploy). No accounts: an anon id per connection.
//
//   node server/index.mjs            # ws://0.0.0.0:8787  (put TLS in front via caddy)
//   MURAL_FILE=/data/mural.json node server/index.mjs
//
// Protocol (JSON over WS):
//   → {t:'join', world:'translate'|'games', name?}        join a room (≤10 peers, Messenger's calm cap)
//   → {t:'pos', d:[x,y,z], h:[x,y,z], e?:'😀'}            position + heading + optional emote
//   → {t:'tile', i:int, g:'<emoji>'}                       place a mural tile (cooldown-gated)
//   ← {t:'hello', id, peers:[{id,d,h}], mural:{w,h,tiles}}
//   ← {t:'peer', id, d, h, e} · {t:'bye', id} · {t:'tile', i, g} · {t:'err', m}

import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PORT = +(process.env.PORT || 8787);
const ROOM_CAP = 10;                  // calm, not crowded — Messenger's number
const TILE_COOLDOWN_MS = 5 * 60_000;  // r/place's forcing function
const MURAL_W = 32, MURAL_H = 18;
const MURAL_FILE = process.env.MURAL_FILE || new URL('./mural.json', import.meta.url).pathname;

// ── the mural: one shared canvas across all worlds ──
let mural;
try { mural = JSON.parse(readFileSync(MURAL_FILE, 'utf8')); }
catch { mural = { w: MURAL_W, h: MURAL_H, tiles: {} }; } // tiles: {"i":"😀"}
let muralDirty = false;
setInterval(() => {
  if (!muralDirty) return;
  muralDirty = false;
  try { mkdirSync(dirname(MURAL_FILE), { recursive: true }); writeFileSync(MURAL_FILE, JSON.stringify(mural)); }
  catch (e) { console.error('mural save failed', e.message); }
}, 5000);

const GLYPH = /^\p{RGI_Emoji}$/v; // exactly one emoji, nothing else reaches the canvas
const SKIN_OK = (g, c) => typeof g === 'string' && GLYPH.test(g) && Number.isInteger(c) && c >= 0 && c <= 0xffffff;

const rooms = new Map(); // world → Set<ws>
let nextId = 1;

const wss = new WebSocketServer({ port: PORT });
console.log(`emojify world server on :${PORT}`);

wss.on('connection', (ws) => {
  ws.id = String(nextId++);
  ws.world = null;
  ws.lastTile = 0;
  ws.lastPos = 0;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const send = (o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const roomCast = (o, skipSelf = true) => {
    const room = rooms.get(ws.world); if (!room) return;
    const s = JSON.stringify(o);
    for (const peer of room) if (!(skipSelf && peer === ws) && peer.readyState === 1) peer.send(s);
  };

  ws.on('message', (buf) => {
    if (buf.length > 512) return;                       // nothing we accept is bigger
    let m; try { m = JSON.parse(buf); } catch { return; }
    if (m.t === 'join' && (m.world === 'translate' || m.world === 'games')) {
      if (ws.world) rooms.get(ws.world)?.delete(ws);
      let room = rooms.get(m.world) ?? rooms.set(m.world, new Set()).get(m.world);
      if (room.size >= ROOM_CAP) { send({ t: 'err', m: 'room full — the planet stays calm' }); return; }
      ws.world = m.world; room.add(ws);
      if (m.skin && SKIN_OK(m.skin.g, m.skin.c)) ws.skin = { g: m.skin.g, c: m.skin.c };
      send({ t: 'hello', id: ws.id,
        peers: [...room].filter(p => p !== ws).map(p => ({ id: p.id, d: p.d, h: p.h, skin: p.skin })),
        mural });
      roomCast({ t: 'peer', id: ws.id, d: ws.d, h: ws.h, skin: ws.skin });
    }
    else if (m.t === 'skin' && ws.world && SKIN_OK(m.g, m.c)) { // wardrobe change, live
      ws.skin = { g: m.g, c: m.c };
      roomCast({ t: 'skin', id: ws.id, g: m.g, c: m.c });
    }
    else if (m.t === 'pos' && ws.world) {
      const now = Date.now(); if (now - ws.lastPos < 66) return; // ≤15 Hz per peer
      ws.lastPos = now;
      const v3 = (a) => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
      if (!v3(m.d) || !v3(m.h)) return;
      ws.d = m.d; ws.h = m.h;
      roomCast({ t: 'peer', id: ws.id, d: m.d, h: m.h, e: typeof m.e === 'string' && GLYPH.test(m.e) ? m.e : undefined });
    }
    else if (m.t === 'tile') {
      const now = Date.now();
      if (now - ws.lastTile < TILE_COOLDOWN_MS) { send({ t: 'err', m: 'one tile per five minutes — gather your friends' }); return; }
      const i = m.i | 0;
      if (i < 0 || i >= mural.w * mural.h || typeof m.g !== 'string' || !GLYPH.test(m.g)) return;
      ws.lastTile = now;
      mural.tiles[i] = m.g; muralDirty = true;
      for (const room of rooms.values()) for (const peer of room)
        if (peer.readyState === 1) peer.send(JSON.stringify({ t: 'tile', i, g: m.g }));
      send({ t: 'tile', i, g: m.g });
    }
  });

  ws.on('close', () => {
    if (!ws.world) return;
    rooms.get(ws.world)?.delete(ws);
    const room = rooms.get(ws.world);
    if (room) for (const peer of room) if (peer.readyState === 1) peer.send(JSON.stringify({ t: 'bye', id: ws.id }));
  });
});

setInterval(() => { // dead peers leave the room
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; ws.ping();
  }
}, 30_000);
