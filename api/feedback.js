// POST /api/feedback
// Receives fire-and-forget thumbs votes from the game:
//   { cardId, pack, title, line, model, emoji, vote: 'up'|'down' }
// NO storage for now — R2 may add Vercel KV; this endpoint exists so the game's
// votes stop 404ing and the contract is locked.

import { guard } from './_guard.js';

const MAX_FIELD_LEN = 500;
const STRING_FIELDS = ['cardId', 'pack', 'title', 'line', 'model', 'emoji'];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const rejected = guard(req, { limit: 30 });
  if (rejected) return rejected;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'body must be a JSON object' }, 400);
  }
  if (body.vote !== 'up' && body.vote !== 'down') {
    return json({ error: "vote must be 'up' or 'down'" }, 400);
  }
  for (const field of STRING_FIELDS) {
    const v = body[field];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string' || v.length > MAX_FIELD_LEN) {
      return json({ error: `${field} must be a string <= ${MAX_FIELD_LEN} chars` }, 400);
    }
  }

  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
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
