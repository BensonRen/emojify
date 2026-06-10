// POST /api/emoji-eval
// Scores an emoji translation. ALWAYS judged by the fixed referee MiniMax-Text-01
// (same judge for both providers -> methodological fairness). Single LLM call.

import { guard } from './_guard.js';
import { minimaxChat } from './_minimax.js';

const REFEREE_MODEL = 'MiniMax-Text-01';

const JUDGE_SYSTEM =
  'You are an emoji-translation evaluator. Given an English SOURCE and an EMOJI ' +
  'translation, respond with ONLY a JSON object: {"back_translation":string (what the ' +
  'emoji alone convey), "fidelity":0-100 (does emoji preserve source meaning), ' +
  '"naturalness":0-100 (would a real person text this), "tone":"positive|neutral|negative", ' +
  '"tone_match":true|false}. No other text.';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Robustly pull the first {...} JSON object out of model output (strip fences/prose).
function parseJudgeJson(raw) {
  if (typeof raw !== 'string') throw new Error('judge: empty response');
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  // Find the first balanced {...} block.
  const start = s.indexOf('{');
  if (start === -1) throw new Error('judge: no JSON object found');
  let depth = 0;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error('judge: unbalanced JSON object');
  return JSON.parse(s.slice(start, end + 1));
}

function clampInt(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function normTone(t) {
  const v = String(t || '').toLowerCase().trim();
  if (v === 'positive' || v === 'negative' || v === 'neutral') return v;
  return 'neutral';
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const rejected = guard(req);
  if (rejected) return rejected;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== 'string') {
    return json({ ok: false, error: 'text is required' }, 400);
  }
  const text = body.text.trim();
  if (!text) return json({ ok: false, error: 'text is required' }, 400);
  if (text.length > 500) return json({ ok: false, error: 'text must be <= 500 chars' }, 400);

  const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';
  if (!emoji) return json({ ok: false, error: 'emoji is required' }, 400);

  try {
    const content = await minimaxChat({
      model: REFEREE_MODEL,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM },
        { role: 'user', content: `SOURCE: ${text}\nEMOJI: ${emoji}` },
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    const parsed = parseJudgeJson(content);
    return json({
      ok: true,
      backTranslation: typeof parsed.back_translation === 'string' ? parsed.back_translation : '',
      fidelity: clampInt(parsed.fidelity),
      naturalness: clampInt(parsed.naturalness),
      tone: normTone(parsed.tone),
      toneMatch: parsed.tone_match === true,
    });
  } catch (e) {
    // 502 (upstream judge failed) so monitoring sees it; clients branch on body.ok anyway.
    return json({ ok: false, error: String(e?.message || e) }, 502);
  }
}

// Method guards.
export function GET() {
  return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}
export function PUT() {
  return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}
