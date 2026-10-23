import { cronRoute } from "@/lib/cron";
import { expireQuotes } from "@/modules/quotes";

/** quotes:expire — daily (vercel.json). */
export const GET = cronRoute("quotes:expire", async () => ({ expired: await expireQuotes() }));
