import { cronRoute } from "@/lib/cron";
import { cleanupTrackingLinks } from "@/modules/tracking";

/** links:cleanup — daily (vercel.json). */
export const GET = cronRoute("links:cleanup", async () => ({
  removed: await cleanupTrackingLinks(),
}));
