import "server-only";

/**
 * A best-effort in-memory sliding-window rate limiter.
 *
 * Deliberately not backed by the database or a shared store: on serverless each
 * instance keeps its own map and cold starts wipe it, so this caps how fast a
 * single instance can be hammered rather than being a global guarantee. That is
 * the right weight for a cheap, unauthenticated endpoint (e.g. the username
 * availability check) — abuse control, never a security lock on its own. Anything
 * that must hold across instances (order caps) is counted in the DB instead.
 */
const buckets = new Map<string, number[]>();

/** Returns true if this hit is allowed; records it when so. */
export function allowRequest(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);

  // Bound the map on a long-lived instance: drop everything on a rare sweep
  // rather than track per-key expiry. Stale keys only cost a little memory until
  // then, and a wiped limiter fails open, which is acceptable here.
  if (buckets.size > 5000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }

  return true;
}
