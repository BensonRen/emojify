// E2E suite for the emojify galaxy + walkable worlds.
// Usage: node e2e.mjs [baseUrl]   (default: https://emojify.me)
// Two layers: HTTP contract checks (fetch) + real-browser checks (Playwright chromium).
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://emojify.me';
const results = [];
const ok = (name) => { results.push(['PASS', name]); console.log(`  ✅ ${name}`); };
const bad = (name, detail) => { results.push(['FAIL', `${name} — ${detail}`]); console.log(`  ❌ ${name} — ${detail}`); };

async function check(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e.message); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ─── Layer 1: HTTP contracts ───
console.log(`\n— HTTP contracts against ${BASE} —`);

await check('GET / serves the galaxy (title + local importmap, no CDN)', async () => {
  const r = await fetch(`${BASE}/`);
  assert(r.status === 200, `status ${r.status}`);
  const html = await r.text();
  assert(html.includes('emojify · a galaxy of emoji'), 'new title missing');
  assert(html.includes('/vendor/three/three.module.js'), 'local importmap missing');
  assert(!html.includes('cdn.jsdelivr.net'), 'CDN reference leaked into production');
  assert(!html.includes('raw.githubusercontent.com'), 'external sun texture leaked');
});

await check('CSP header intact on /', async () => {
  const r = await fetch(`${BASE}/`);
  const csp = r.headers.get('content-security-policy') || '';
  assert(csp.includes("script-src 'self' 'unsafe-inline'"), `csp: ${csp.slice(0, 80)}`);
});

await check('GET /world serves the walkable world shell', async () => {
  const r = await fetch(`${BASE}/world`, { redirect: 'follow' });
  assert(r.status === 200, `status ${r.status}`);
  const html = await r.text();
  assert(html.includes('Walk a tiny emoji planet'), 'world shell content missing');
  assert(!html.includes('cdn.jsdelivr.net'), 'CDN leaked into world page');
});

await check('GET vendored three + addons + sun asset + share.js', async () => {
  for (const [p, type] of [
    ['/vendor/three/three.module.js', 'javascript'],
    ['/vendor/three/addons/controls/OrbitControls.js', 'javascript'],
    ['/vendor/three/addons/postprocessing/UnrealBloomPass.js', 'javascript'],
    ['/assets/sun-grin-3d.png', 'image/png'],
    ['/assets/share.js', 'javascript'],
  ]) {
    const r = await fetch(`${BASE}${p}`);
    assert(r.status === 200, `${p} → ${r.status}`);
    assert((r.headers.get('content-type') || '').includes(type), `${p} content-type`);
  }
});

await check('GET /translate serves the Translation Bureau (+ share script wired)', async () => {
  const r = await fetch(`${BASE}/translate`, { redirect: 'follow' });
  assert(r.status === 200, `status ${r.status}`);
  const html = await r.text();
  assert(html.includes('Translation Bureau'), 'title missing');
  assert(html.includes('/assets/share.js'), 'share.js not loaded');
});

await check('GET /game still serves the lyric game', async () => {
  const r = await fetch(`${BASE}/game`, { redirect: 'follow' });
  assert(r.status === 200, `status ${r.status}`);
});

await check('GET /cipher serves the Cipher Office', async () => {
  const r = await fetch(`${BASE}/cipher`, { redirect: 'follow' });
  assert(r.status === 200, `status ${r.status}`);
  const html = await r.text();
  assert(html.includes('同频即密钥'), 'cipher fiction missing');
  assert(html.includes('PBKDF2'), 'honesty note missing');
});

await check('GET social/emoji assets: og.png + ambience + fluent manifest + key glyphs', async () => {
  for (const [p, type] of [
    ['/assets/og.png', 'image/png'],
    ['/assets/ambience.js', 'javascript'],
    ['/assets/emoji/manifest.json', 'json'],
    ['/assets/emoji/key.png', 'image/png'],
    ['/assets/emoji/astronaut.png', 'image/png'],
  ]) {
    const r = await fetch(`${BASE}${p}`);
    assert(r.status === 200, `${p} → ${r.status}`);
    assert((r.headers.get('content-type') || '').includes(type), `${p} content-type`);
  }
});

await check('og:image meta present on / and /translate', async () => {
  for (const path of ['/', '/translate']) {
    const html = await (await fetch(`${BASE}${path}`, { redirect: 'follow' })).text();
    assert(html.includes('property="og:image"'), `${path}: og:image missing`);
    assert(html.includes('summary_large_image'), `${path}: twitter card missing`);
  }
});

await check('design/mockups stays excluded from deploy', async () => {
  const r = await fetch(`${BASE}/design/mockups/galaxy9.html`);
  assert(r.status === 404, `expected 404, got ${r.status}`);
});

console.log(`\n— API guard contracts —`);

await check('POST /api/emoji-translate with NO Origin → 403', async () => {
  const r = await fetch(`${BASE}/api/emoji-translate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'hi' }),
  });
  assert(r.status === 403, `status ${r.status}`);
});

await check('POST /api/emoji-translate with WRONG Origin → 403', async () => {
  const r = await fetch(`${BASE}/api/emoji-translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com' },
    body: JSON.stringify({ text: 'hi' }),
  });
  assert(r.status === 403, `status ${r.status}`);
});

await check('GET /api/emoji-translate → 405', async () => {
  const r = await fetch(`${BASE}/api/emoji-translate`);
  assert(r.status === 405, `status ${r.status}`);
});

const host = new URL(BASE).host;
await check('POST /api/emoji-translate with valid Origin → real LLM result', async () => {
  const r = await fetch(`${BASE}/api/emoji-translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: `https://${host}` },
    body: JSON.stringify({ text: 'good morning sunshine' }),
  });
  assert(r.status === 200, `status ${r.status}`);
  const data = await r.json();
  assert(Array.isArray(data.results), 'no results array');
  const live = data.results.filter((x) => x.ok && x.emoji);
  assert(live.length >= 1, `no provider returned emoji: ${JSON.stringify(data.results)}`);
  console.log(`     ↳ live providers: ${live.map((x) => `${x.provider}=${x.emoji}`).join('  ')}`);
});

await check('POST /api/feedback with valid Origin + game payload → 204', async () => {
  const r = await fetch(`${BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: `https://${host}` },
    body: JSON.stringify({ cardId: 'e2e', pack: 'e2e', title: 't', line: 'l', model: 'm', emoji: '🎵', vote: 'up' }),
  });
  assert(r.status === 204, `status ${r.status}`);
});

// ─── Layer 2: real browser ───
console.log(`\n— Browser checks (chromium) —`);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });

async function page(viewport) {
  const ctx = await browser.newContext({ viewport });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return { ctx, p, errors };
}

await check('galaxy boots with 5 art styles, intro auto-reveals, zero JS errors', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#app canvas', { timeout: 15000 });
  await p.waitForSelector('#intro.gone', { timeout: 12000 }); // readiness-gated reveal
  const g = await p.evaluate(() => window.__galaxy);
  assert(g && g.styles.cipher === 'clay' && g.styles.translate === 'paper' && g.styles.games === 'voxel'
    && g.styles.forge === 'molten' && g.styles.wall === 'mosaic', `styles: ${JSON.stringify(g?.styles)}`);
  const fallbackShown = await p.evaluate(() => document.getElementById('fallback').classList.contains('on'));
  assert(!fallbackShown, 'WebGL fallback triggered');
  await p.waitForTimeout(800);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-galaxy.png' });
  await ctx.close();
});

await check('galaxy: ⌘K palette opens, filters, Escape closes', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#intro.gone', { timeout: 12000 });
  await p.keyboard.press('Meta+KeyK');
  await p.waitForSelector('#cmdk.on', { timeout: 3000 });
  await p.fill('#ck-in', 'cipher');
  const n = await p.locator('#ck-list .cki').count();
  assert(n === 2, `expected 2 hits for "cipher" (planet + seal-a-letter), got ${n}`);
  await p.keyboard.press('Escape');
  const open = await p.evaluate(() => document.getElementById('cmdk').classList.contains('on'));
  assert(!open, 'palette did not close on Escape');
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('full dive path: galaxy #1 → land → arrives on /world#translate', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/#1`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#panel.on', { timeout: 10000 });
  await p.click('#p-row button:first-child'); // 'land →'
  await p.waitForURL((u) => u.pathname.startsWith('/world'), { timeout: 20000, waitUntil: 'commit' });
  assert(p.url().includes('#translate'), `url: ${p.url()}`);
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await ctx.close();
});

await check('world#translate: avatar walks the planet, zero JS errors', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/world#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  const before = await p.evaluate(() => window.__world.posDir());
  await p.keyboard.down('ArrowUp');
  await p.waitForTimeout(700);
  await p.keyboard.up('ArrowUp');
  const after = await p.evaluate(() => window.__world.posDir());
  const dot = before[0] * after[0] + before[1] * after[1] + before[2] * after[2];
  assert(dot < 0.99999, `avatar did not move (dot=${dot})`);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-world-translate.png' });
  await ctx.close();
});

await check('world#translate kiosk: REAL translation through the walkable world', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/world#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.evaluate(() => window.__world.openTool()); // the header shortcut hides for 20s — the walk has right of way
  await p.waitForSelector('#tool.on', { timeout: 3000 });
  await p.fill('#tt', 'I am so proud of you');
  await p.click('#tgo');
  await p.waitForSelector('#tout .trow, #tout .terr', { timeout: 30000 });
  const rows = await p.locator('#tout .trow:not(.off)').count();
  assert(rows >= 1, 'no live translation row rendered');
  const emoji = await p.locator('#tout .trow:not(.off) span').first().textContent();
  console.log(`     ↳ world kiosk translated to: ${emoji}`);
  await p.keyboard.press('Escape');
  assert(!(await p.evaluate(() => document.getElementById('tool').classList.contains('on'))), 'Escape did not close tool');
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-kiosk.png' });
  await ctx.close();
});

await check('world#games: voxel theme + kiosk CTA enters /game', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/world#games`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  const w = await p.evaluate(() => window.__world);
  assert(w.key === 'games' && w.theme.pixel === true, JSON.stringify(w.theme));
  await p.evaluate(() => window.__world.openTool()); // the header shortcut hides for 20s — the walk has right of way
  await p.waitForSelector('#tool.on', { timeout: 3000 });
  await p.click('#tgo');
  await p.waitForURL((u) => u.pathname.startsWith('/game'), { timeout: 15000, waitUntil: 'commit' });
  await ctx.close();
});

await check('world: unknown hash redirects home; leave returns focused', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/world#cipher`, { waitUntil: 'commit' }).catch(() => {});
  await p.waitForURL((u) => !u.pathname.startsWith('/world'), { timeout: 10000, waitUntil: 'commit' });
  await p.goto(`${BASE}/world#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.click('#leave');
  await p.waitForURL((u) => !u.pathname.startsWith('/world') && u.hash === '#1', { timeout: 10000, waitUntil: 'commit' });
  await ctx.close();
});

await check('legacy deep-link #in:translate redirects to /world#translate', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/#in:translate`, { waitUntil: 'commit' }).catch(() => {});
  await p.waitForURL((u) => u.pathname.startsWith('/world'), { timeout: 10000, waitUntil: 'commit' });
  assert(p.url().includes('#translate'), p.url());
  await ctx.close();
});

await check('cipher: seal → wrong guess holds → right guess decrypts (同频即密钥 live)', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/cipher`, { waitUntil: 'domcontentloaded' });
  await p.fill('#c-q', 'what does 🌙 mean to us?');
  await p.fill('#c-a', 'the last train');
  await p.fill('#c-m', '晚安，开拓者。');
  await p.click('#c-go');
  await p.waitForSelector('#c-out:not(.hidden)', { timeout: 12000 });
  const link = await p.locator('#c-link').textContent();
  const hash = link.slice(link.indexOf('#'));
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/cipher${hash}`, { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#open:not(.hidden)', { timeout: 8000 });
  await p2.fill('#o-a', 'wrong answer');
  await p2.click('#o-go');
  await p2.waitForFunction(() => document.getElementById('o-line').textContent.includes('seal holds'), null, { timeout: 12000 });
  await p2.fill('#o-a', '  The Last TRAIN ');
  await p2.click('#o-go');
  await p2.waitForSelector('#o-opened:not(.hidden)', { timeout: 12000 });
  assert((await p2.locator('#o-msg').textContent()) === '晚安，开拓者。', 'decrypt mismatch');
  await p2.screenshot({ path: 'shot-cipher-open.png' });
  await ctx.close();
});

await check('galaxy: fluent atlas live in prod, pause toggles, cipher counter wired', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/#0`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#panel.on', { timeout: 12000 });
  const g = await p.evaluate(() => window.__galaxy);
  assert(g.fluent === true, 'fluent atlas not active in production');
  assert((await p.locator('#p-row button').first().textContent()).includes('seal a letter'), 'cipher CTA missing');
  await p.click('#gpause');
  assert((await p.locator('#gpause').textContent()) === '▶', 'pause did not toggle');
  await ctx.close();
});

await check('game: daily mode + #daily deep link live', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/game`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body.textContent.includes("Today's line") || document.body.textContent.includes("today's line"), null, { timeout: 12000 });
  await ctx.close();
});

await check('share: encode→decode roundtrip + #s= link prefills a shared translation', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/translate`, { waitUntil: 'domcontentloaded' });
  const enc = await p.evaluate(async () => {
    const obj = { v: 1, t: 'I love you 我爱你 🥹', r: [{ p: 'minimax', e: '❤️🥹' }, { p: 'openai', e: '💖' }] };
    const e = await window.EmojiShare.encode(obj);
    const d = await window.EmojiShare.decode(e);
    if (JSON.stringify(d) !== JSON.stringify(obj)) throw new Error('roundtrip mismatch');
    return e;
  });
  await p.goto('about:blank'); // force a fresh document — a hash-only goto would not reload
  await p.goto(`${BASE}/translate#s=${enc}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('textarea')?.value.length > 0, null, { timeout: 8000 });
  const val = await p.locator('textarea').first().inputValue();
  assert(val.includes('我爱你'), `textarea not prefilled: "${val}"`);
  const banner = await p.getByText('beamed you this').count();
  assert(banner >= 1, 'shared banner missing');
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-share.png' });
  await ctx.close();
});

await check('mobile viewport (390×844): galaxy boots in low-power mode, no errors', async () => {
  const { ctx, p, errors } = await page({ width: 390, height: 844 });
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#app canvas', { timeout: 15000 });
  await p.waitForSelector('#intro.gone', { timeout: 12000 });
  const g = await p.evaluate(() => window.__galaxy);
  assert(g.lowPower === true, 'lowPower heuristic did not engage on phone viewport');
  const fallbackShown = await p.evaluate(() => document.getElementById('fallback').classList.contains('on'));
  assert(!fallbackShown, 'fallback triggered on mobile viewport');
  await p.waitForTimeout(600);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-mobile.png' });
  await ctx.close();
});

await check('mobile: world#translate boots (touch build), no errors', async () => {
  const { ctx, p, errors } = await page({ width: 390, height: 844 });
  await p.goto(`${BASE}/world#translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading.gone', { timeout: 15000 });
  await p.waitForTimeout(600);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-world-mobile.png' });
  await ctx.close();
});

await browser.close();

// ─── summary ───
const fails = results.filter(([s]) => s === 'FAIL');
console.log(`\n══ ${results.length - fails.length}/${results.length} passed ══`);
if (fails.length) { fails.forEach(([, m]) => console.log(`  ✗ ${m}`)); process.exit(1); }
