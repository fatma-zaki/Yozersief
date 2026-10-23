import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { RateLimitedError } from "./errors";
import { logger } from "./logger";
import {
  allowFromRedisResult,
  allowWhenRedisUnavailable,
  isAuthSensitiveLimit,
  LIMITS,
  type LimitName,
} from "./ratelimit-policy";

export type { LimitName } from "./ratelimit-policy";
export { isAuthSensitiveLimit, LIMITS } from "./ratelimit-policy";

/**
 * Named limits (brief A6.8). Windows are per identifier (phone, IP, user…).
 * Production uses Upstash Redis; development falls back to an in-memory window per instance.
 *
 * Failure policy: see `ratelimit-policy.ts` — auth-sensitive (incl. `tracking.lookup`) fail closed
 * on Redis errors/timeouts; public limits (`upload.token`, `order.submit`) fail open for availability.
 */

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = new Map<LimitName, Ratelimit>();

function limiterFor(name: LimitName): Ratelimit | null {
  if (!redis) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const { requests, window } = LIMITS[name];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `yz:rl:${name}`,
      // Keep Upstash's 5s default; we interpret `reason: "timeout"` explicitly below.
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

const memory = new Map<string, number[]>();

function windowMs(window: string): number {
  const [amount = "1", unit] = window.split(" ");
  return Number(amount) * (unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : 1_000);
}

function memoryLimit(name: LimitName, identifier: string): boolean {
  const { requests, window } = LIMITS[name];
  const key = `${name}:${identifier}`;
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs(window));
  if (hits.length >= requests) return false;
  hits.push(now);
  memory.set(key, hits);
  return true;
}

/** Returns true if the request is allowed. */
export async function checkRateLimit(name: LimitName, identifier: string): Promise<boolean> {
  if (env.RATE_LIMIT_DISABLED) return true;
  const limiter = limiterFor(name);
  if (!limiter) return memoryLimit(name, identifier);
  try {
    const result = await limiter.limit(identifier);
    if (result.reason === "timeout") {
      const allow = allowWhenRedisUnavailable(name);
      logger.error("rate limiter timed out", {
        name,
        category: isAuthSensitiveLimit(name) ? "auth_sensitive" : "public",
        decision: allow ? "allow" : "deny",
      });
      return allow;
    }
    return allowFromRedisResult(name, result);
  } catch (error) {
    const allow = allowWhenRedisUnavailable(name);
    logger.error("rate limiter unavailable", {
      name,
      category: isAuthSensitiveLimit(name) ? "auth_sensitive" : "public",
      decision: allow ? "allow" : "deny",
      error,
    });
    return allow;
  }
}

/** Throws RateLimitedError when over the limit (or when auth-sensitive Redis protection fails). */
export async function enforceRateLimit(name: LimitName, identifier: string): Promise<void> {
  if (!(await checkRateLimit(name, identifier))) throw new RateLimitedError(name);
}

/** Best-effort client IP from Vercel / proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
