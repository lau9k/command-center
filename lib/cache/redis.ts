import "server-only";

import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Two-tier cache: L1 in-memory (per-instance) → L2 Upstash Redis (shared).
//
// • L1 keeps hot data in the current serverless instance — zero latency.
// • L2 survives cold starts, deploys, and multi-instance scale-out.
// • If Upstash env vars are missing, L2 is a no-op and we stay in-memory only.
// ---------------------------------------------------------------------------

/* ── L1: per-instance Map ─────────────────────────────────────────────── */

const l1 = new Map<string, { data: unknown; expiresAt: number }>();

function l1Get<T>(key: string): T | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1.delete(key);
    return null;
  }
  return entry.data as T;
}

function l1Set(key: string, data: unknown, ttlMs: number): void {
  l1.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/* ── L2: Upstash Redis (lazy singleton) ───────────────────────────────── */

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

/* ── Public API ────────────────────────────────────────────────────────── */

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PREFIX = "cc:"; // namespace all keys

export interface CacheOptions {
  /** Time-to-live in milliseconds (default 15 min). */
  ttlMs?: number;
  /** If true, skip L2 and only use in-memory (useful for very hot, cheap data). */
  l1Only?: boolean;
}

/**
 * Cache-aside helper: returns cached value or calls `fetcher`, caches the
 * result, and returns it.  Stale-on-error: if the fetcher throws and a
 * stale L2 value exists, returns that instead of throwing.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CacheOptions = {},
): Promise<T> {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const fullKey = `${PREFIX}${key}`;

  // 1) Check L1
  const l1Hit = l1Get<T>(fullKey);
  if (l1Hit !== null) return l1Hit;

  // 2) Check L2
  const r = opts.l1Only ? null : getRedis();
  if (r) {
    try {
      const l2Hit = await r.get<T>(fullKey);
      if (l2Hit !== null && l2Hit !== undefined) {
        l1Set(fullKey, l2Hit, ttlMs); // promote to L1
        return l2Hit;
      }
    } catch {
      // Redis down — continue to fetcher
    }
  }

  // 3) Fetch fresh data
  try {
    const fresh = await fetcher();
    l1Set(fullKey, fresh, ttlMs);

    if (r) {
      const ttlSec = Math.ceil(ttlMs / 1000);
      // Fire-and-forget — don't block response on Redis write
      r.set(fullKey, fresh, { ex: ttlSec }).catch(() => {});
    }

    return fresh;
  } catch (err) {
    // Stale-on-error: try L2 one more time with no TTL check (Redis handles expiry)
    if (r) {
      try {
        const stale = await r.get<T>(fullKey);
        if (stale !== null && stale !== undefined) return stale;
      } catch {
        // Nothing we can do
      }
    }
    throw err;
  }
}

/**
 * Invalidate a cached key from both tiers.
 */
export async function invalidate(key: string): Promise<void> {
  const fullKey = `${PREFIX}${key}`;
  l1.delete(fullKey);

  const r = getRedis();
  if (r) {
    await r.del(fullKey).catch(() => {});
  }
}

/**
 * Check if Redis L2 is available (for health checks / debugging).
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}
