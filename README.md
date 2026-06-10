# Emojify

**A galaxy of emoji toys.** The front door is a 3D emoji galaxy — each planet is one
toy, and you dive into the one you want. Live at **[emojify.me](https://emojify.me)**.

Today's worlds: an **LLM emoji translator** (two models head-to-head, scored by a
fixed referee) and a **lyric guessing game**. More planets are 建设中 — see
[docs/VISION.md](docs/VISION.md) for the full product vision.

## Live URLs

| URL | What it is |
| --- | --- |
| `/` | The galaxy — 3D spiral-disc hub of emoji planets (Three.js, vendored) |
| `/translate` | Translation Bureau — text→emoji with MiniMax + OpenAI side by side |
| `/game` | Field Games — emoji lyric guessing game |
| `/api/*` | Vercel serverless functions (translate, eval, feedback) |

## Architecture

Static front end + Vercel serverless functions. **No build step, no framework,
zero npm dependencies.** Strict CSP: scripts are `self` + inline only — Three.js is
vendored, never loaded from a CDN.

```
index.html              # the galaxy front door (Three.js scene, vanilla JS)
translate/              # the translator UI (formerly the site root)
game/                   # lyric guessing game (static + JSON card decks)
api/
  emoji-translate.js    # POST { text } -> emoji from both models
  emoji-eval.js         # POST { text, emoji } -> fidelity / naturalness / tone scores
  feedback.js           # POST user feedback
  _guard.js             # shared same-origin check + rate limit (not a route)
vendor/three/           # Three.js r160 + addons, vendored (MIT)
assets/                 # static assets (Fluent-3D sun sprite, licenses)
vercel.json             # cleanUrls + security headers (CSP)
design/  docs/  research/   # mockups, vision docs, eval research — NOT deployed
```

`design/`, `docs/`, and `research/` are excluded via `.vercelignore`.

## Configuration

API keys come **only** from environment variables (Vercel → Settings → Environment
Variables):

| Variable | Required | Purpose |
| --- | --- | --- |
| `MINIMAX_API_KEY` | yes | MiniMax translation + the referee judge |
| `OPENAI_API_KEY` | optional | Enables the OpenAI column (degrades gracefully) |

`MINIMAX_API_HOST` defaults to `https://api.minimax.io`.

## Local development

```bash
vercel dev      # serves the static site AND the /api functions
```

Put keys in a git-ignored `.env.local`:

```
MINIMAX_API_KEY=...
OPENAI_API_KEY=...
```

## Vision

Where this is going — the 同频即密钥 cipher centerpiece, the worlds roster, the
locked galaxy spec, and the rules of the road: **[docs/VISION.md](docs/VISION.md)**.

## License & attribution

- Code: **MIT**
- [Three.js](https://github.com/mrdoob/three.js) — MIT, vendored at `vendor/three/`
- Sun sprite from [Microsoft fluentui-emoji](https://github.com/microsoft/fluentui-emoji)
  — MIT, vendored at `assets/sun-grin-3d.png` (license in `assets/LICENSE-fluentui-emoji.txt`)
