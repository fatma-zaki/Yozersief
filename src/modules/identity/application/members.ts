import { logActivity } from "@/modules/audit";
import { withTransaction } from "@/db/tx";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertCan, type RoleKey, type StaffContext } from "@/lib/rbac";
import { maskPhone } from "@/lib/phone";
import { displayEmail } from "../domain/staff";
import {
  deleteAllSessions,
  findRoleByKey,
  findStaffRole,
  listStaffMembers,
  updateStaffRole,
  updateStaffStatus,
} from "../infrastructure/staff-repository";

/** Accounts page (B10): team members with roles. Staff phones are masked like customers'. */
export async function listMembers(actor: StaffContext) {
  assertCan(actor, "accounts.manage");
  const rows = await listStaffMembers();
  return rows.map((m) => ({
    ...m,
    phone: maskPhone(m.phone),
    email: displayEmail(m.email),
  }));
}

/**
 * Pause or reactivate any member but yourself (brief A6.2). Pausing deletes every session at
 * once, so the member is signed out everywhere; they also cannot sign in again until
 * reactivated. Only an admin can pause another admin.
 */
export async function setMemberStatus(
  actor: StaffContext,
  input: { userId: string; status: "active" | "paused" },
) {
  assertCan(actor, "accounts.manage");
  if (input.userId === actor.id) throw new ValidationError({}, "لا يمكنك إيقاف حسابك.");
  await withTransaction(async (tx) => {
    const target = await findStaffRole(input.userId, tx);
    if (!target) throw new NotFoundError(`staff ${input.userId}`);
    if (target.roleKey === "admin" && actor.roleKey !== "admin")
      throw new ForbiddenError(undefined, "المدير وحده يستطيع إيقاف حساب مدير.");
    await updateStaffStatus(input.userId, input.status, tx);
    if (input.status === "paused") await deleteAllSessions(input.userId, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: input.status === "paused" ? "accounts.paused" : "accounts.reactivated",
      entityType: "staff_user",
      entityId: input.userId,
    });
  });
}

/**
 * Move a member to another role (brief B9). Takes effect on their next request: the session
 * reads `role_id` from the database. Only an admin can promote to, or change, an admin.
 */
export async function setMemberRole(
  actor: StaffContext,
  input: { userId: string; roleKey: RoleKey },
) {
  assertCan(actor, "accounts.manage");
  if (input.userId === actor.id) throw new ValidationError({}, "لا يمكنك تغيير دورك.");
  await withTransaction(async (tx) => {
    const target = await findStaffRole(input.userId, tx);
    if (!target) throw new NotFoundError(`staff ${input.userId}`);
    if (target.roleKey === input.roleKey) return;
    if ((target.roleKey === "admin" || input.roleKey === "admin") && actor.roleKey !== "admin")
      throw new ForbiddenError(undefined, "المدير وحده يستطيع منح دور المدير أو سحبه.");
    const role = await findRoleByKey(input.roleKey, tx);
    if (!role) throw new NotFoundError(`role ${input.roleKey}`);
    await updateStaffRole(input.userId, role.id, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: "accounts.role_changed",
      entityType: "staff_user",
      entityId: input.userId,
      meta: { from: target.roleKey, to: input.roleKey },
    });
  });
}
