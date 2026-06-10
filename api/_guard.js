// Shared request guard for /api/* POST endpoints (underscore-prefixed => not a route).
// 1) Same-origin check: Origin (or Referer) host must equal the request Host.
// 2) In-memory rate limit: per-instance best-effort tripwire, NOT a distributed
//    limiter — Fluid Compute reuses instances, but each instance has its own Map.

function json(obj, status, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

// Malformed URL -> null (treated as absent).
function hostOf(value) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

const MAX_KEYS = 5000; // cap Map size to bound memory on long-lived instances
const hits = new Map(); // ip -> { count, windowStart }

export function guard(req, { limit = 10, windowMs = 60000 } = {}) {
  // ── Same-origin check ──
  // Browsers always send Origin on fetch POSTs; absence of both Origin and
  // Referer means a non-browser client (naive curl/scripts) -> reject.
  const originHost = hostOf(req.headers.get('origin')) ?? hostOf(req.headers.get('referer'));
  if (!originHost) return json({ error: 'forbidden' }, 403);
  // Host match automatically allows prod, *.vercel.app previews, and vercel dev.
  if (originHost !== req.headers.get('host')) return json({ error: 'forbidden' }, 403);

  // ── Rate limit (fixed window per IP) ──
  const now = Date.now();
  const ip = clientIp(req);
  let entry = hits.get(ip);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    hits.delete(ip); // refresh insertion order so eviction targets stale keys
    hits.set(ip, entry);
  }
  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
    return json({ error: 'rate limited' }, 429, { 'Retry-After': String(retryAfter) });
  }

  // Oldest-eviction (Map preserves insertion order) to bound memory.
  if (hits.size > MAX_KEYS) {
    for (const key of hits.keys()) {
      if (hits.size <= MAX_KEYS) break;
      hits.delete(key);
    }
  }

  return null; // allowed
}
