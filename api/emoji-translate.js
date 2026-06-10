// POST /api/emoji-translate
// Translates English text -> emoji using MiniMax and OpenAI concurrently.
// Per-provider failure is isolated: one provider failing never 500s the request.

import { guard } from './_guard.js';
import { minimaxChat } from './_minimax.js';

const MINIMAX_MODEL = 'MiniMax-Text-01';
const OPENAI_MODEL = 'gpt-4o-mini';

const TRANSLATE_SYSTEM =
  'You are an emoji translator. Output ONLY a short sequence of emoji (1-8) that ' +
  'captures the meaning and tone. No words, no punctuation, no explanation.';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function openaiChat({ messages, max_tokens, temperature }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, max_tokens, temperature }),
  });

  if (!res.ok) {
    let detail = `OpenAI HTTP ${res.status}`;
    const err = await res.json().catch(() => null);
    if (err?.error?.message) detail = err.error.message;
    throw new Error(detail);
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('OpenAI: no message content');
  return content;
}

async function translateMiniMax(text) {
  const t0 = Date.now();
  try {
    const content = await minimaxChat({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM },
        { role: 'user', content: text },
      ],
      max_tokens: 32,
      temperature: 0.7,
    });
    return {
      provider: 'minimax',
      model: MINIMAX_MODEL,
      emoji: content.trim(),
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    return { provider: 'minimax', ok: false, error: String(e?.message || e) };
  }
}

async function translateOpenAI(text) {
  const t0 = Date.now();
  try {
    const content = await openaiChat({
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM },
        { role: 'user', content: text },
      ],
      max_tokens: 32,
      temperature: 0.7,
    });
    return {
      provider: 'openai',
      model: OPENAI_MODEL,
      emoji: content.trim(),
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    return { provider: 'openai', ok: false, error: String(e?.message || e) };
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const rejected = guard(req);
  if (rejected) return rejected;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== 'string') {
    return json({ error: 'text is required' }, 400);
  }
  const text = body.text.trim();
  if (!text) return json({ error: 'text is required' }, 400);
  if (text.length > 500) return json({ error: 'text must be <= 500 chars' }, 400);

  // Which providers to run (default: both).
  let providers = ['minimax', 'openai'];
  if (Array.isArray(body.providers) && body.providers.length) {
    providers = body.providers.filter((p) => p === 'minimax' || p === 'openai');
    if (!providers.length) providers = ['minimax', 'openai'];
  }

  const tasks = providers.map((p) =>
    p === 'minimax' ? translateMiniMax(text) : translateOpenAI(text)
  );

  // Promise.all but each task already swallows its own errors -> never rejects.
  const results = await Promise.all(tasks);
  return json({ results });
}

// Method guard for everything else.
export function GET() {
  return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}
export function PUT() {
  return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}
