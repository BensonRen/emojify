// Pre-push local smoke for galaxy art styles + walkable worlds.
// Serves the repo root statically (no API — network errors there are expected & ignored).
// Usage: node smoke-local.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = normalize(join(ROOT, p));
  if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }
  try {
    // cleanUrls-ish: directory (or extensionless path) resolves to its index.html
    // BEFORE the MIME lookup — otherwise /world ships as octet-stream and the browser aborts
    const st = await stat(file).catch(() => null);
    if (st?.isDirectory()) file = join(file, 'index.html');
    else if (!st && !extname(file)) file = file + '/index.html';
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(8765, r));
const BASE = 'http://localhost:8765';

const results = [];
const ok = (n) => { results.push(['PASS', n]); console.log(`  ✅ ${n}`); };
const bad = (n, d) => { results.push(['FAIL', `${n} — ${d}`]); console.log(`  ❌ ${n} — ${d}`); };
const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(n, fn) { try { await fn(); ok(n); } catch (e) { bad(n, e.message); } }

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
async function page(viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // /api/* will fail on the static server — that's expected here, not a JS error
  p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('/api/')) errors.push(`console: ${m.text()}`); });
  return { ctx, p, errors };
}

console.log('— local smoke —');

await check('galaxy boots with 5 art styles, intro reveals, no errors', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#intro.gone', { timeout: 15000 });
  const g = await p.evaluate(() => window.__galaxy);
  assert(g && g.styles.cipher === 'clay' && g.styles.translate === 'paper' && g.styles.games === 'voxel'
    && g.styles.forge === 'molten' && g.styles.wall === 'mosaic', `styles: ${JSON.stringify(g?.styles)}`);
  await p.waitForTimeout(700);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-galaxy-styles.png' });
  await ctx.close();
});

await check('galaxy: click planet → land → navigates to /world#translate', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/#1`, { waitUntil: 'domcontentloaded' }); // deep-link straight to Translate, intro skipped
  await p.waitForSelector('#panel.on', { timeout: 8000 });
  await p.click('#p-row button:first-child'); // 'land →'
  await p.waitForURL((u) => u.pathname.startsWith('/world'), { timeout: 15000, waitUntil: 'commit' });
  assert(p.url().includes('#translate'), `url: ${p.url()}`);
  await ctx.close();
});

await check('world#translate: walkable scene boots, avatar walks, kiosk card opens', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  const before = await p.evaluate(() => window.__world.posDir());
  await p.keyboard.down('ArrowUp');
  await p.waitForTimeout(700);
  await p.keyboard.up('ArrowUp');
  const after = await p.evaluate(() => window.__world.posDir());
  const dot = before[0] * after[0] + before[1] * after[1] + before[2] * after[2];
  assert(dot < 0.99999, `avatar did not move (dot=${dot})`);
  await p.evaluate(() => window.__world.openTool()); // the header shortcut hides for 20s — the walk has right of way
  await p.waitForSelector('#tool.on', { timeout: 3000 });
  assert(await p.locator('#tt').count() === 1, 'translate kiosk textarea missing');
  await p.keyboard.press('Escape');
  assert(!(await p.evaluate(() => document.getElementById('tool').classList.contains('on'))), 'Escape did not close tool');
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-world-translate.png' });
  await ctx.close();
});

await check('world#games: voxel theme, kiosk → /game CTA', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#games`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  const w = await p.evaluate(() => window.__world);
  assert(w.key === 'games' && w.theme.pixel === true && w.theme.terrace === true, JSON.stringify(w.theme));
  const title = await p.locator('#w-title').textContent();
  assert(title === 'Field Games', `title: ${title}`);
  await p.evaluate(() => window.__world.openTool()); // the header shortcut hides for 20s — the walk has right of way
  await p.waitForSelector('#tool.on', { timeout: 3000 });
  await p.click('#tgo');
  await p.waitForURL((u) => u.pathname.startsWith('/game'), { timeout: 8000, waitUntil: 'commit' });
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('world with unknown hash redirects to galaxy', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/world/#cipher`, { waitUntil: 'domcontentloaded' });
  await p.waitForURL((u) => !u.pathname.includes('world'), { timeout: 8000 });
  await ctx.close();
});

await check('world leave → back to galaxy focused on that planet', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.click('#leave');
  await p.waitForURL((u) => !u.pathname.startsWith('/world') && u.hash === '#1', { timeout: 8000, waitUntil: 'commit' });
  await ctx.close();
});

await check('#in:translate redirect → /world#translate (head script)', async () => {
  const { ctx, p } = await page();
  // the head script replace()s during parse, which aborts the original goto — that's expected
  await p.goto(`${BASE}/#in:translate`, { waitUntil: 'commit' }).catch(() => {});
  await p.waitForURL((u) => u.pathname.startsWith('/world'), { timeout: 8000, waitUntil: 'commit' });
  assert(p.url().includes('#translate'), p.url());
  await ctx.close();
});

await check('galaxy: sealed letter exists and opens; ambience module loaded', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/#1`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#panel.on', { timeout: 8000 });
  const g = await p.evaluate(() => ({ letter: window.__galaxy.letter, amb: typeof window.Ambience }));
  assert(g.letter === true, 'letter flag missing');
  assert(g.amb === 'object', 'Ambience not loaded');
  await p.evaluate(() => window.__galaxy.openLetter());
  await p.waitForSelector('#letter.on', { timeout: 3000 });
  await p.fill('#lt-in', 'the night we missed the last train');
  await p.click('#lt-go');
  const out = await p.locator('#lt-out').textContent();
  assert(out.includes('sealed'), `letter out: ${out}`);
  await p.keyboard.press('Escape');
  assert(!(await p.evaluate(() => document.getElementById('letter').classList.contains('on'))), 'Escape did not close letter');
  await ctx.close();
});

await check('world: residents wander/greet states live; walking causes no errors', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.keyboard.down('ArrowUp');
  await p.waitForTimeout(1200);
  await p.keyboard.up('ArrowUp');
  const states = await p.evaluate(() => window.__world.residents());
  assert(Array.isArray(states) && states.length === 8, `residents: ${JSON.stringify(states)}`);
  assert(states.every((s) => ['wander', 'greet', 'flee', 'nap'].includes(s)), `bad states: ${states}`);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('world: air-mail quest — pick up from resident, deliver to landmark; structures collide', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  const w0 = await p.evaluate(() => ({ col: window.__world.colliders, mail: window.__world.mail() }));
  assert(w0.col > 10, `expected authored colliders, got ${w0.col}`);
  assert(w0.mail.carrying === false && w0.mail.done === 0, `fresh mail state: ${JSON.stringify(w0.mail)}`);
  await p.evaluate(() => window.__world._tp(window.__world._mail.giver())); // walk up to the letter-waver
  await p.waitForFunction(() => window.__world.mail().carrying === true, null, { timeout: 4000 });
  const hint = await p.locator('#quest').textContent();
  assert(hint.includes('deliver to'), `quest pill: ${hint}`);
  await p.evaluate(() => window.__world._tp(window.__world._mail.target())); // carry it to the landmark
  await p.waitForFunction(() => window.__world.mail().done === 1, null, { timeout: 4000 });
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('world: space jumps and lands; the front door leads INSIDE and back out', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.keyboard.press(' ');
  await p.waitForFunction(() => window.__world.jump() > 0.2, null, { timeout: 1500 });
  await p.waitForFunction(() => window.__world.jump() === 0, null, { timeout: 3000 }); // gravity wins
  await p.evaluate(() => window.__world._enter());
  await p.waitForFunction(() => window.__world.interior() === true, null, { timeout: 3000 });
  await p.evaluate(() => window.__world.openTool()); // the counter works from inside
  await p.waitForSelector('#tool.on', { timeout: 3000 });
  await p.keyboard.press('Escape');
  await p.evaluate(() => window.__world._exit());
  await p.waitForFunction(() => window.__world.interior() === false, null, { timeout: 3000 });
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('world: loot collects on touch; balloon ride takes over and lands', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  const before = await p.evaluate(() => window.__world.loot());
  assert(before.got === 0 && before.total >= 8, `fresh loot: ${JSON.stringify(before)}`);
  await p.evaluate(() => window.__world._tp(window.__world._loot.dirs()[0]));
  await p.waitForFunction(() => window.__world.loot().got === 1, null, { timeout: 4000 });
  await p.evaluate(() => window.__world._ride(2)); // short lap for the test
  await p.waitForFunction(() => window.__world.riding() === true, null, { timeout: 2000 });
  await p.waitForFunction(() => window.__world.riding() === false, null, { timeout: 8000 });
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('world#games: the circuit — arch starts the race, 3 stars + return finishes it', async () => {
  const { ctx, p, errors } = await page();
  await p.goto(`${BASE}/world/#games`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.waitForTimeout(4200); // race arming has a settle-in window
  await p.evaluate(() => window.__world._tp(window.__world._race.arch()));
  await p.waitForFunction(() => !!window.__world.race(), null, { timeout: 4000 });
  for (let i = 0; i < 3; i++) {
    await p.evaluate((j) => window.__world._tp(window.__world._race.ckpts()[j]), i);
    await p.waitForFunction((j) => { const r = window.__world.race(); return r && r.next === j + 1; }, i, { timeout: 4000 });
  }
  await p.evaluate(() => window.__world._tp(window.__world._race.arch()));
  await p.waitForFunction(() => window.__world.race() === null, null, { timeout: 4000 });
  const best = await p.evaluate(() => localStorage.getItem('emojify-race-best'));
  assert(best && +best > 0, `best time persisted: ${best}`);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('COMMONS: two visitors see each other; a mural tile propagates live', async () => {
  const { spawn } = await import('node:child_process');
  const { rmSync } = await import('node:fs');
  rmSync('/tmp/emojify-test-mural.json', { force: true });
  const srv = spawn('node', ['../server/index.mjs'], { env: { ...process.env, PORT: '8788', MURAL_FILE: '/tmp/emojify-test-mural.json' } });
  await new Promise((r) => setTimeout(r, 800));
  try {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem('emojify-ws', 'ws://localhost:8788'));
    const p1 = await ctx.newPage(), p2 = await ctx.newPage();
    const errs = []; [p1, p2].forEach((p) => p.on('pageerror', (e) => errs.push(e.message)));
    await p1.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
    await p1.waitForSelector('#loading.gone', { timeout: 15000 });
    await p2.goto(`${BASE}/world/#translate`, { waitUntil: 'domcontentloaded' });
    await p2.waitForSelector('#loading.gone', { timeout: 15000 });
    await p1.waitForFunction(() => window.__world.peers() === 1, null, { timeout: 8000 });
    await p2.waitForFunction(() => window.__world.peers() === 1, null, { timeout: 8000 });
    await p1.evaluate(() => window.__world._muralPlace(7, '🌙'));
    await p2.waitForFunction(() => window.__world.muralTiles()['7'] === '🌙', null, { timeout: 5000 });
    assert(errs.length === 0, errs.slice(0, 2).join(' | '));
    await ctx.close();
  } finally { srv.kill(); }
});

await check('cipher: seal → wrong guess holds → normalized right guess opens (real AES-GCM)', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/cipher/`, { waitUntil: 'domcontentloaded' });
  await p.fill('#c-q', 'what does 🌙 mean to us?');
  await p.fill('#c-a', 'the last train');
  await p.fill('#c-m', '晚安，开拓者。');
  await p.click('#c-go');
  await p.waitForSelector('#c-out:not(.hidden)', { timeout: 10000 });
  const link = await p.locator('#c-link').textContent();
  assert(link.includes('#c='), `link: ${link.slice(0, 60)}`);
  const hash = link.slice(link.indexOf('#'));
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/cipher/${hash}`, { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#open:not(.hidden)', { timeout: 6000 });
  await p2.fill('#o-a', 'wrong answer');
  await p2.click('#o-go');
  await p2.waitForFunction(() => document.getElementById('o-line').textContent.includes('seal holds'), null, { timeout: 10000 });
  await p2.fill('#o-a', '  The Last TRAIN '); // case/space-insensitive wavelength
  await p2.click('#o-go');
  await p2.waitForSelector('#o-opened:not(.hidden)', { timeout: 10000 });
  const msg = await p2.locator('#o-msg').textContent();
  assert(msg === '晚安，开拓者。', `decrypted: ${msg}`);
  await ctx.close();
});

await check('game: daily mode present + #daily deep link boots the round', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/game/`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body.textContent.includes("Today's line"), null, { timeout: 10000 });
  await p.goto('about:blank');
  await p.goto(`${BASE}/game/#daily`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('progress')?.textContent.includes("today's line"), null, { timeout: 10000 });
  await ctx.close();
});

await check('galaxy: fluent atlas active, pause button toggles, cipher counter in panel', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/#0`, { waitUntil: 'domcontentloaded' }); // focus cipher
  await p.waitForSelector('#panel.on', { timeout: 10000 });
  const g = await p.evaluate(() => window.__galaxy);
  assert(g.fluent === true, 'fluent atlas did not load locally');
  const btnText = await p.locator('#p-row button').first().textContent();
  assert(btnText.includes('seal a letter'), `cipher panel button: ${btnText}`);
  await p.click('#gpause');
  assert((await p.locator('#gpause').textContent()) === '▶', 'pause did not toggle');
  await ctx.close();
});

await check('share.js roundtrip in-browser (deflate + fallback)', async () => {
  const { ctx, p } = await page();
  await p.goto(`${BASE}/translate/`, { waitUntil: 'domcontentloaded' });
  const out = await p.evaluate(async () => {
    const obj = { v: 1, t: 'I love you 我爱你 🥹', r: [{ p: 'minimax', e: '❤️🥹' }, { p: 'openai', e: '💖' }] };
    const enc = await window.EmojiShare.encode(obj);
    const dec = await window.EmojiShare.decode(enc);
    const bad = await window.EmojiShare.decode('dZZZZ%%%');
    return { enc, match: JSON.stringify(dec) === JSON.stringify(obj), badIsNull: bad === null };
  });
  assert(out.match, 'roundtrip mismatch');
  assert(out.badIsNull, 'malformed input did not return null');
  assert(out.enc.length < 200, `encoded too long: ${out.enc.length}`);
  await ctx.close();
});

await browser.close();
server.close();
const fails = results.filter(([s]) => s === 'FAIL');
console.log(`\n══ ${results.length - fails.length}/${results.length} passed ══`);
if (fails.length) { fails.forEach(([, m]) => console.log(`  ✗ ${m}`)); process.exit(1); }
