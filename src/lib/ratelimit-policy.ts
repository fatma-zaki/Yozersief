/**
 * Rate-limit failure policy (Phase 0 P0 / ADR-0007).
 *
 * Categories:
 * - Auth-sensitive (`auth.login`, `access.request`, `otp.send`, `otp.verify`,
 *   `tracking.lookup`, `delivery.handover` — the 3-digit handover code):
 *   FAIL CLOSED when Redis throws or times out — deny the request rather than silently
 *   disabling protection for credential / tracking verification attempts.
 * - Public / availability-oriented (`upload.token`, `order.submit`, `analytics.collect`):
 *   FAIL OPEN on Redis throw/timeout so a Redis blip does not take down customer-facing
 *   flows. Abuse is still bounded when Redis is healthy.
 *
 * Upstash's default limiter timeout (5s) returns `{ success: true, reason: "timeout" }`
 * without throwing; callers must inspect `reason`, not only catch exceptions.
 */

export const LIMITS = {
  "otp.send": { requests: 3, window: "10 m" },
  "otp.verify": { requests: 10, window: "10 m" },
  "tracking.lookup": { requests: 20, window: "10 m" },
  "order.submit": { requests: 5, window: "1 h" },
  "upload.token": { requests: 60, window: "1 h" },
  "auth.login": { requests: 10, window: "15 m" },
  "access.request": { requests: 10, window: "1 h" },
  "analytics.collect": { requests: 120, window: "10 m" },
  "delivery.handover": { requests: 30, window: "10 m" },
} as const satisfies Record<string, { requests: number; window: `${number} ${"s" | "m" | "h"}` }>;

export type LimitName = keyof typeof LIMITS;

const AUTH_SENSITIVE = new Set<LimitName>([
  "auth.login",
  "access.request",
  "otp.send",
  "otp.verify",
  "tracking.lookup",
  "delivery.handover",
]);

export function isAuthSensitiveLimit(name: LimitName): boolean {
  return AUTH_SENSITIVE.has(name);
}

/** When Redis is configured but unavailable (throw or timeout): allow only non-auth limits. */
export function allowWhenRedisUnavailable(name: LimitName): boolean {
  return !isAuthSensitiveLimit(name);
}

export type RedisLimitResult = { success: boolean; reason?: string };

/**
 * Interprets an Upstash `limit()` result, including silent timeout allows.
 * Returns whether the application should allow the request.
 */
export function allowFromRedisResult(name: LimitName, result: RedisLimitResult): boolean {
  if (result.reason === "timeout") return allowWhenRedisUnavailable(name);
  return result.success;
}
