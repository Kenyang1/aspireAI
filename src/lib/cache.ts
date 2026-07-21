/**
 * cache.ts
 * --------
 * Caching + rate limiting behind one small interface:
 *
 *   - Redis (ioredis) whenever REDIS_URL is set — shared across instances,
 *     which is what docker-compose / production uses.
 *   - An in-process TTL map otherwise, so local dev needs no services and
 *     the call sites behave identically either way.
 *
 * Used for: embedding-vector caching (saves repeat OpenAI embedding calls),
 * career-match response caching, and fixed-window rate limiting on the AI
 * API routes.
 */

import { createHash } from "node:crypto";

interface CacheDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Increment a counter, setting the TTL on first increment. Returns the new count. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

// ----------------------------------------------------------------- memory

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

class MemoryDriver implements CacheDriver {
  private store = new Map<string, MemoryEntry>();

  private prune() {
    if (this.store.size < 1000) return;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.prune();
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async incr(key: string, ttlSeconds: number) {
    const current = await this.get(key);
    const next = (current ? Number(current) : 0) + 1;
    const entry = this.store.get(key);
    this.store.set(key, {
      value: String(next),
      expiresAt: entry && entry.expiresAt > Date.now() ? entry.expiresAt : Date.now() + ttlSeconds * 1000,
    });
    return next;
  }
}

// ------------------------------------------------------------------ redis

class RedisDriver implements CacheDriver {
  private clientPromise: Promise<import("ioredis").Redis> | null = null;

  private getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import("ioredis").then(({ default: Redis }) => {
        const client = new Redis(process.env.REDIS_URL as string, {
          maxRetriesPerRequest: 1,
          lazyConnect: false,
        });
        client.on("error", (err) => console.warn("redis error:", err.message));
        return client;
      });
    }
    return this.clientPromise;
  }

  async get(key: string) {
    const client = await this.getClient();
    return client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    const client = await this.getClient();
    await client.set(key, value, "EX", ttlSeconds);
  }

  async incr(key: string, ttlSeconds: number) {
    const client = await this.getClient();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, ttlSeconds);
    return count;
  }
}

// ------------------------------------------------------------- public API

const globalForCache = globalThis as unknown as {
  __aspireCache?: { driver: CacheDriver; kind: "redis" | "memory" };
};

export function cacheDriver(): "redis" | "memory" {
  return process.env.REDIS_URL ? "redis" : "memory";
}

function getDriver(): CacheDriver {
  const kind = cacheDriver();
  if (!globalForCache.__aspireCache || globalForCache.__aspireCache.kind !== kind) {
    globalForCache.__aspireCache = {
      kind,
      driver: kind === "redis" ? new RedisDriver() : new MemoryDriver(),
    };
  }
  return globalForCache.__aspireCache.driver;
}

/** Stable short key for arbitrary input (used to key embeddings/responses). */
export function cacheKey(namespace: string, input: string): string {
  return `${namespace}:${createHash("sha256").update(input).digest("hex").slice(0, 32)}`;
}

/**
 * Get-or-compute a JSON-serializable value. On any cache error the compute
 * function still runs — a broken cache never breaks a request.
 *
 * `shouldCache` (optional) gates both reads and writes: values that fail the
 * predicate are never stored, and a previously stored value that fails it is
 * ignored and recomputed (e.g. an empty result cached before data existed).
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
  shouldCache?: (value: T) => boolean
): Promise<T> {
  const driver = getDriver();
  try {
    const hit = await driver.get(key);
    if (hit !== null) {
      const parsed = JSON.parse(hit) as T;
      if (!shouldCache || shouldCache(parsed)) return parsed;
    }
  } catch (error) {
    console.warn(`cache read failed for ${key}:`, (error as Error).message);
  }

  const value = await compute();

  if (!shouldCache || shouldCache(value)) {
    try {
      await driver.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      console.warn(`cache write failed for ${key}:`, (error as Error).message);
    }
  }
  return value;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Fixed-window rate limiter. `identifier` is typically the caller's IP plus
 * the route name. Fails open: if the cache backend errors, the request is
 * allowed.
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const driver = getDriver();
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `rl:${identifier}:${window}`;
  try {
    const count = await driver.incr(key, windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.warn("rate limiter unavailable:", (error as Error).message);
    return { allowed: true, remaining: limit };
  }
}

/** Convenience for API routes: identify callers by IP. */
export function requestIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
