// Turns an extracted script (game/data/packs/<slug>.script.json, produced by
// extract-hamilton.py) into the line-level pack source game/data/packs/<slug>.json
// that the rest of the pipeline (make-eval -> bootstrap -> build-cards) consumes.
// Usage: node game/scripts/script-to-pack.mjs --pack <slug> [--per-song N]
import { readFileSync, writeFileSync } from 'node:fs';
import { scriptToLyrics } from './lib.mjs';
import { packArg, packPaths } from './paths.mjs';

const argv = process.argv;
const { script, source } = packPaths(import.meta.url, packArg(argv));

const perSongArg = argv.indexOf('--per-song');
const perSong = perSongArg === -1 ? undefined : Number(argv[perSongArg + 1]);
if (perSongArg !== -1 && !Number.isInteger(perSong)) {
  throw new Error('--per-song expects an integer');
}

const scriptDoc = JSON.parse(readFileSync(script, 'utf8'));
const lyrics = scriptToLyrics(scriptDoc, perSong ? { perSong } : {});
writeFileSync(source, JSON.stringify(lyrics, null, 2) + '\n');
console.log(`wrote ${lyrics.length} line-level cards -> ${source}`);
