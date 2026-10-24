import { DeliveryBoard } from "@/components/admin/delivery/DeliveryBoard.client";
import { connection } from "next/server";
import { requirePagePermission } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getDeliveryBoard } from "@/modules/orders";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Delivery & collection (brief B10), from docs/design/Team-Delivery.html. */
export default async function DeliveryPage() {
  const staff = await requirePagePermission("delivery.handover");
  // Queue ages and "today" depend on the clock: render per request (Cache Components).
  await connection();
  return (
    <DeliveryBoard data={await getDeliveryBoard(staff)} canRecord={can(staff, "payments.record")} />
  );
}
