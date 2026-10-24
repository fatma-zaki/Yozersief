import { TrafficBoard } from "@/components/admin/traffic/TrafficBoard.client";
import { requirePagePermission } from "@/lib/auth/session";

/**
 * Traffic (brief B12), from docs/design/Admin-Traffic.html and Admin-Traffic-Mobile.html.
 * Demo figures with the design's notice until the AnalyticsReader is connected (B13 #7).
 */
export default async function TrafficPage() {
  await requirePagePermission("traffic.view");
  return <TrafficBoard />;
}
