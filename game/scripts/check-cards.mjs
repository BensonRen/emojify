// Validity gate: every card must have id/title/line and a non-empty emoji.
// Exits non-zero (listing offenders) so a bad bake can't silently ship.
// Usage:
//   node game/scripts/check-cards.mjs --pack <slug>   # check one pack's cards
//   node game/scripts/check-cards.mjs                 # check every pack in packs.json
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { packPaths } from './paths.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argi = process.argv.indexOf('--pack');
const slug = argi === -1 ? undefined : process.argv[argi + 1];

// Resolve the list of cards files to check: one pack, or all packs in the manifest.
let cardsFiles;
if (slug) {
  cardsFiles = [packPaths(import.meta.url, slug).cardsOut];
} else {
  const manifest = JSON.parse(readFileSync(resolve(here, '../data/packs.json'), 'utf8'));
  cardsFiles = manifest.packs.map((p) => resolve(here, '../data', p.cards));
}

let failed = false;
for (const file of cardsFiles) {
  const cards = JSON.parse(readFileSync(file, 'utf8'));
  const name = file.split('/').pop();
  if (!Array.isArray(cards) || cards.length === 0) {
    console.error(`FAIL ${name}: empty or not an array`);
    failed = true;
    continue;
  }
  const bad = cards.filter((c) => !c.id || !c.title || !c.line || !c.emoji);
  if (bad.length) {
    console.error(`FAIL ${name}: ${bad.length} card(s) missing emoji/fields:`, bad.map((c) => c.id));
    failed = true;
    continue;
  }
  const withAlt = cards.filter((c) => c.emojiAlt).length;
  console.log(`OK ${name}: ${cards.length} cards, all have emoji (${withAlt} also have emojiAlt)`);
}
if (failed) process.exit(1);
