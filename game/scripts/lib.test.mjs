import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEvalRows, buildCards, slugify, scriptToLyrics } from './lib.mjs';

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

test('slugify makes stable ids from titles', () => {
  assert.equal(slugify('Cabinet Battle #1'), 'cabinet_battle_1');
  assert.equal(slugify("You'll Be Back"), 'you_ll_be_back');
});

const script = {
  acts: [{
    act: 1,
    songs: [{
      number: 1,
      title: 'My Shot',
      lines: [
        { speaker: 'HAMILTON', text: 'I am not throwing away my shot\nHey yo' },
        // a repeat of an already-seen line + a too-short line + a stage note
        { speaker: 'COMPANY', text: 'I am not throwing away my shot\nWait!\n1776. New York City.' },
        { speaker: 'BURR', text: "Talk less, smile more, don't let them know" },
      ],
    }],
  }],
};

test('scriptToLyrics splits blocks into line-level cards and drops filler', () => {
  const out = scriptToLyrics(script, { minWords: 3, maxWords: 16, perSong: 10 });
  const linesOut = out.map((c) => c.line);
  assert.ok(linesOut.includes('I am not throwing away my shot'));
  assert.ok(linesOut.includes("Talk less, smile more, don't let them know"));
  // "Hey yo", "Wait!" (filler/too short) and "1776. New York City." (stage note) are dropped
  assert.ok(!linesOut.some((l) => /Hey yo|Wait!|1776/.test(l)));
  // the repeated line appears only once (global dedupe)
  assert.equal(linesOut.filter((l) => l === 'I am not throwing away my shot').length, 1);
  // schema + id shape
  assert.deepEqual(Object.keys(out[0]).sort(), ['id', 'line', 'title']);
  assert.match(out[0].id, /^my_shot__\d\d$/);
  assert.equal(out[0].title, 'My Shot');
});

test('scriptToLyrics caps lines per song', () => {
  const out = scriptToLyrics(script, { minWords: 3, maxWords: 16, perSong: 1 });
  assert.equal(out.length, 1);
});
