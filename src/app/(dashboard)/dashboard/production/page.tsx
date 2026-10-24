import { ProductionBoard } from "@/components/admin/production/ProductionBoard.client";
import { connection } from "next/server";
import { requirePagePermission } from "@/lib/auth/session";
import { getProductionBoard } from "@/modules/orders";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Production board (brief B10), from docs/design/Team-Production.html. */
export default async function ProductionPage() {
  const staff = await requirePagePermission("production.update");
  // Queue ages and "today" depend on the clock: render per request (Cache Components).
  await connection();
  return <ProductionBoard data={await getProductionBoard(staff)} />;
}
