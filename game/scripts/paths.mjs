// Shared CLI helpers for the pack-based build scripts. A "pack" is one themed deck
// (e.g. mj, hamilton). All per-pack artifact paths follow a single slug convention so
// adding a pack is just: drop game/data/packs/<slug>.json, run the pipeline with --pack <slug>.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/** Parse `--pack <slug>` from a process argv array. Throws with usage on absence. */
export function packArg(argv) {
  const i = argv.indexOf('--pack');
  const slug = i === -1 ? undefined : argv[i + 1];
  if (!slug) throw new Error('usage: --pack <slug>  (e.g. --pack hamilton)');
  if (!/^[a-z0-9_]+$/.test(slug)) throw new Error(`invalid pack slug: ${slug}`);
  return slug;
}

/** Canonical artifact paths for a pack, resolved relative to game/scripts (pass import.meta.url). */
export function packPaths(metaUrl, slug) {
  const here = dirname(fileURLToPath(metaUrl)); // game/scripts
  return {
    slug,
    script: resolve(here, `../data/packs/${slug}.script.json`),             // extracted source script (optional upstream)
    source: resolve(here, `../data/packs/${slug}.json`),                    // pack lyrics (hand-authored or script-derived)
    evalOut: resolve(here, `../../research/data/${slug}_lyrics.jsonl`),     // bootstrap input
    translations: resolve(here, `../../research/results/${slug}/translations.jsonl`), // bootstrap output
    cardsOut: resolve(here, `../data/packs/${slug}.cards.json`),            // game input
    manifest: resolve(here, '../data/packs.json'),                         // client-facing pack list
  };
}
