// Shared MiniMax chat client (underscore prefix = not exposed as a route).
// Single source of truth for the endpoint, auth, and the RPM (status_code 1002)
// exponential-backoff retry used by both emoji-translate and emoji-eval.

const MINIMAX_HOST = 'https://api.minimax.io';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function minimaxChat({ model, messages, max_tokens, temperature }) {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error('MINIMAX_API_KEY not set');

  const backoffs = [500, 1500, 3500]; // 3 tries total (initial + 2 retries effectively => loop over delays)
  let lastErr;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (attempt > 0) await sleep(backoffs[attempt - 1]);

    const res = await fetch(`${MINIMAX_HOST}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens, temperature }),
    });

    if (!res.ok) {
      lastErr = new Error(`MiniMax HTTP ${res.status}`);
      // Network/HTTP-level error: retry on 429/5xx, otherwise fail fast.
      if (res.status === 429 || res.status >= 500) continue;
      throw lastErr;
    }

    const data = await res.json().catch(() => null);
    if (!data) throw new Error('MiniMax: invalid JSON response');

    const status_code = data?.base_resp?.status_code;
    if (status_code === 1002) {
      // RPM rate limit -> retry with backoff.
      lastErr = new Error(data?.base_resp?.status_msg || 'MiniMax rate limited (1002)');
      continue;
    }
    if (status_code !== undefined && status_code !== 0) {
      throw new Error(data?.base_resp?.status_msg || `MiniMax error status_code ${status_code}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('MiniMax: no message content');
    return content;
  }
  throw lastErr || new Error('MiniMax: exhausted retries');
}
