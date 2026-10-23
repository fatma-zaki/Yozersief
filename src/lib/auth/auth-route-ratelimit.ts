import "server-only";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import { limitForAuthApiPath, normalizeAuthApiPath } from "./auth-route-ratelimit-policy";

export { limitForAuthApiPath, normalizeAuthApiPath } from "./auth-route-ratelimit-policy";

/**
 * Enforces Upstash limits for sensitive Better Auth HTTP paths.
 * Uses `auth.login` (fail closed on Redis errors/timeouts).
 * Identifier prefix `route:` keeps buckets distinct from Server Action limits.
 */
export async function enforceAuthApiRateLimit(request: Request): Promise<void> {
  const path = normalizeAuthApiPath(new URL(request.url).pathname);
  const name = limitForAuthApiPath(path);
  if (!name) return;
  await enforceRateLimit(name, `${clientIp(request.headers)}:route:${path}`);
}
