import { cronRoute } from "@/lib/cron";
import { createMessagingProvider, dispatchDueMessages } from "@/modules/messaging";

/** messages:dispatch — every minute (vercel.json). */
export const GET = cronRoute("messages:dispatch", async () => ({
  ...(await dispatchDueMessages(createMessagingProvider())),
}));
