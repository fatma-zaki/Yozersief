import { logActivity } from "@/modules/audit";
import { withTransaction } from "@/db/tx";
import { NotFoundError } from "@/lib/errors";
import { can, type Permission, type StaffContext } from "@/lib/rbac";
import { ok, type Result } from "@/lib/result";
import {
  findPendingPermissionRequest,
  findPermissionId,
  insertPermissionRequest,
} from "../infrastructure/staff-repository";

/**
 * From the forbidden page: "request access" (brief A6.3). Any active staff member may ask;
 * a second request for the same permission while one is pending is a no-op.
 */
export async function requestAccess(
  actor: StaffContext,
  permission: Permission,
): Promise<Result<{ status: "requested" | "already_pending" | "already_granted" }>> {
  if (can(actor, permission)) return ok({ status: "already_granted" });

  const permissionId = await findPermissionId(permission);
  if (!permissionId) throw new NotFoundError(`permission ${permission}`);

  if (await findPendingPermissionRequest(actor.id, permissionId)) {
    return ok({ status: "already_pending" });
  }

  await withTransaction(async (tx) => {
    const request = await insertPermissionRequest(actor.id, permissionId, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: "permissions.requested",
      entityType: "permission_request",
      entityId: request.id,
      meta: { permission },
    });
  });
  return ok({ status: "requested" });
}
