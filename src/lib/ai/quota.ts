import { createHash, randomUUID } from "node:crypto";

/**
 * Quota and caching for the AI routes.
 *
 * Metering is server-side only — a limit that lives in the client is a
 * suggestion, not a limit. The limiter is a sliding window over an injected
 * clock so it can be tested exactly, and the cache is an interface: in a single
 * process it is a Map, and the same interface is what an Upstash Redis adapter
 * implements once the app runs on more than one instance.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSec: number;
};

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
    private readonly maxKeys = 5000,
  ) {}

  check(key: string): RateLimitResult {
    const now = this.now();
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);

    const allowed = recent.length < this.limit;
    if (allowed) recent.push(now);

    // Bound memory: the oldest key is dropped rather than letting the map grow.
    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    this.hits.set(key, recent);

    const oldest = recent[0] ?? now;
    const resetAt = oldest + this.windowMs;
    return {
      allowed,
      remaining: Math.max(0, this.limit - recent.length),
      limit: this.limit,
      resetAt,
      retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  reset(): void {
    this.hits.clear();
  }
}

export type CacheEntry<T> = { value: T; expiresAt: number; storedAt: number };

export type ResponseCache<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  size(): number;
};

export function createResponseCache<T>(ttlMs = 30 * 60 * 1000, maxEntries = 200): ResponseCache<T> {
  const store = new Map<string, CacheEntry<T>>();
  const now = () => Date.now();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt < now()) {
        store.delete(key);
        return undefined;
      }
      // Refresh recency for a crude LRU eviction.
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    set(key, value, ttl = ttlMs) {
      store.set(key, { value, expiresAt: now() + ttl, storedAt: now() });
      while (store.size > maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest === undefined) break;
        store.delete(oldest);
      }
    },
    size() {
      return store.size;
    },
  };
}

/** Stable cache key: same transcript + same prompt version ⇒ same answer. */
export function cacheKeyFor(input: unknown, discriminator: string): string {
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
  return `${discriminator}:${hash}`;
}

/** Client identity for quota: never the raw IP, and never sent anywhere else. */
export function identityFromHeaders(headers: Headers, salt = process.env.AI_QUOTA_SALT ?? "dz"): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

export function newRequestId(): string {
  return randomUUID();
}

/** Per-plan AI budgets. Enforced here, mirrored as copy in the billing screen. */
export const AI_LIMITS = {
  analyzePerHour: 30,
  analyzePerDay: 200,
  transcribeMinutesPerDay: 60,
  maxInlineAudioBytes: 50 * 1024 * 1024,
} as const;

export const analyzeLimiter = new SlidingWindowLimiter(AI_LIMITS.analyzePerHour, 60 * 60 * 1000);
export const transcribeLimiter = new SlidingWindowLimiter(30, 60 * 60 * 1000);
