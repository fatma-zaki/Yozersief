import { ProductsBoard } from "@/components/admin/products/ProductsBoard.client";
import { requirePagePermission } from "@/lib/auth/session";
import { getAdminCatalog } from "@/modules/catalog";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Products & services (brief B4, B10), from docs/design/Admin-Products.html. */
export default async function ProductsPage() {
  const staff = await requirePagePermission("catalog.manage");
  const data = await getAdminCatalog(staff);
  return <ProductsBoard data={data} />;
}
