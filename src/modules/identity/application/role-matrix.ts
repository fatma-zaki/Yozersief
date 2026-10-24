import { logActivity } from "@/modules/audit";
import { withTransaction } from "@/db/tx";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  assertCan,
  isPermission,
  type Permission,
  type RoleKey,
  type StaffContext,
} from "@/lib/rbac";
import {
  findPermissionId,
  findRoleByKey,
  grantRolePermission,
  listRolePermissionKeys,
  revokeRolePermission,
} from "../infrastructure/staff-repository";

export type TeamRoleKey = Exclude<RoleKey, "admin">;
export type RoleMatrix = Record<TeamRoleKey, Permission[]>;

/** Accounts → «الأدوار والصلاحيات»: what each non-admin role holds right now (brief B9). */
export async function getRoleMatrix(actor: StaffContext): Promise<RoleMatrix> {
  assertCan(actor, "accounts.manage");
  const matrix: RoleMatrix = { desk: [], design: [], prod: [], delivery: [] };
  for (const row of await listRolePermissionKeys()) {
    if (row.roleKey === "admin" || !(row.roleKey in matrix)) continue;
    if (isPermission(row.permissionKey)) matrix[row.roleKey as TeamRoleKey].push(row.permissionKey);
  }
  return matrix;
}

/**
 * Toggle one non-admin cell of the matrix (brief A6.3, B9). Only the admin edits the matrix,
 * so a member granted `accounts.manage` cannot widen their own role. Audited.
 */
export async function setRolePermission(
  actor: StaffContext,
  input: { roleKey: RoleKey; permission: Permission; granted: boolean },
) {
  assertCan(actor, "accounts.manage");
  if (actor.roleKey !== "admin")
    throw new ForbiddenError(undefined, "المدير بس هو اللي يقدر يغيّر صلاحيات الأدوار.");
  if (input.roleKey === "admin")
    throw new ValidationError({}, "المدير عنده كل الصلاحيات دايمًا ومينفعش تتعدّل.");

  const role = await findRoleByKey(input.roleKey);
  if (!role) throw new NotFoundError(`role ${input.roleKey}`);
  const permissionId = await findPermissionId(input.permission);
  if (permissionId === null) throw new NotFoundError(`permission ${input.permission}`);

  await withTransaction(async (tx) => {
    if (input.granted) await grantRolePermission(role.id, permissionId, tx);
    else await revokeRolePermission(role.id, permissionId, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: input.granted ? "accounts.permission_granted" : "accounts.permission_revoked",
      entityType: "role",
      entityId: String(role.id),
      meta: { role: input.roleKey, permission: input.permission },
    });
  });
}
