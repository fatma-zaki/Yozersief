import { TrafficBoard } from "@/components/admin/traffic/TrafficBoard.client";
import { requirePagePermission } from "@/lib/auth/session";
import { getTrafficReport } from "@/modules/content";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/**
 * Traffic (brief B12), from docs/design/Admin-Traffic.html and Admin-Traffic-Mobile.html.
 * Real figures from first-party page views (ADR-0008).
 */
export default async function TrafficPage() {
  const staff = await requirePagePermission("traffic.view");
  const data = await getTrafficReport(staff);
  return <TrafficBoard data={data} />;
}
