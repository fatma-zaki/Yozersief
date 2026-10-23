import "server-only";
import { forbidden, redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { UnauthorizedError } from "@/lib/errors";
import { assertCan, can, type Permission, type StaffContext } from "@/lib/rbac";
import { getSetting } from "@/modules/content";
import { getRoleAccess } from "@/modules/identity";
import { auth } from "./auth";

/**
 * The current staff member, or null. Deduplicated per request with React `cache`.
 * Reads cookies, so callers must sit inside a <Suspense> boundary (Cache Components).
 */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
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
});

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

/** Server actions / route handlers: throws typed errors instead of rendering. */
export async function requireStaff(): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff) throw new UnauthorizedError();
  return staff;
}

/** Server actions / route handlers: session + permission, or a typed 401/403. */
export async function requirePermission(permission: Permission): Promise<StaffContext> {
  const staff = await requireStaff();
  assertCan(staff, permission);
  return staff;
}
