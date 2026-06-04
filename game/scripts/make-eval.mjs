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
