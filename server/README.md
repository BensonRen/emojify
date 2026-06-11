# emojify world server

Presence (see other walkers on the planet) + the shared emoji mural
(r/place model: one tile per visitor per 5-minute cooldown).

## Run (aries)

```bash
cd server && npm i && PORT=8787 MURAL_FILE=/var/lib/emojify/mural.json node index.mjs
```

## Deployed state (2026-06-11)

- aries: `docker compose up -d` in `~/projects/emojify/server` — container
  `emojify-world` (node:22-alpine), mural in the `emojify-mural` volume,
  bound to 127.0.0.1:8787 (cloudflared) and 100.64.0.1:8787 (tailnet testing)
- protocol verified live over the tailnet: hello/peer/tile/cooldown 4/4
- client ships with `WS_ENABLED=false` — silent solo until the wire is public

## Go-live runbook (one owner action + two commands)

aries sits behind residential NAT; the production-grade exposure is the
EXISTING cloudflared tunnel. That requires the `emojify.me` zone in the same
Cloudflare account (the site keeps pointing at Vercel — only DNS hosting moves):

1. **Owner**: Cloudflare dashboard → Add site `emojify.me` (Free plan) → it
   imports records; ensure apex/www records still point to Vercel
   (`cname.vercel-dns.com`, DNS-only/grey-cloud) → change nameservers at the
   registrar to the assigned `*.ns.cloudflare.com` pair.
2. Add `ws.emojify.me` in the tunnel (config is mirrored from the faker-100
   repo — add it THERE to avoid drift):
   ```yaml
   - hostname: ws.emojify.me
     service: http://localhost:8787
   ```
   then `sudo systemctl restart cloudflared`, and create the proxied CNAME:
   `cloudflared tunnel route dns 325f0967-... ws.emojify.me`
3. Flip the client: in `assets/presence.js` set `WS_ENABLED = true` (remove
   the `|| false`), commit — Vercel deploys, the planet fills.

## Local/tailnet testing

```js
localStorage.setItem('emojify-ws','ws://100.64.0.1:8787') // any tailnet browser
```
The smoke suite spins its own server on :8788 and runs a real two-page loop.
