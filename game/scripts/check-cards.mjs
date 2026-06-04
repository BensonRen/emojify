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
