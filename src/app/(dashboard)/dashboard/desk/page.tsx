import { DeskBoard } from "@/components/admin/desk/DeskBoard.client";
import { connection } from "next/server";
import { requirePagePermission } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getDeskQueue } from "@/modules/orders";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Desk workspace (brief B10), from docs/design/Team-Desk.html. */
export default async function DeskPage() {
  const staff = await requirePagePermission("quotes.draft");
  // Queue ages and "today" depend on the clock: render per request (Cache Components).
  await connection();
  const data = await getDeskQueue(staff);
  return (
    <DeskBoard
      data={data}
      canPhone={can(staff, "customers.view_phone") && can(staff, "messages.send")}
    />
  );
}
