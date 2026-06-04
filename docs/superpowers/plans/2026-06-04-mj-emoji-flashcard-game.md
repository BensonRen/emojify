# MJ Emoji Flashcard Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, static emoji-guessing flashcard game where a player sees the emoji translation of an iconic Michael Jackson lyric, guesses the song, then reveals the answer and self-scores.

**Architecture:** A single static page at `game/index.html` (vanilla JS, inline CSS/JS, no build, no deps, CSP-friendly) loads a pre-baked `game/data/cards.json`. The cards are generated offline by a tiny Node pipeline that feeds hand-authored iconic lines through the existing `research/bootstrap_translations.py` translator and joins the results. Deploys for free as the `/game` route under Vercel `cleanUrls`.

**Tech Stack:** Vanilla HTML/CSS/JS (browser), Node ESM scripts with **zero npm deps** (built-in `node:fs`, `node:test`, `node:assert`), the existing Python `bootstrap_translations.py` for translation.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `game/data/mj_lyrics.json` | Hand-authored source of truth: `[{id, title, line}]`, ~45 songs, one iconic line each. |
| `game/scripts/lib.mjs` | Pure, testable transforms: `toEvalRows(lyrics)` and `buildCards(lyrics, translationRows)`. |
| `game/scripts/lib.test.mjs` | `node:test` unit tests for `lib.mjs`. |
| `game/scripts/make-eval.mjs` | CLI: reads `mj_lyrics.json` → writes `research/data/mj_lyrics.jsonl` for bootstrap. |
| `game/scripts/build-cards.mjs` | CLI: joins `mj_lyrics.json` + `translations.jsonl` → writes `game/data/cards.json`. |
| `game/scripts/check-cards.mjs` | Validity check: every card has a non-empty `emoji`; exits non-zero otherwise. |
| `game/index.html` | The game UI: load deck, shuffle, show emoji, reveal, self-score, end screen. |
| `research/data/mj_lyrics.jsonl` | *(generated)* eval rows consumed by `bootstrap_translations.py`. |
| `research/results/mj_game/translations.jsonl` | *(generated)* lyric → `{minimax, openai}` emoji. |
| `game/data/cards.json` | *(generated)* `[{id, title, line, emoji, emojiAlt?}]` consumed by the game. |

**Why a pure `lib.mjs` + thin CLI wrappers:** the join/transform logic is the only part with real branching (missing providers, failed cells), so it's isolated into pure functions we can unit-test with zero deps. The CLIs and the browser game stay thin and are verified manually.

---

## Data contracts (used across tasks — keep names exact)

**`mj_lyrics.json`** — array of:
```json
{ "id": "billie_jean", "title": "Billie Jean", "line": "Billie Jean is not my lover" }
```

**`research/data/mj_lyrics.jsonl`** — one JSON object per line (schema `bootstrap_translations.py` expects; extra `title` rides along):
```json
{"id":"billie_jean","text":"Billie Jean is not my lover","category":"lyric","expected_tone":"","title":"Billie Jean"}
```

**`translations.jsonl`** — one object per line, produced by bootstrap (`{**row, "translations": {...}}`):
```json
{"id":"billie_jean","text":"...","category":"lyric","expected_tone":"","title":"Billie Jean",
 "translations":{"minimax":{"emoji":"👦🚫❤️","model":"MiniMax-Text-01","ok":true,"error":null},
                 "openai":{"emoji":"🙋‍♂️❌💑","model":"gpt-4o-mini","ok":true,"error":null}}}
```
(The `openai` cell is absent if no `OPENAI_API_KEY` was present at bake time.)

**`cards.json`** — array of:
```json
{ "id":"billie_jean", "title":"Billie Jean", "line":"Billie Jean is not my lover",
  "emoji":"👦🚫❤️", "emojiAlt":"🙋‍♂️❌💑" }
```
`emojiAlt` is **omitted** when the openai cell is missing/empty.

---

## Task 1: Author the lyric dataset

**Files:**
- Create: `game/data/mj_lyrics.json`

- [ ] **Step 1: Create the dataset file**

Create `game/data/mj_lyrics.json` with exactly this content (45 songs, one short iconic line each — single lines only, fair use; no full lyrics):

```json
[
  { "id": "billie_jean",        "title": "Billie Jean",                       "line": "Billie Jean is not my lover" },
  { "id": "thriller",           "title": "Thriller",                          "line": "'Cause this is thriller, thriller night" },
  { "id": "beat_it",            "title": "Beat It",                           "line": "Just beat it, beat it, no one wants to be defeated" },
  { "id": "smooth_criminal",    "title": "Smooth Criminal",                   "line": "Annie, are you OK? Are you OK, Annie?" },
  { "id": "bad",                "title": "Bad",                               "line": "Because I'm bad, I'm bad, come on" },
  { "id": "black_or_white",     "title": "Black or White",                    "line": "It don't matter if you're black or white" },
  { "id": "man_in_the_mirror",  "title": "Man in the Mirror",                 "line": "I'm starting with the man in the mirror" },
  { "id": "rock_with_you",      "title": "Rock with You",                     "line": "I wanna rock with you all night" },
  { "id": "dont_stop",          "title": "Don't Stop 'Til You Get Enough",    "line": "Keep on with the force, don't stop" },
  { "id": "the_way_you",        "title": "The Way You Make Me Feel",          "line": "The way you make me feel, you really turn me on" },
  { "id": "remember_the_time",  "title": "Remember the Time",                 "line": "Do you remember the time we fell in love" },
  { "id": "dirty_diana",        "title": "Dirty Diana",                       "line": "Dirty Diana, let me be" },
  { "id": "human_nature",       "title": "Human Nature",                      "line": "If they say why, why, tell them that it's human nature" },
  { "id": "pyt",                "title": "P.Y.T. (Pretty Young Thing)",       "line": "Pretty young thing, you make me sing" },
  { "id": "wanna_be_startin",   "title": "Wanna Be Startin' Somethin'",       "line": "You wanna be startin' somethin'" },
  { "id": "heal_the_world",     "title": "Heal the World",                    "line": "Heal the world, make it a better place" },
  { "id": "earth_song",         "title": "Earth Song",                        "line": "What about sunrise, what about rain" },
  { "id": "they_dont_care",     "title": "They Don't Care About Us",          "line": "All I wanna say is that they don't really care about us" },
  { "id": "will_you_be_there",  "title": "Will You Be There",                 "line": "Hold me like the River Jordan" },
  { "id": "stranger_moscow",    "title": "Stranger in Moscow",                "line": "I was wandering in the rain" },
  { "id": "you_are_not_alone",  "title": "You Are Not Alone",                 "line": "You are not alone, I am here with you" },
  { "id": "scream",             "title": "Scream",                            "line": "Stop pressurin' me, just stop pressurin' me" },
  { "id": "off_the_wall",       "title": "Off the Wall",                      "line": "'Cause this is off the wall" },
  { "id": "shes_out_of_my_life","title": "She's Out of My Life",              "line": "She's out of my life" },
  { "id": "liberian_girl",      "title": "Liberian Girl",                     "line": "Liberian girl, you came and you changed my world" },
  { "id": "in_the_closet",      "title": "In the Closet",                     "line": "There's something I have to say to you" },
  { "id": "jam",                "title": "Jam",                               "line": "It ain't too much for me to jam" },
  { "id": "who_is_it",          "title": "Who Is It",                         "line": "Who is it? Is it a friend of mine?" },
  { "id": "give_in_to_me",      "title": "Give In to Me",                     "line": "Quit pretending, you wanna live it" },
  { "id": "blood_dance_floor",  "title": "Blood on the Dance Floor",          "line": "She got your number, she know your game" },
  { "id": "you_rock_my_world",  "title": "You Rock My World",                 "line": "You rocked my world, you know you did" },
  { "id": "workin_day_night",   "title": "Workin' Day and Night",             "line": "Workin' day and night, really gotta give it to you" },
  { "id": "got_to_be_there",    "title": "Got to Be There",                   "line": "Got to be there, got to be there in the morning" },
  { "id": "ben",                "title": "Ben",                               "line": "Ben, the two of us need look no more" },
  { "id": "the_girl_is_mine",   "title": "The Girl Is Mine",                  "line": "The girl is mine, the doggone girl is mine" },
  { "id": "leave_me_alone",     "title": "Leave Me Alone",                    "line": "Just stop doggin' me around, leave me alone" },
  { "id": "speed_demon",        "title": "Speed Demon",                       "line": "Speed demon, you're movin' way too fast" },
  { "id": "another_part",       "title": "Another Part of Me",                "line": "We're takin' over, we have the truth" },
  { "id": "childhood",          "title": "Childhood",                         "line": "Have you seen my childhood" },
  { "id": "gone_too_soon",      "title": "Gone Too Soon",                     "line": "Like a comet blazing 'cross the evening sky, gone too soon" },
  { "id": "whatever_happens",   "title": "Whatever Happens",                  "line": "Whatever happens, don't let go of my hand" },
  { "id": "butterflies",        "title": "Butterflies",                       "line": "I just can't seem to get you off my mind" },
  { "id": "break_of_dawn",      "title": "Break of Dawn",                     "line": "I don't want this night to end" },
  { "id": "2_bad",              "title": "2 Bad",                             "line": "Too bad, you're messin' with me" },
  { "id": "money",              "title": "Money",                             "line": "Money, money, money, money" }
]
```

- [ ] **Step 2: Verify it is valid JSON with 45 unique ids**

Run:
```bash
node -e "const a=require('./game/data/mj_lyrics.json');const ids=new Set(a.map(x=>x.id));if(a.length!==45)throw new Error('count='+a.length);if(ids.size!==45)throw new Error('dup ids');for(const x of a)if(!x.id||!x.title||!x.line)throw new Error('bad row '+JSON.stringify(x));console.log('OK',a.length,'songs')"
```
Expected: `OK 45 songs`

- [ ] **Step 3: Commit**

```bash
git add game/data/mj_lyrics.json
git commit -m "feat(game): add MJ iconic-lyric dataset (45 songs)"
```

---

## Task 2: Pure transform library + tests (`lib.mjs`)

**Files:**
- Create: `game/scripts/lib.mjs`
- Test: `game/scripts/lib.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `game/scripts/lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEvalRows, buildCards } from './lib.mjs';

const lyrics = [
  { id: 'a', title: 'Song A', line: 'line a' },
  { id: 'b', title: 'Song B', line: 'line b' },
  { id: 'c', title: 'Song C', line: 'line c' },
];

test('toEvalRows maps to the bootstrap eval schema', () => {
  const rows = toEvalRows(lyrics);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    id: 'a', text: 'line a', category: 'lyric', expected_tone: '', title: 'Song A',
  });
});

test('buildCards joins by id and prefers the minimax emoji', () => {
  const translations = [
    { id: 'a', translations: { minimax: { emoji: '🅰️', ok: true }, openai: { emoji: 'A!', ok: true } } },
    { id: 'b', translations: { minimax: { emoji: '🅱️', ok: true } } }, // no openai cell
  ];
  const cards = buildCards(lyrics, translations);
  // 'c' has no translation row at all -> emoji "" (caught later by check-cards)
  assert.equal(cards.length, 3);
  assert.deepEqual(cards[0], { id: 'a', title: 'Song A', line: 'line a', emoji: '🅰️', emojiAlt: 'A!' });
  assert.deepEqual(cards[1], { id: 'b', title: 'Song B', line: 'line b', emoji: '🅱️' });
  assert.equal(cards[2].emoji, '');
  assert.equal('emojiAlt' in cards[2], false);
});

test('buildCards omits emojiAlt when openai emoji is empty or failed', () => {
  const translations = [
    { id: 'a', translations: { minimax: { emoji: '🅰️', ok: true }, openai: { emoji: '', ok: false } } },
  ];
  const cards = buildCards([lyrics[0]], translations);
  assert.equal('emojiAlt' in cards[0], false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test game/scripts/lib.test.mjs`
Expected: FAIL — `Cannot find module '.../lib.mjs'` (or import error).

- [ ] **Step 3: Implement `lib.mjs`**

Create `game/scripts/lib.mjs`:

```js
// Pure transforms shared by the game build scripts. No I/O here so it stays testable.

/** Hand-authored lyrics -> rows in the schema bootstrap_translations.py expects.
 *  `title` is an extra field; bootstrap preserves unknown row fields via {**row}. */
export function toEvalRows(lyrics) {
  return lyrics.map(({ id, title, line }) => ({
    id,
    text: line,
    category: 'lyric',
    expected_tone: '',
    title,
  }));
}

/** Join lyrics (source of truth for title/line) with a translations.jsonl array
 *  (source of truth for emoji), keyed by id. minimax -> emoji, openai -> emojiAlt.
 *  Missing/failed cells degrade gracefully: emoji "" if no minimax, emojiAlt omitted. */
export function buildCards(lyrics, translationRows) {
  const byId = new Map(translationRows.map((r) => [r.id, r.translations || {}]));
  return lyrics.map(({ id, title, line }) => {
    const t = byId.get(id) || {};
    const emoji = (t.minimax && t.minimax.emoji) ? t.minimax.emoji : '';
    const alt = (t.openai && t.openai.emoji) ? t.openai.emoji : '';
    const card = { id, title, line, emoji };
    if (alt) card.emojiAlt = alt;
    return card;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test game/scripts/lib.test.mjs`
Expected: PASS — `# pass 3`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add game/scripts/lib.mjs game/scripts/lib.test.mjs
git commit -m "feat(game): add pure transform lib (toEvalRows, buildCards) + tests"
```

---

## Task 3: `make-eval.mjs` — emit the bootstrap eval file

**Files:**
- Create: `game/scripts/make-eval.mjs`

- [ ] **Step 1: Implement the CLI wrapper**

Create `game/scripts/make-eval.mjs`:

```js
// Reads game/data/mj_lyrics.json, writes research/data/mj_lyrics.jsonl (one JSON/line)
// for bootstrap_translations.py to consume via --eval data/mj_lyrics.jsonl.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { toEvalRows } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));            // game/scripts
const lyricsPath = resolve(here, '../data/mj_lyrics.json');     // game/data/mj_lyrics.json
const outPath = resolve(here, '../../research/data/mj_lyrics.jsonl');

const lyrics = JSON.parse(readFileSync(lyricsPath, 'utf8'));
const rows = toEvalRows(lyrics);
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`wrote ${rows.length} rows -> ${outPath}`);
```

- [ ] **Step 2: Run it**

Run: `node game/scripts/make-eval.mjs`
Expected: `wrote 45 rows -> /home/benren/code/emoji_translator/research/data/mj_lyrics.jsonl`

- [ ] **Step 3: Spot-check the output schema**

Run: `head -n 1 research/data/mj_lyrics.jsonl`
Expected (one line): `{"id":"billie_jean","text":"Billie Jean is not my lover","category":"lyric","expected_tone":"","title":"Billie Jean"}`

- [ ] **Step 4: Commit**

```bash
git add game/scripts/make-eval.mjs
git commit -m "feat(game): add make-eval.mjs (lyrics -> bootstrap eval jsonl)"
```

> Note: `research/data/mj_lyrics.jsonl` is a generated artifact. Check whether `research/.gitignore` ignores `data/` before assuming it will be committed; the file is reproducible from `make-eval.mjs` either way.

---

## Task 4: Generate translations with the existing pipeline

**Files:**
- Generates: `research/results/mj_game/translations.jsonl`

This task runs the existing Python translator — no new code. The `minimaxChat` retry/backoff and per-provider failure isolation are already built in.

- [ ] **Step 1: Ensure deps + keys are present**

The translator reads keys from `research/.env.local` (already present per repo setup: `MINIMAX_API_KEY`, optional `OPENAI_API_KEY`).

Run: `cd research && python3 -c "import dotenv, requests; print('deps ok')"`
Expected: `deps ok` (if it fails: `pip install -r research/requirements.txt`).

- [ ] **Step 2: Run bootstrap (smoke test, first 3 rows)**

Run:
```bash
cd research && python3 bootstrap_translations.py --eval data/mj_lyrics.jsonl --run-dir results/mj_game --models minimax,openai --sleep 1 --limit 3
```
Expected: prints `Translators to generate: ['minimax', 'openai']` (or just `['minimax']` if no OpenAI key — that's fine and expected), then `[1/3] billie_jean: minimax=ok ...` lines, then `Wrote 3 rows ... -> .../results/mj_game/translations.jsonl`.

- [ ] **Step 3: Run the full set (resumes over the 3 already done)**

Run:
```bash
cd research && python3 bootstrap_translations.py --eval data/mj_lyrics.jsonl --run-dir results/mj_game --models minimax,openai --sleep 1
```
Expected: 45 rows, the first 3 showing `minimax=cached`, the rest `minimax=ok`. `Wrote 45 rows`.

- [ ] **Step 4: Verify no failed minimax cells remain**

Run:
```bash
node -e "const fs=require('fs');const rows=fs.readFileSync('research/results/mj_game/translations.jsonl','utf8').trim().split('\n').map(JSON.parse);const bad=rows.filter(r=>!(r.translations.minimax&&r.translations.minimax.ok));console.log('rows',rows.length,'failed minimax',bad.length);if(bad.length)console.log(bad.map(b=>b.id))"
```
Expected: `rows 45 failed minimax 0`. If any failed, re-run Step 3 (it resumes and retries only the failures).

- [ ] **Step 5: Commit the generated translations**

```bash
git add -f research/results/mj_game/translations.jsonl
git commit -m "chore(game): bake MJ lyric translations (minimax[+openai])"
```
(Use `-f` only if `research/.gitignore` ignores `results/`; committing the baked file makes the game reproducible without re-spending API calls.)

---

## Task 5: `build-cards.mjs` + `check-cards.mjs` — produce and validate `cards.json`

**Files:**
- Create: `game/scripts/build-cards.mjs`
- Create: `game/scripts/check-cards.mjs`
- Generates: `game/data/cards.json`

- [ ] **Step 1: Implement `build-cards.mjs`**

Create `game/scripts/build-cards.mjs`:

```js
// Joins game/data/mj_lyrics.json with research/results/mj_game/translations.jsonl
// (via buildCards) -> game/data/cards.json consumed by the game.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildCards } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const lyricsPath = resolve(here, '../data/mj_lyrics.json');
const translationsPath = resolve(here, '../../research/results/mj_game/translations.jsonl');
const outPath = resolve(here, '../data/cards.json');

const lyrics = JSON.parse(readFileSync(lyricsPath, 'utf8'));
const translationRows = readFileSync(translationsPath, 'utf8')
  .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const cards = buildCards(lyrics, translationRows);
writeFileSync(outPath, JSON.stringify(cards, null, 2) + '\n');
console.log(`wrote ${cards.length} cards -> ${outPath}`);
```

- [ ] **Step 2: Run it**

Run: `node game/scripts/build-cards.mjs`
Expected: `wrote 45 cards -> /home/benren/code/emoji_translator/game/data/cards.json`

- [ ] **Step 3: Implement `check-cards.mjs` (the validity check)**

Create `game/scripts/check-cards.mjs`:

```js
// Validity gate: every card must have id/title/line and a non-empty emoji.
// Exits non-zero (listing offenders) so a bad bake can't silently ship.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cards = JSON.parse(readFileSync(resolve(here, '../data/cards.json'), 'utf8'));

const bad = cards.filter((c) => !c.id || !c.title || !c.line || !c.emoji);
if (!Array.isArray(cards) || cards.length === 0) {
  console.error('FAIL: cards.json is empty or not an array');
  process.exit(1);
}
if (bad.length) {
  console.error(`FAIL: ${bad.length} card(s) missing emoji/fields:`, bad.map((c) => c.id));
  process.exit(1);
}
const withAlt = cards.filter((c) => c.emojiAlt).length;
console.log(`OK: ${cards.length} cards, all have emoji (${withAlt} also have emojiAlt)`);
```

- [ ] **Step 4: Run the check**

Run: `node game/scripts/check-cards.mjs`
Expected: `OK: 45 cards, all have emoji (...)` and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add game/scripts/build-cards.mjs game/scripts/check-cards.mjs game/data/cards.json
git commit -m "feat(game): build + validate cards.json from baked translations"
```

---

## Task 6: The game page (`game/index.html`)

**Files:**
- Create: `game/index.html`

This is verified manually in the browser (consistent with the repo's no-test-framework stance for UI). The page is self-contained: inline CSS/JS, same-origin `fetch` (allowed by CSP `connect-src 'self'`), on-brand palette/fonts mirroring the main app.

- [ ] **Step 1: Create the page**

Create `game/index.html` with exactly this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Emoji or It Didn't Happen — MJ Edition</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:#f7f3ec; --surface:#faf7f2; --surface2:#f0ead8; --border:#ddd6c8;
      --border2:#c8bfb0; --text:#1c1710; --text-muted:#7a7060; --text-dim:#b8ae9e;
      --accent:#a85c20; --green:#2e6e44; --red:#9e3030;
      --serif:'Cormorant Garamond',Georgia,serif; --mono:'JetBrains Mono',monospace;
    }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:var(--bg); color:var(--text); font-family:var(--serif);
      min-height:100vh; display:flex; flex-direction:column; align-items:center;
      justify-content:center; padding:24px; gap:20px; }
    header { text-align:center; }
    h1 { font-size:2rem; font-weight:700; letter-spacing:-.01em; }
    .sub { font-family:var(--mono); font-size:.72rem; color:var(--text-muted);
      text-transform:uppercase; letter-spacing:.12em; margin-top:6px; }
    .progress { font-family:var(--mono); font-size:.75rem; color:var(--text-muted);
      letter-spacing:.08em; }
    .card { background:var(--surface); border:1px solid var(--border);
      border-radius:14px; width:min(560px,92vw); padding:40px 32px;
      box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 8px 30px rgba(0,0,0,.04);
      text-align:center; }
    .emoji { font-size:3.4rem; line-height:1.35; word-break:break-word;
      min-height:1.4em; }
    .reveal { margin-top:18px; padding-top:18px; border-top:1px dashed var(--border2); }
    .reveal.hidden { display:none; }
    .title { font-size:1.7rem; font-weight:700; color:var(--accent); }
    .line { font-style:italic; font-size:1.15rem; color:var(--text-muted); margin-top:6px; }
    .alt { font-family:var(--mono); font-size:.7rem; color:var(--text-dim);
      margin-top:14px; letter-spacing:.04em; }
    .alt span { color:var(--text-muted); }
    .row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    button { font-family:var(--mono); font-size:.78rem; letter-spacing:.06em;
      text-transform:uppercase; padding:12px 20px; border-radius:10px;
      border:1px solid var(--border2); background:var(--surface2); color:var(--text);
      cursor:pointer; transition:transform .06s ease, background .15s ease; }
    button:hover { background:#e9e1cd; }
    button:active { transform:translateY(1px); }
    button.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
    button.got { color:var(--green); border-color:var(--green); }
    button.miss { color:var(--red); border-color:var(--red); }
    .msg { font-family:var(--mono); font-size:.85rem; color:var(--text-muted); }
    .score { font-size:2.2rem; font-weight:700; color:var(--accent); }
  </style>
</head>
<body>
  <header>
    <h1>Emoji or It Didn't Happen</h1>
    <div class="sub">Michael Jackson · guess the song from the emoji</div>
  </header>
  <div class="progress" id="progress"></div>
  <div class="card" id="card"><div class="msg" id="boot">Loading deck…</div></div>

  <script>
    const $ = (id) => document.getElementById(id);
    const state = { deck: [], idx: 0, revealed: false, got: 0, missed: 0 };

    function shuffle(a) { // Fisher-Yates
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function renderCard() {
      const c = state.deck[state.idx];
      $('progress').textContent = `${state.idx + 1} / ${state.deck.length}`;
      const alt = c.emojiAlt
        ? `<div class="alt"><span>minimax</span> ${esc(c.emoji)} &nbsp;·&nbsp; <span>gpt-4o-mini</span> ${esc(c.emojiAlt)}</div>`
        : '';
      $('card').innerHTML = `
        <div class="emoji">${esc(c.emoji)}</div>
        <div class="reveal ${state.revealed ? '' : 'hidden'}" id="reveal">
          <div class="title">${esc(c.title)}</div>
          <div class="line">&ldquo;${esc(c.line)}&rdquo;</div>
          ${alt}
        </div>
        <div class="row" style="margin-top:22px;" id="controls"></div>`;
      const controls = $('controls');
      if (!state.revealed) {
        const b = document.createElement('button');
        b.className = 'primary'; b.textContent = 'Reveal';
        b.onclick = () => { state.revealed = true; renderCard(); };
        controls.appendChild(b);
      } else {
        const got = document.createElement('button');
        got.className = 'got'; got.textContent = 'Got it ✅';
        got.onclick = () => advance(true);
        const miss = document.createElement('button');
        miss.className = 'miss'; miss.textContent = 'Missed ❌';
        miss.onclick = () => advance(false);
        controls.append(got, miss);
      }
    }

    function advance(scored) {
      if (scored) state.got++; else state.missed++;
      state.idx++;
      state.revealed = false;
      if (state.idx >= state.deck.length) renderEnd(); else renderCard();
    }

    function renderEnd() {
      const total = state.got + state.missed;
      $('progress').textContent = 'done';
      $('card').innerHTML = `
        <div class="msg">You named</div>
        <div class="score">${state.got} / ${total}</div>
        <div class="row" style="margin-top:24px;"><button class="primary" id="again">Play again</button></div>`;
      $('again').onclick = start;
    }

    function start() {
      state.idx = 0; state.revealed = false; state.got = 0; state.missed = 0;
      shuffle(state.deck);
      renderCard();
    }

    fetch('./data/cards.json')
      .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((cards) => {
        if (!Array.isArray(cards) || cards.length === 0) throw new Error('empty deck');
        state.deck = cards.slice();
        start();
      })
      .catch((e) => {
        $('card').innerHTML = `<div class="msg">Deck failed to load — run <code>node game/scripts/build-cards.mjs</code>.<br><small>${esc(String(e))}</small></div>`;
      });
  </script>
</body>
</html>
```

- [ ] **Step 2: Serve and verify in a browser**

Run (serves the repo root so `/game` resolves and `./data/cards.json` loads):
```bash
cd /home/benren/code/emoji_translator && python3 -m http.server 8765
```
Then open `http://localhost:8765/game/` (note: `python3 -m http.server` does not apply `cleanUrls`, so use the trailing-slash directory URL locally; on Vercel it's `/game`).

Verify manually:
- An emoji string shows on the card; progress reads `1 / 45`.
- **Reveal** shows the correct song title + original line; the `minimax · gpt-4o-mini` line appears only when `emojiAlt` exists.
- **Got it / Missed** advance the card and progress increments.
- After the last card, the end screen shows `N / 45` and **Play again** reshuffles (different first card on repeat).

Stop the server with Ctrl-C when done.

- [ ] **Step 3: Verify on the real Vercel routing (optional but recommended)**

Run: `vercel dev` (from repo root), then open `http://localhost:3000/game`.
Expected: the page loads at the clean `/game` URL and plays identically.

- [ ] **Step 4: Commit**

```bash
git add game/index.html
git commit -m "feat(game): MJ emoji flashcard game page"
```

---

## Task 7: Wire-up note (no code) + final verification

- [ ] **Step 1: Confirm `/game` deploys with no config change**

`vercel.json` has `cleanUrls: true` and headers on `source: "/(.*)"`, so `game/index.html` is served at `/game` and inherits the same CSP. The CSP's `connect-src 'self'` permits the same-origin `fetch('./data/cards.json')`, and `style-src`/`font-src` already allow the Google Fonts used. **No `vercel.json` change is required.**

- [ ] **Step 2: Full pipeline dry-run from clean (sanity)**

Run:
```bash
node game/scripts/make-eval.mjs \
  && (cd research && python3 bootstrap_translations.py --eval data/mj_lyrics.jsonl --run-dir results/mj_game --models minimax,openai --sleep 1) \
  && node game/scripts/build-cards.mjs \
  && node game/scripts/check-cards.mjs \
  && node --test game/scripts/lib.test.mjs
```
Expected: ends with `OK: 45 cards…` and `# pass 3 / # fail 0`. (Translation step is a no-op resume if already baked.)

- [ ] **Step 3: Optional — add a one-line README pointer**

If desired, add to `README.md` under a "Play" note: "`/game` — MJ emoji-guessing flashcards (data baked by `game/scripts/*`)." Commit separately. (Skip if you prefer to keep README focused on the translator.)

---

## Self-Review (completed during planning)

- **Spec coverage:** standalone `game/index.html` (Task 6) ✓; ~45 solo hits, one iconic line (Task 1) ✓; flashcard/self-score (Task 6) ✓; pre-baked static JSON via `bootstrap_translations.py` (Tasks 3–5) ✓; MiniMax `emoji` + gpt-4o-mini `emojiAlt` head-to-head easter egg (Tasks 5–6) ✓; resumable pipeline (Task 4) ✓; error handling for missing/empty deck (Task 6) ✓; validity check (Task 5) ✓; no full-lyric storage (Task 1: single short lines) ✓.
- **Placeholder scan:** no TBD/TODO; all code blocks are complete; Task 7 Step 3 is explicitly optional, not a placeholder.
- **Type consistency:** `toEvalRows`/`buildCards` signatures and the `{id,title,line,emoji,emojiAlt?}` card shape are identical across `lib.mjs`, tests, `build-cards.mjs`, `check-cards.mjs`, and `index.html`. Translation cell access (`translations.minimax.emoji`, `translations.openai.emoji`) matches the documented `translations.jsonl` contract.
```
