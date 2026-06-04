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
