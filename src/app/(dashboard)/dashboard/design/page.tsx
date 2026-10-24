import { DesignBoard } from "@/components/admin/design/DesignBoard.client";
import { connection } from "next/server";
import { requirePagePermission } from "@/lib/auth/session";
import { getDesignQueue } from "@/modules/orders";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Design workspace (brief B10), from docs/design/Team-Design.html. */
export default async function DesignPage() {
  const staff = await requirePagePermission("mockups.manage");
  // Queue ages and "today" depend on the clock: render per request (Cache Components).
  await connection();
  return <DesignBoard data={await getDesignQueue(staff)} />;
}
