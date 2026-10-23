import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { RateLimitedError } from "./errors";
import { logger } from "./logger";

/**
 * Named limits (brief A6.8). Windows are per identifier (phone, IP, user…).
 * Production uses Upstash Redis; development falls back to an in-memory window per instance.
 */
const LIMITS = {
  "otp.send": { requests: 3, window: "10 m" },
  "otp.verify": { requests: 10, window: "10 m" },
  "tracking.lookup": { requests: 20, window: "10 m" },
  "order.submit": { requests: 5, window: "1 h" },
  "upload.token": { requests: 60, window: "1 h" },
  "auth.login": { requests: 10, window: "15 m" },
  "access.request": { requests: 10, window: "1 h" },
} as const satisfies Record<string, { requests: number; window: `${number} ${"s" | "m" | "h"}` }>;

export type LimitName = keyof typeof LIMITS;

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
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (error) {
    // Fail open on a Redis outage rather than locking every customer out; it is logged.
    logger.error("rate limiter unavailable", { name, error });
    return true;
  }
}

/** Throws RateLimitedError when over the limit. */
export async function enforceRateLimit(name: LimitName, identifier: string): Promise<void> {
  if (!(await checkRateLimit(name, identifier))) throw new RateLimitedError(name);
}

/** Best-effort client IP from Vercel / proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
