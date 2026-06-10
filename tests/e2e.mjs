// E2E suite for the emojify galaxy cutover.
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

await check('GET / serves the galaxy (title + local importmap)', async () => {
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

await check('GET /vendor/three/three.module.js is served as JS', async () => {
  const r = await fetch(`${BASE}/vendor/three/three.module.js`);
  assert(r.status === 200, `status ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  assert(/javascript/.test(ct), `content-type ${ct}`);
});

await check('GET vendored addons (OrbitControls + UnrealBloomPass)', async () => {
  for (const p of ['controls/OrbitControls.js', 'postprocessing/UnrealBloomPass.js', 'postprocessing/OutputPass.js', 'shaders/OutputShader.js']) {
    const r = await fetch(`${BASE}/vendor/three/addons/${p}`);
    assert(r.status === 200, `${p} → ${r.status}`);
  }
});

await check('GET /assets/sun-grin-3d.png (vendored Fluent sun)', async () => {
  const r = await fetch(`${BASE}/assets/sun-grin-3d.png`);
  assert(r.status === 200, `status ${r.status}`);
  assert((r.headers.get('content-type') || '').includes('image/png'), 'not a png');
});

await check('GET /translate serves the Translation Bureau', async () => {
  const r = await fetch(`${BASE}/translate`, { redirect: 'follow' });
  assert(r.status === 200, `status ${r.status}`);
  const html = await r.text();
  assert(html.includes('Translation Bureau'), 'title missing');
  assert(html.includes('← galaxy') || html.includes('&#8592; galaxy'), 'galaxy backlink missing');
});

await check('GET /game still serves the lyric game', async () => {
  const r = await fetch(`${BASE}/game`, { redirect: 'follow' });
  assert(r.status === 200, `status ${r.status}`);
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

await check('desktop: galaxy boots, intro auto-reveals, zero JS errors', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#app canvas', { timeout: 15000 });
  await p.waitForSelector('#intro.gone', { timeout: 12000 }); // readiness-gated reveal
  const fallbackShown = await p.evaluate(() => document.getElementById('fallback').classList.contains('on'));
  assert(!fallbackShown, 'WebGL fallback triggered');
  await p.waitForTimeout(800);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-galaxy.png' });
  await ctx.close();
});

await check('desktop: ⌘K palette opens, filters, Escape closes', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#intro.gone', { timeout: 12000 });
  await p.keyboard.press('Meta+KeyK');
  await p.waitForSelector('#cmdk.on', { timeout: 3000 });
  await p.fill('#ck-in', 'cipher');
  const n = await p.locator('#ck-list .cki').count();
  assert(n === 1, `expected 1 hit for "cipher", got ${n}`);
  await p.keyboard.press('Escape');
  const open = await p.evaluate(() => document.getElementById('cmdk').classList.contains('on'));
  assert(!open, 'palette did not close on Escape');
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('kiosk: #in:translate runs a REAL translation through the dive card', async () => {
  const { ctx, p, errors } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/#in:translate`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#world.on', { timeout: 15000 });
  await p.fill('#wt', 'I am so proud of you');
  await p.click('#wgo');
  await p.waitForSelector('#wout .wrow, #wout .werr', { timeout: 30000 });
  const rows = await p.locator('#wout .wrow:not(.off)').count();
  assert(rows >= 1, 'no live translation row rendered');
  const emoji = await p.locator('#wout .wrow:not(.off) span').first().textContent();
  console.log(`     ↳ kiosk translated to: ${emoji}`);
  await p.screenshot({ path: 'shot-kiosk.png' });
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
});

await check('kiosk: #in:games lands and auto-enters /game', async () => {
  const { ctx, p } = await page({ width: 1440, height: 900 });
  await p.goto(`${BASE}/#in:games`, { waitUntil: 'domcontentloaded' });
  await p.waitForURL('**/game**', { timeout: 15000 });
  await ctx.close();
});

await check('mobile viewport (390×844): boots without errors', async () => {
  const { ctx, p, errors } = await page({ width: 390, height: 844 });
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#app canvas', { timeout: 15000 });
  await p.waitForSelector('#intro.gone', { timeout: 12000 });
  const fallbackShown = await p.evaluate(() => document.getElementById('fallback').classList.contains('on'));
  assert(!fallbackShown, 'fallback triggered on mobile viewport');
  await p.waitForTimeout(600);
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: 'shot-mobile.png' });
  await ctx.close();
});

await browser.close();

// ─── summary ───
const fails = results.filter(([s]) => s === 'FAIL');
console.log(`\n══ ${results.length - fails.length}/${results.length} passed ══`);
if (fails.length) { fails.forEach(([, m]) => console.log(`  ✗ ${m}`)); process.exit(1); }
