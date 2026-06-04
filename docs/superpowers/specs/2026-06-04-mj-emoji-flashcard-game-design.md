# MJ Emoji Flashcard Game — Design Spec

**Date:** 2026-06-04
**Status:** Approved (design); pending implementation plan

## Goal

A playable, single-page **emoji-guessing flashcard game**: the player is shown the
emoji translation of an iconic Michael Jackson lyric and tries to name the song,
then reveals the answer and self-scores. It reuses the existing Emojify translation
machinery to pre-generate the emoji.

## Scope

- **~40–50 solo MJ hits**, one **iconic line per song** (the instantly-recognizable
  hook). Single short lines only — fair use; **no full-lyric storage**.
- **Flashcard / self-score** mechanic (no automatic answer checking).
- **Pre-baked** emoji translations served as static JSON — no API calls at play time.

Out of scope (YAGNI): multiple-choice/free-text grading, difficulty modes, Jackson 5
era, live translation, accounts, persistence/leaderboards.

## Architecture

A **standalone static page at `game/index.html`**, matching the main app's ethos:
vanilla JS, inline CSS/JS, no build step, no dependencies, CSP-friendly. It loads a
pre-baked `game/data/cards.json` and runs entirely client-side. Deployable for free as
the `/game` route under Vercel `cleanUrls`.

Rationale for standalone (vs. extending the 48KB `index.html`): the game is a distinct
interaction (deck / shuffle / reveal / score) with its own state; a separate file keeps
both pages small and focused.

## Data pipeline (offline, one-time, resumable)

```
game/data/mj_lyrics.json       ← hand-authored: ~45 songs, one iconic line each
                                  [{ id, title, line }]
   │  build step → schema bootstrap_translations.py expects
   ▼
research/.../mj_lyrics.jsonl    ← { id, text, category: "lyric", expected_tone }
   │  python3 bootstrap_translations.py --eval … --models minimax,openai
   ▼
…/translations.jsonl           ← lyric → { minimax:{emoji}, openai:{emoji} }
   │  build script: game/build_cards.mjs
   ▼
game/data/cards.json           ← [{ id, title, line, emoji, emojiAlt? }]
```

- **Lyrics** authored from knowledge; one short iconic line per song.
- `emoji` = **MiniMax** (always-available provider; `OPENAI_API_KEY` is optional).
- `emojiAlt` = **gpt-4o-mini** when a key was present at bake time, else omitted.
- Resumable: bootstrap's merge logic means adding songs later only translates the new
  ones; existing `ok` cells are preserved byte-for-byte.

## Game behavior (`game/index.html`)

- **On load:** fetch `cards.json`, **shuffle** the deck.
- **Card front:** the emoji string, large; a **Reveal** button.
- **Reveal:** show **song title** + the **original line**; if `emojiAlt` exists, show a
  small "head-to-head" easter egg (MiniMax vs. gpt-4o-mini attempts) tying back to the
  app's identity.
- **Self-score:** **Got it ✅ / Missed ❌** → running tally + deck progress ("12 / 45").
- **End of deck:** final score; **Play again** reshuffles.

## Error handling

- `cards.json` missing/malformed → friendly "deck failed to load" message.
- Empty deck → graceful done screen (no crash).
- Missing `emojiAlt` → reveal simply omits the easter egg.

## Testing & verification

Light, consistent with the repo's "no test suite" stance:
- A tiny validity check that every card in `cards.json` has a non-empty `emoji`.
- Manual browser pass: open `game/index.html`, reveal a few cards, finish a deck,
  confirm score + reshuffle.
