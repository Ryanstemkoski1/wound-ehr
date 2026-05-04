// Simple in-memory token-bucket rate limiter
//
// Suitable for single-instance Next.js deployments and local dev. For
// horizontal scaling, swap to Upstash Redis or a similar shared store.
// Map entries are evicted lazily on access; no background sweeper.
//
// Buckets are keyed by an arbitrary string (typically IP + route). The
// bucket holds `limit` tokens and refills at `limit / windowMs` per ms.
//
// ── Scaling to Redis ────────────────────────────────────────────────────────
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, replace the
// `rateLimit` function body with @upstash/ratelimit:
//
//   import { Ratelimit } from "@upstash/ratelimit";
//   import { Redis } from "@upstash/redis";
//   const redis = Redis.fromEnv();
//   const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`) });
//   const { success, remaining, reset } = await rl.limit(key);
//
// The `RateLimitResult` shape is compatible — just set `retryAfterMs = reset - Date.now()`.
// ────────────────────────────────────────────────────────────────────────────

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * Consume one token from the bucket identified by `key`.
 *
 * @param key       Unique identifier (e.g. `"login:1.2.3.4"`)
 * @param limit     Max tokens in the bucket
 * @param windowMs  Refill window in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const refillPerMs = limit / windowMs;
  const bucket = buckets.get(key) ?? { tokens: limit, updatedAt: now };

  // Refill
  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillPerMs);
  bucket.updatedAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: 0,
    };
  }

  buckets.set(key, bucket);
  const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillPerMs);
  return { allowed: false, remaining: 0, retryAfterMs };
}

/**
 * Best-effort client identifier from inbound request headers.
 * Falls back to "anonymous" if no proxy header is set.
 */
export function clientKey(
  headers: Headers,
  scope: string,
  userId?: string | null
): string {
  if (userId) return `${scope}:user:${userId}`;
  const xff = headers.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "anonymous";
  return `${scope}:ip:${ip}`;
}
