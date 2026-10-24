import "server-only";
import { getSessionCookie } from "better-auth/cookies";
import { forbidden, redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { assertCan, can, type Permission, type StaffContext } from "@/lib/rbac";
import { getSetting } from "@/modules/content";
import { getRoleAccess } from "@/modules/identity";
import { auth } from "./auth";
import { assertTwoFactorEnrollment, resolveStaffForAction } from "./session-guards";

/**
 * The current staff member, or null. Deduplicated per request with React `cache`.
 * Reads cookies, so callers must sit inside a <Suspense> boundary (Cache Components).
 *
 * Returns null when there is no session, the account is not active, or role access is missing.
 * An incomplete login 2FA challenge never yields a session from Better Auth, so it is null here.
 */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const requestHeaders = await headers();
  const token = getSessionCookie(requestHeaders, { cookiePrefix: "yz" });
  if (!token) return null;
  const hit = recentSessions.get(token);
  if (hit && hit.expires > Date.now()) return hit.staff;

  // Store the promise, so requests arriving together share one lookup.
  const staff = loadStaffContext(requestHeaders);
  if (recentSessions.size >= RECENT_SESSIONS_MAX) recentSessions.clear();
  recentSessions.set(token, { staff, expires: Date.now() + RECENT_SESSION_TTL_MS });
  staff.catch(() => recentSessions.delete(token));
  return staff;
});

/**
 * Every dashboard request needs the session, and Better Auth reads it with two queries in a
 * row. Remembering the answer for a few seconds per server instance makes tab switches skip
 * that round trip. Sign-out, pausing a member, revoking devices and 2FA changes call
 * `forgetRecentSessions()`; on other instances the change applies within the TTL.
 */
const RECENT_SESSION_TTL_MS = 30_000;
const RECENT_SESSIONS_MAX = 500;
const recentSessions = new Map<string, { staff: Promise<StaffContext | null>; expires: number }>();

export function forgetRecentSessions(): void {
  recentSessions.clear();
}

async function loadStaffContext(requestHeaders: Headers): Promise<StaffContext | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const user = session.user as typeof session.user & {
    roleId: number;
    status: string;
    twoFactorEnabled?: boolean | null;
  };
  if (user.status !== "active") return null;

  const access = await getRoleAccess(user.roleId);
  if (!access) return null;
  return {
    id: user.id,
    name: user.name,
    roleKey: access.roleKey,
    sessionId: session.session.id,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    permissions: new Set(access.permissions),
  };
}

/** Pages: redirect to login when signed out. */
export async function requireStaffPage(): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff) redirect("/login");
  return staff;
}

/**
 * Pages: session + permission. Missing permission renders forbidden.tsx ("request access").
 * When 2FA is enforced globally (`security.two_factor`), members without it are sent to set it up.
 */
export async function requirePagePermission(
  permission: Permission | null,
  options: { allowWithoutTwoFactor?: boolean } = {},
) {
  const staff = await requireStaffPage();
  if (!options.allowWithoutTwoFactor && !staff.twoFactorEnabled) {
    const { enforced } = await getSetting("security.two_factor");
    if (enforced) redirect("/dashboard/security?setup=2fa");
  }
  if (permission && !can(staff, permission)) forbidden();
  return staff;
}

/**
 * Server actions / route handlers: active session + global 2FA enrollment when enforced.
 * Throws UnauthorizedError / TwoFactorRequiredError (never redirects).
 */
export async function requireStaff(): Promise<StaffContext> {
  return resolveStaffForAction(await getStaffContext(), "protected");
}

/**
 * Session only — exclusively for enable/confirm 2FA enrollment while setup is incomplete.
 * Do not use for ordinary protected actions.
 */
export async function requireStaffEnrollingTwoFactor(): Promise<StaffContext> {
  return resolveStaffForAction(await getStaffContext(), "two_factor_setup");
}

/** Server actions / route handlers: session + 2FA (when enforced) + permission, or typed 401/403. */
export async function requirePermission(permission: Permission): Promise<StaffContext> {
  const staff = await requireStaff();
  assertCan(staff, permission);
  return staff;
}

export { assertTwoFactorEnrollment };
