import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEvalRows, buildCards } from './lib.mjs';

const lyrics = [
  { id: 'a', title: 'Song A', line: 'line a' },
  { id: 'b', title: 'Song B', line: 'line b' },
  { id: 'c', title: 'Song C', line: 'line c' },
];

test('toEvalRows maps to the bootstrap eval schema', () => {
  const rows = toEvalRows(lyrics);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    id: 'a', text: 'line a', category: 'lyric', expected_tone: '', title: 'Song A',
  });
});

test('buildCards joins by id and prefers the minimax emoji', () => {
  const translations = [
    { id: 'a', translations: { minimax: { emoji: '🅰️', ok: true }, openai: { emoji: 'A!', ok: true } } },
    { id: 'b', translations: { minimax: { emoji: '🅱️', ok: true } } }, // no openai cell
  ];
  const cards = buildCards(lyrics, translations);
  // 'c' has no translation row at all -> emoji "" (caught later by check-cards)
  assert.equal(cards.length, 3);
  assert.deepEqual(cards[0], { id: 'a', title: 'Song A', line: 'line a', emoji: '🅰️', emojiAlt: 'A!' });
  assert.deepEqual(cards[1], { id: 'b', title: 'Song B', line: 'line b', emoji: '🅱️' });
  assert.equal(cards[2].emoji, '');
  assert.equal('emojiAlt' in cards[2], false);
});

test('buildCards omits emojiAlt when openai emoji is empty or failed', () => {
  const translations = [
    { id: 'a', translations: { minimax: { emoji: '🅰️', ok: true }, openai: { emoji: '', ok: false } } },
  ];
  const cards = buildCards([lyrics[0]], translations);
  assert.equal('emojiAlt' in cards[0], false);
});
