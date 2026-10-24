import {
  AccountsBoard,
  type AccountMember,
} from "@/components/admin/accounts/AccountsBoard.client";
import { requirePagePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { ROLES } from "@/lib/rbac";
import { listMembers, listMySessions } from "@/modules/identity";

/**
 * Accounts & permissions (brief A6.2, B9), from docs/design/Admin-Accounts.html. Members,
 * invitations, pausing and the signed-in devices are live; the role matrix, security switches
 * and admin log are the design's demo until their use cases land (brief Phase 5).
 */
export default async function AccountsPage() {
  const staff = await requirePagePermission("accounts.manage");
  const [members, sessions] = await Promise.all([listMembers(staff), listMySessions(staff)]);
  return (
    <AccountsBoard
      members={members.map((m): AccountMember => ({
        id: m.id,
        name: m.name,
        contact: m.phone ?? m.email ?? "",
        roleKey: ROLES.find((r) => r.key === m.roleKey)?.key ?? "desk",
        status: m.status,
        last:
          m.status === "pending"
            ? "لسه ما فعّلش الحساب"
            : m.lastActiveAt
              ? formatDateTime(m.lastActiveAt)
              : "—",
        you: m.id === staff.id,
      }))}
      sessions={sessions.map((s) => ({
        id: s.id,
        name: s.deviceLabel ?? "جهاز",
        when: s.isCurrent
          ? `نشط دلوقتي${s.city ? ` · ${s.city}` : ""}`
          : `آخر دخول ${formatDateTime(s.lastSeenAt)}`,
        current: s.isCurrent,
      }))}
    />
  );
}
