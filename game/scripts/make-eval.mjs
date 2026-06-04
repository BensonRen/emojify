// Reads game/data/packs/<slug>.json, writes research/data/<slug>_lyrics.jsonl (one JSON/line)
// for bootstrap_translations.py to consume via --eval data/<slug>_lyrics.jsonl.
// Usage: node game/scripts/make-eval.mjs --pack <slug>
import { readFileSync, writeFileSync } from 'node:fs';
import { toEvalRows } from './lib.mjs';
import { packArg, packPaths } from './paths.mjs';

const { source, evalOut } = packPaths(import.meta.url, packArg(process.argv));

const lyrics = JSON.parse(readFileSync(source, 'utf8'));
const rows = toEvalRows(lyrics);
writeFileSync(evalOut, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`wrote ${rows.length} rows -> ${evalOut}`);
