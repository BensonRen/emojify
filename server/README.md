# emojify world server

Presence (see other walkers on the planet) + the shared emoji mural
(r/place model: one tile per visitor per 5-minute cooldown).

## Run (aries)

```bash
cd server && npm i && PORT=8787 MURAL_FILE=/var/lib/emojify/mural.json node index.mjs
```

## Exposure (decision pending)

Browsers on emojify.me need a public `wss://` endpoint. aries is currently
Tailscale-internal (caddy on :80, no domain). Options:

1. **Tailscale Funnel** — `tailscale funnel 8787` → public `https://aries.<tailnet>.ts.net`,
   zero DNS work, capped bandwidth (fine for ≤10-peer rooms)
2. **DNS subdomain** — point `ws.emojify.me` at aries' public IP, add a caddy site
   with automatic TLS + `reverse_proxy localhost:8787`
3. **Vercel KV only** — skip realtime for now; mural becomes async via /api (no presence)

Client integration plan: `assets/presence.js` connects on world load, renders
peers as ghost citizens (chibi body + their emote head), sends pos at 10 Hz;
the mural renders as the Wall planet's face and as a board in the plaza.
