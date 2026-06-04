import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packArg, packPaths } from './paths.mjs';

test('packArg extracts the slug after --pack', () => {
  assert.equal(packArg(['node', 'x.mjs', '--pack', 'hamilton']), 'hamilton');
});

test('packArg rejects a missing or invalid slug', () => {
  assert.throws(() => packArg(['node', 'x.mjs']), /usage/);
  assert.throws(() => packArg(['node', 'x.mjs', '--pack', 'Bad Slug']), /invalid pack slug/);
});

test('packPaths follows the slug convention', () => {
  const p = packPaths(import.meta.url, 'hamilton');
  assert.ok(p.source.endsWith('/game/data/packs/hamilton.json'));
  assert.ok(p.evalOut.endsWith('/research/data/hamilton_lyrics.jsonl'));
  assert.ok(p.translations.endsWith('/research/results/hamilton/translations.jsonl'));
  assert.ok(p.cardsOut.endsWith('/game/data/packs/hamilton.cards.json'));
  assert.ok(p.manifest.endsWith('/game/data/packs.json'));
});
