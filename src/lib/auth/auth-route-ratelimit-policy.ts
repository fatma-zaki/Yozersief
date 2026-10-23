import type { LimitName } from "@/lib/ratelimit-policy";

/**
 * Maps Better Auth HTTP paths (under `/api/auth`) to our named limits.
 *
 * Only credential / challenge / password-reset endpoints are limited.
 * Session reads and other non-sensitive paths return null.
 */

const AUTH_BASE = "/api/auth";

const AUTH_LOGIN_EXACT = new Set([
  "/sign-in/email",
  "/sign-in/phone-number",
  "/sign-in/social",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/verify-otp",
  "/two-factor/send-otp",
  "/request-password-reset",
  "/reset-password",
  "/verify-password",
  "/phone-number/send-otp",
  "/phone-number/verify",
  "/phone-number/request-password-reset",
  "/phone-number/reset-password",
]);

const AUTH_LOGIN_PREFIXES = ["/reset-password/"];

/** Strips `/api/auth` and query/hash; returns a path starting with `/`. */
export function normalizeAuthApiPath(pathname: string): string {
  let path = pathname.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/")) path = `/${path}`;
  if (path === AUTH_BASE || path.startsWith(`${AUTH_BASE}/`)) {
    path = path.slice(AUTH_BASE.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

/** Relative Better Auth path → limit name, or null if exempt. */
export function limitForAuthApiPath(pathname: string): LimitName | null {
  const path = normalizeAuthApiPath(pathname);
  if (AUTH_LOGIN_EXACT.has(path)) return "auth.login";
  if (AUTH_LOGIN_PREFIXES.some((p) => path.startsWith(p))) return "auth.login";
  return null;
}
