import { cronRoute } from "@/lib/cron";
import { cleanupVerificationCodes } from "@/modules/tracking";

/** otp:cleanup — hourly (vercel.json). */
export const GET = cronRoute("otp:cleanup", async () => ({
  removed: await cleanupVerificationCodes(),
}));
