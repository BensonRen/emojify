// ─── presence.js — the world link: other walkers + the shared mural ───
// Silent-solo by design: if the wire is down or disabled, the world plays alone
// with zero console noise. Endpoint flips on when ws.emojify.me lands in DNS.
//
//   WorldLink({world, onPeer, onBye, onMural, onTile, onErr}) →
//     {ready(), pos(d,h,e?), tile(i,g), close()}

export const WS_ENDPOINT = localStorage.getItem('emojify-ws') || 'wss://ws.emojify.me';
// master switch: real endpoint not public yet — local override (emojify-ws) always wins
export const WS_ENABLED = !!localStorage.getItem('emojify-ws') || false;

export function WorldLink(opts) {
  let ws = null, open = false, tries = 0, closed = false;
  const MAX_TRIES = 3;

  function connect() {
    if (closed || tries >= MAX_TRIES) return;
    tries++;
    try { ws = new WebSocket(WS_ENDPOINT); } catch (e) { return; } // bad URL → solo
    ws.onopen = () => { open = true; tries = 0; ws.send(JSON.stringify({ t: 'join', world: opts.world })); };
    ws.onclose = () => { open = false; if (!closed) setTimeout(connect, 1500 * tries); };
    ws.onerror = () => {}; // the close handler owns retry; silence the rest
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'hello') { opts.onMural?.(m.mural); for (const p of m.peers) opts.onPeer?.(p); }
      else if (m.t === 'peer') opts.onPeer?.(m);
      else if (m.t === 'bye') opts.onBye?.(m.id);
      else if (m.t === 'tile') opts.onTile?.(m.i, m.g);
      else if (m.t === 'err') opts.onErr?.(m.m);
    };
  }
  connect();

  return {
    ready: () => open,
    pos(d, h, e) { if (open) ws.send(JSON.stringify({ t: 'pos', d, h, e })); },
    tile(i, g) { if (open) ws.send(JSON.stringify({ t: 'tile', i, g })); },
    close() { closed = true; try { ws?.close(); } catch (e) {} },
  };
}
