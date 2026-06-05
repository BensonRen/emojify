// Pure transforms shared by the game build scripts. No I/O here so it stays testable.

/** title -> stable id slug. "Cabinet Battle #1" -> "cabinet_battle_1". */
export function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Normalize the script's curly typography to the straight ASCII the existing pack uses.
const smartQuotes = [[/[‘’]/g, "'"], [/[“”]/g, '"'], [/…/g, '...']];
function cleanLine(raw) {
  let s = raw.trim().replace(/\s+/g, ' ');
  for (const [re, to] of smartQuotes) s = s.replace(re, to);
  s = s.replace(/^["']+|["']+$/g, '');     // drop wrapping quotes
  return s.replace(/[\s,;:—–-]+$/g, '').trim(); // drop trailing verse-fragment punctuation
}

// Dedup key: case/punctuation-insensitive so "Just you wait" == "Just you wait...".
const dedupeKey = (line) => line.toLowerCase().replace(/[^a-z0-9]+/g, '');

// Lines that are pure interjection/filler or stage directions — never good guess cards.
const FILLER_RE = /^(o+h+|a+h+|wh?o+a+|hey+|ya+y+|yea+h+|na+|la+|da+|hmm+|mm+|boom|woo+|oo+h?|huh|yo)[\s!?.,]*$/i;
const STAGE_RE = /^\d{3,4}[.,]/; // e.g. "1776. New York City." (a setting note flattened into text)

function isGuessable(line, minWords, maxWords) {
  if (!line || STAGE_RE.test(line)) return false;
  if (FILLER_RE.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < minWords || words.length > maxWords) return false;
  if (!/[a-z]/i.test(line)) return false; // must contain letters
  return true;
}

/** Memorability proxy for a candidate lyric line (higher = better card).
 *  This is the one knob worth tuning: it decides WHICH lines survive the per-song cap.
 *  Heuristic: favor punchy, mid-length lines (a sweet spot of ~8 words) and give a small
 *  bump for distinctive Capitalized words mid-line (names/places like "Burr", "New York").
 *  It is deliberately simple and transparent — not a real memorability model. */
export function scoreLine(line, ideal = 8) {
  const words = line.split(/\s+/);
  let score = -Math.abs(words.length - ideal);                 // favor ~ideal length
  const properNouns = words.slice(1).filter((w) => /^[A-Z][a-z]/.test(w)).length;
  score += Math.min(properNouns, 3) * 0.5;                     // bump distinctive names/places
  if (/^[a-z]/.test(line)) score -= 2;                         // demote mid-verse continuations
  if (/(\w)\1{2,}/.test(line)) score -= 3;                     // demote elongations ("yesssss", "Dooo")
  if (/\b(\w+)\b\s+\1\b/i.test(line)) score -= 2;              // demote immediate word repeats ("hey hey")
  return score;
}

/** Extracted script (acts -> songs -> speaker blocks) -> flat line-level pack lyrics
 *  [{id, title, line}] in the schema the rest of the pipeline already consumes.
 *  - Splits each speaker block into individual lyric lines.
 *  - Drops filler/stage-direction lines and anything outside [minWords, maxWords].
 *  - Globally de-duplicates (the show repeats lines like "Just you wait" constantly).
 *  - Keeps the top `perSong` lines per song by scoreLine, output in narrative order,
 *    so the deck stays balanced across songs and bounded in size (and emoji-bake cost).
 *  Opts: { minWords=4, maxWords=16, perSong=4 }. */
export function scriptToLyrics(script, opts = {}) {
  const { minWords = 4, maxWords = 16, perSong = 4 } = opts;
  const seen = new Set();   // global dedupe across the whole deck
  const usedIds = new Set();
  const out = [];

  for (const act of script.acts || []) {
    for (const song of act.songs || []) {
      let songSlug = slugify(song.title);
      while (usedIds.has(songSlug)) songSlug += '_'; // guard title-slug collisions
      usedIds.add(songSlug);

      // Collect candidate lines, preserving first-appearance order.
      const cands = [];
      const localSeen = new Set();
      let order = 0;
      for (const block of song.lines || []) {
        for (const raw of String(block.text || '').split('\n')) {
          const line = cleanLine(raw);
          const key = dedupeKey(line);
          if (!isGuessable(line, minWords, maxWords)) continue;
          if (seen.has(key) || localSeen.has(key)) continue;
          localSeen.add(key);
          cands.push({ line, key, order: order++, score: scoreLine(line) });
        }
      }

      // Top-N by score, then restore narrative order for a nicer-reading deck.
      const picked = cands
        .sort((a, b) => b.score - a.score || a.order - b.order)
        .slice(0, perSong)
        .sort((a, b) => a.order - b.order);

      picked.forEach((c, i) => {
        seen.add(c.key);
        out.push({
          id: `${songSlug}__${String(i + 1).padStart(2, '0')}`,
          title: song.title,
          line: c.line,
        });
      });
    }
  }
  return out;
}

// Keep only true emoji code points: pictographs + the joiners/modifiers that build
// emoji sequences (ZWJ, variation selectors, skin-tone modifiers, regional-indicator
// flag halves). Drops stray letters, digits, CJK (e.g. MiniMax emitting 万 for
// "million"), and punctuation that models leak despite the "emoji only" instruction.
const EMOJI_KEEP = /[\p{Extended_Pictographic}\u200d\uFE0F\uFE0E\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}]/u;

/** Strip non-emoji characters from a model's raw output for use in the game deck.
 *  Research keeps raw output; only the player-facing cards are cleaned. */
export function sanitizeEmoji(s) {
  return Array.from(s || '').filter((ch) => EMOJI_KEEP.test(ch)).join('');
}

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
    const emoji = sanitizeEmoji((t.minimax && t.minimax.emoji) ? t.minimax.emoji : '');
    const alt = sanitizeEmoji((t.openai && t.openai.emoji) ? t.openai.emoji : '');
    const card = { id, title, line, emoji };
    if (alt) card.emojiAlt = alt;
    return card;
  });
}
