// Joins game/data/packs/<slug>.json with research/results/<slug>/translations.jsonl
// (via buildCards) -> game/data/packs/<slug>.cards.json consumed by the game.
// Usage: node game/scripts/build-cards.mjs --pack <slug>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildCards } from './lib.mjs';
import { packArg, packPaths } from './paths.mjs';

const { source, translations, cardsOut } = packPaths(import.meta.url, packArg(process.argv));

const lyrics = JSON.parse(readFileSync(source, 'utf8'));
const translationRows = readFileSync(translations, 'utf8')
  .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const cards = buildCards(lyrics, translationRows);
writeFileSync(cardsOut, JSON.stringify(cards, null, 2) + '\n');
console.log(`wrote ${cards.length} cards -> ${cardsOut}`);
