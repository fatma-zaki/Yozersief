import { OrdersBoard } from "@/components/admin/orders/OrdersBoard.client";
import { requirePagePermission } from "@/lib/auth/session";
import { getAdminOrders } from "@/modules/orders";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Orders (brief B7), from docs/design/Admin.html and Admin-Mobile.html. */
export default async function OrdersPage() {
  const staff = await requirePagePermission("orders.view");
  const data = await getAdminOrders(staff);
  return <OrdersBoard data={data} />;
}
