# Emojify — Product Vision

> **Note:** `docs/` is excluded from deployment via `.vercelignore`. This file is for
> contributors reading the repo, not for the live site. It captures the locked product
> vision so a fresh clone doesn't depend on anyone's session memory.

Last updated: 2026-06-10.

---

## 1. What emojify is becoming

Emojify started as "LLM emoji translator + lyric guessing game." It is being rebuilt
into **a collection of emoji toys** — interesting things you can do with emoji, each
one a small self-contained world.

The hub metaphor is a **3D galaxy of emoji planets** (Three.js). You arrive in space,
each planet is one toy, and you dive into the one you want. The interface IS the
world — there is no landing page, no marketing copy, no fake-desktop chrome. The
galaxy itself is the navigation.

## 2. The centerpiece: 同频即密钥 (Wavelength-as-Key)

Everything else orbits this mechanic (future, not yet built):

**Encryption with NO transmitted key.** The "key" is whether the recipient guesses
the association in the sender's head. If you and I share the same mental link between
an emoji and a meaning — we're on the same wavelength — the message opens. If not, it
stays closed. *Only two people in the world can read it, because only two people
think it.*

Also planned in the same orbit:

- **Smuggle** — hide an arbitrary message inside a single visible emoji using Unicode
  variation selectors (Paul Butler's trick). Pure client-side; nothing ever hits a
  server.

## 3. The galaxy hub (LOCKED spec)

Owner-approved, do not redesign casually:

- **Tilted spiral-disc galaxy** — must read as a real galaxy, not floating balls.
  5 arms, hot-gold core fading to cool-blue arms; real-Milky-Way multi-temperature
  star palette with warm nebula wisps.
- **Planets are 3D point-cloud forms**, each visibly made of the emoji that represent
  its function (the cipher planet is built of keys/locks, the games planet of game
  emoji, etc.).
- **The galactic-core sun is a single Fluent-3D 😀** — Microsoft `fluentui-emoji`
  (MIT), vendored at `/assets/sun-grin-3d.png`.
  *This AMENDS the earlier "pixel-styled sun" spec — owner-approved 2026-06-10.*
- **Matte planets.** No stray glows. Only the hero planet (Cipher) gets a faint halo.
- **Damped orbit-drag camera** — smooth autorotation around the galactic center,
  drag to orbit, with damping.

## 4. Worlds roster

One planet, one art style — **variety is the feature**, unified by one warm palette,
one sun light, and the same sphere format.

| World | Mechanic | Art style | Status |
| --- | --- | --- | --- |
| **Cipher Office** | 同频即密钥 — the HERO planet | Clay | 建设中 |
| **Translation Bureau** | LLM text→emoji translator | Papercraft / low-poly | Live — backend `/api/emoji-translate` |
| **Field Games** | Lyric guessing game | Voxel / pixel | Live — `/game` |
| **Combination Workshop "Forge"** | Emoji combination/fusion | Molten / glossy | 建设中 |
| **The Wall** | Public emoji mosaic | Flat mosaic tiles | 建设中 |

## 5. Mood rules (HARD)

- **Day/night duality** (owner-approved 2026-06-10): the **galaxy hub is a night
  sky**; **planet interiors are warm spring MORNING** — sunrise, bright, optimistic.
  Never dusk, never sunset-nostalgic, no 暮气.
- **Mature craft** — Pixar / Monument Valley grade. Never childish, never
  candy-cheap.
- **Emoji are the heroes; chrome recedes.** UI must never upstage the emoji.

## 6. Experience rules

- **≤2 clicks** from the galaxy to any activity.
- **⌘K warp palette** for keyboard-fast jumping between worlds.
- The **cinematic dive-to-planet doubles as the loading transition** — by the time
  the camera lands, the activity is ready.
- Each planet will eventually open into a **Messenger-style walkable interior**
  (prototype: `design/mockups/planet-interior.html`). **Kiosk-card modals ship
  first**; walkable interiors are the fast-follow.

## 7. Stack constraints

- **No build step. Zero npm dependencies.** Plain HTML/CSS/JS, served as-is.
- **Strict CSP**: `self` + inline + Google Fonts only. **Three.js MUST be vendored**
  at `/vendor/three` — no CDN scripts, ever.
- **Vercel serverless functions** for the only backend pieces (`/api/*`).
- **Sharing via URL fragment** (future): DEFLATE + base64url in the `#fragment`, so
  shared content never hits the server.
- **Anonymous-first**; accounts are lazy and optional.
- **Data layer roadmap**: R1 none → R2 maybe Vercel KV → R3 Discord-as-backend.

## 8. Appendix: history & superseded decisions

Kept for archaeology — these are settled, do not revisit.

- **Galaxy iteration lineage** lives in `design/mockups/` (kept for reference,
  excluded from deploy): `galaxy.html` v1 spheres → `galaxy2` emoji-form clouds →
  `galaxy3` warm night → `galaxy4` Milky-Way palette + drag → `galaxy5` spiral disc →
  `galaxy6`/`galaxy7` sun experiments → `galaxy8` Fluent-3D sun + dive-into-planet →
  `galaxy9` hero intro (emoji converge → galaxy reveal).
- **`planet-3d.html` is a superseded dead-end** — the "one planet as the whole site"
  direction, replaced by the galaxy hub.
- **Rejected directions** (do NOT revisit):
  - Editorial "government dossier" style — no game feel.
  - Candy / Duolingo-style cartoon lobbies — generic, childish.
  - Near-black dark mode — illegible.
  - Fake-desktop OS skeleton — wastes peripheral space, cliché.
- **Pixel-styled sun** — superseded 2026-06-10 by the single Fluent-3D 😀 sun (§3).
