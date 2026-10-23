import { assertCan, type StaffContext } from "@/lib/rbac";
import { maskPhone } from "@/lib/phone";
import { displayEmail } from "../domain/staff";
import { listStaffMembers } from "../infrastructure/staff-repository";

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
