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
