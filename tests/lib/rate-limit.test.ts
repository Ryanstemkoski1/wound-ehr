import { beforeEach, describe, expect, it, vi } from "vitest";

type RateLimitModule = typeof import("@/lib/rate-limit");

let rateLimit: RateLimitModule["rateLimit"];
let clientKey: RateLimitModule["clientKey"];

const T0 = new Date("2026-03-02T10:00:00.000Z");
const LIMIT = 3;
const WINDOW_MS = 60_000;
// One token refills every WINDOW_MS / LIMIT ms.
const REFILL_MS = WINDOW_MS / LIMIT;

beforeEach(async () => {
  // The limiter keeps its buckets in module state; load a fresh copy so
  // tests cannot leak tokens into each other.
  vi.resetModules();
  ({ rateLimit, clientKey } = await import("@/lib/rate-limit"));
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

function hit(key = "login:ip:10.0.0.1") {
  return rateLimit(key, LIMIT, WINDOW_MS);
}

function exhaust(key?: string) {
  for (let i = 0; i < LIMIT; i++) hit(key);
}

describe("rateLimit", () => {
  it("allows a burst of up to `limit` requests, counting down remaining", () => {
    expect([hit(), hit(), hit()]).toEqual([
      { allowed: true, remaining: 2, retryAfterMs: 0 },
      { allowed: true, remaining: 1, retryAfterMs: 0 },
      { allowed: true, remaining: 0, retryAfterMs: 0 },
    ]);
  });

  it("denies the request after the bucket is empty and says when to retry", () => {
    exhaust();
    expect(hit()).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: REFILL_MS,
    });
  });

  it("does not extend the lockout when denied requests keep arriving", () => {
    exhaust();
    expect(hit().retryAfterMs).toBe(REFILL_MS);
    expect(hit().retryAfterMs).toBe(REFILL_MS);
    expect(hit().retryAfterMs).toBe(REFILL_MS);

    vi.advanceTimersByTime(REFILL_MS);
    expect(hit().allowed).toBe(true);
  });

  it("is still denied 1 ms before the retry time and allowed exactly at it", () => {
    exhaust();
    const { retryAfterMs } = hit();

    vi.advanceTimersByTime(retryAfterMs - 1);
    expect(hit()).toMatchObject({ allowed: false, retryAfterMs: 1 });

    vi.advanceTimersByTime(1);
    expect(hit()).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
  });

  it("refills one token per window/limit, not the whole bucket at once", () => {
    exhaust();
    vi.advanceTimersByTime(REFILL_MS);

    expect(hit().allowed).toBe(true);
    expect(hit()).toMatchObject({ allowed: false, retryAfterMs: REFILL_MS });
  });

  it("reports whole tokens only when the bucket is partially refilled", () => {
    exhaust();
    // 1.5 tokens accumulate; one is spent, leaving half a token.
    vi.advanceTimersByTime(REFILL_MS * 1.5);

    expect(hit()).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
    expect(hit()).toMatchObject({
      allowed: false,
      retryAfterMs: REFILL_MS / 2,
    });
  });

  it("restores the full limit after a whole window of inactivity", () => {
    exhaust();
    vi.advanceTimersByTime(WINDOW_MS);

    expect(hit().remaining).toBe(LIMIT - 1);
    hit();
    hit();
    expect(hit().allowed).toBe(false);
  });

  it("never accumulates more than `limit` tokens during long idle periods", () => {
    hit();
    vi.advanceTimersByTime(WINDOW_MS * 10);

    const results = Array.from({ length: LIMIT + 1 }, () => hit().allowed);
    expect(results).toEqual([true, true, true, false]);
  });

  it("keeps separate buckets per key", () => {
    exhaust("login:ip:10.0.0.1");

    expect(hit("login:ip:10.0.0.1").allowed).toBe(false);
    expect(hit("login:ip:10.0.0.2")).toEqual({
      allowed: true,
      remaining: LIMIT - 1,
      retryAfterMs: 0,
    });
  });

  it("with a limit of 1 allows a single request per window", () => {
    const key = "invite-user:user:u1";
    expect(rateLimit(key, 1, WINDOW_MS)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: 0,
    });
    expect(rateLimit(key, 1, WINDOW_MS)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: WINDOW_MS,
    });
  });

  it("enforces the login policy of 10 attempts per 15 minutes", () => {
    const key = "login:ip:192.0.2.7";
    const window = 15 * 60_000;
    const results = Array.from({ length: 11 }, () =>
      rateLimit(key, 10, window)
    );

    expect(results.slice(0, 10).every((r) => r.allowed)).toBe(true);
    // One attempt refills every 90 seconds.
    expect(results[10]).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 90_000,
    });
  });
});

describe("clientKey", () => {
  it("keys signed-in users by user id, ignoring proxy headers", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9" });
    expect(clientKey(headers, "create-visit", "user-123")).toBe(
      "create-visit:user:user-123"
    );
  });

  it("falls back to the client IP when the user id is null or empty", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.4" });
    expect(clientKey(headers, "login", null)).toBe("login:ip:198.51.100.4");
    expect(clientKey(headers, "login", "")).toBe("login:ip:198.51.100.4");
  });

  it("uses the first (client) address in x-forwarded-for, trimmed", () => {
    const headers = new Headers({
      "x-forwarded-for": "  203.0.113.9 , 10.0.0.1, 10.0.0.2",
      "x-real-ip": "10.0.0.1",
    });
    expect(clientKey(headers, "login")).toBe("login:ip:203.0.113.9");
  });

  it("falls back to x-real-ip, then cf-connecting-ip, without x-forwarded-for", () => {
    const both = new Headers({
      "x-real-ip": "198.51.100.4",
      "cf-connecting-ip": "192.0.2.1",
    });
    expect(clientKey(both, "login")).toBe("login:ip:198.51.100.4");

    const cfOnly = new Headers({ "cf-connecting-ip": "192.0.2.1" });
    expect(clientKey(cfOnly, "login")).toBe("login:ip:192.0.2.1");
  });

  it("skips an x-forwarded-for whose first entry is blank", () => {
    const headers = new Headers({
      "x-forwarded-for": " , 10.0.0.1",
      "x-real-ip": "198.51.100.4",
    });
    expect(clientKey(headers, "login")).toBe("login:ip:198.51.100.4");
  });

  it("groups requests without any address header under 'anonymous'", () => {
    expect(clientKey(new Headers(), "login")).toBe("login:ip:anonymous");
  });
});
