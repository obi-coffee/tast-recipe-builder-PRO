/**
 * Best-effort in-memory rate limiter for the AI/import API routes.
 *
 * This guards a single warm serverless instance (it won't coordinate across
 * Vercel instances), so it's a speed-bump against accidental loops and casual
 * abuse — not a hard quota. For a small private tester preview that's the right
 * trade-off; swap in Upstash/Redis if this ever goes fully public.
 */
const hits = new Map(); // key -> number[] (timestamps, ms)

export function rateLimit(key, { limit = 15, windowMs = 60000 } = {}) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  // Opportunistic cleanup so the Map doesn't grow unbounded.
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
    }
  }
  return { ok: arr.length <= limit, remaining: Math.max(0, limit - arr.length) };
}

/** Pull a best-guess client IP from the request headers. */
export function clientIp(request) {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
