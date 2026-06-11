// ─── presence.js — the world link: other walkers + the shared mural ───
// Silent-solo by design: if the wire is down or disabled, the world plays alone
// with zero console noise. Endpoint flips on when ws.emojify.me lands in DNS.
//
//   WorldLink({world, onPeer, onBye, onMural, onTile, onErr}) →
//     {ready(), pos(d,h,e?), tile(i,g), close()}

// the wire is UP: ws.emojify.me → CF edge → tunnel → aries (2026-06-11)
// localStorage 'emojify-ws': custom endpoint, or 'off' to play solo (tests stay hermetic)
const _ov = localStorage.getItem('emojify-ws');
export const WS_ENDPOINT = (_ov && _ov !== 'off') ? _ov : 'wss://ws.emojify.me';
export const WS_ENABLED = _ov !== 'off';

export function WorldLink(opts) {
  let ws = null, open = false, tries = 0, closed = false;
  const MAX_TRIES = 3;

  function connect() {
    if (closed || tries >= MAX_TRIES) return;
    tries++;
    try { ws = new WebSocket(WS_ENDPOINT); } catch (e) { return; } // bad URL → solo
    ws.onopen = () => { open = true; tries = 0; ws.send(JSON.stringify({ t: 'join', world: opts.world, skin: opts.skin?.() })); };
    ws.onclose = () => { open = false; if (!closed) setTimeout(connect, 1500 * tries); };
    ws.onerror = () => {}; // the close handler owns retry; silence the rest
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'hello') { opts.onMural?.(m.mural); for (const p of m.peers) opts.onPeer?.(p); }
      else if (m.t === 'peer') opts.onPeer?.(m);
      else if (m.t === 'bye') opts.onBye?.(m.id);
      else if (m.t === 'skin') opts.onSkin?.(m.id, m.g, m.c);
      else if (m.t === 'tile') opts.onTile?.(m.i, m.g);
      else if (m.t === 'err') opts.onErr?.(m.m);
    };
  }
  connect();

  return {
    ready: () => open,
    pos(d, h, e) { if (open) ws.send(JSON.stringify({ t: 'pos', d, h, e })); },
    tile(i, g) { if (open) ws.send(JSON.stringify({ t: 'tile', i, g })); },
    skin(g, c) { if (open) ws.send(JSON.stringify({ t: 'skin', g, c })); },
    close() { closed = true; try { ws?.close(); } catch (e) {} },
  };
}
