import { cacheLife, cacheTag, updateTag } from "next/cache";
import { isPermission, type Permission, type RoleKey } from "@/lib/rbac";
import { findRoleWithPermissions } from "../infrastructure/staff-repository";

export const RBAC_CACHE_TAG = "rbac";

export type RoleAccess = { roleKey: RoleKey; roleNameAr: string; permissions: Permission[] };

/**
 * Permission set per role, cached across requests and instances (brief A6.3: short TTL,
 * invalidated when the matrix changes via `invalidateRoleAccess`).
 */
export async function getRoleAccess(roleId: number): Promise<RoleAccess | null> {
  "use cache";
  cacheTag(RBAC_CACHE_TAG, `rbac:role:${roleId}`);
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });

  const role = await findRoleWithPermissions(roleId);
  if (!role) return null;
  return {
    roleKey: role.key as RoleKey,
    roleNameAr: role.nameAr,
    permissions: role.permissionKeys.filter(isPermission),
  };
}

/** Call from the server action that edits the role matrix. */
export function invalidateRoleAccess(): void {
  updateTag(RBAC_CACHE_TAG);
}
