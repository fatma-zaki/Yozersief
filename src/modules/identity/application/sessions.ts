import { logActivity } from "@/modules/audit";
import { withTransaction } from "@/db/tx";
import type { StaffContext } from "@/lib/rbac";
import { deleteOtherSessions, listSessionsForUser } from "../infrastructure/staff-repository";

/** The signed-in member's own devices (brief A6.2). */
export async function listMySessions(actor: StaffContext) {
  const sessions = await listSessionsForUser(actor.id);
  return sessions.map((s) => ({ ...s, isCurrent: s.id === actor.sessionId }));
}

/** "Sign out other devices": ends every session except the current one. */
export async function signOutOtherDevices(actor: StaffContext): Promise<number> {
  return withTransaction(async (tx) => {
    const removed = await deleteOtherSessions(actor.id, actor.sessionId, tx);
    await logActivity(tx, {
      userId: actor.id,
      action: "auth.signed_out_other_devices",
      entityType: "staff_user",
      entityId: actor.id,
      meta: { removed },
    });
    return removed;
  });
}
