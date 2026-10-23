import { OrdersBoard } from "@/components/admin/orders/OrdersBoard.client";
import { requirePagePermission } from "@/lib/auth/session";
import { getAdminOrders } from "@/modules/orders";

/** Orders (brief B7), from docs/design/Admin.html and Admin-Mobile.html. */
export default async function OrdersPage() {
  const staff = await requirePagePermission("orders.view");
  const data = await getAdminOrders(staff);
  return <OrdersBoard data={data} />;
}
