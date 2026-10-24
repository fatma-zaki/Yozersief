import { can, type StaffContext } from "@/lib/rbac";
import { countWorkspaceOrders } from "../infrastructure/workspace-repository";

/** Sidebar badges on the team workspaces (docs/design/Team-*.html), for the ones the staff sees. */
export async function countWorkspaceBadges(actor: StaffContext) {
  const show = {
    "/dashboard/design": can(actor, "mockups.manage"),
    "/dashboard/production": can(actor, "production.update"),
    "/dashboard/delivery": can(actor, "delivery.handover"),
  };
  if (!Object.values(show).some(Boolean)) return {};
  const n = await countWorkspaceOrders();
  return {
    ...(show["/dashboard/design"] ? { "/dashboard/design": n.design } : {}),
    ...(show["/dashboard/production"] ? { "/dashboard/production": n.production } : {}),
    ...(show["/dashboard/delivery"] ? { "/dashboard/delivery": n.delivery } : {}),
  };
}
