import { cronRoute } from "@/lib/cron";
import { cleanupExpiredUploadDrafts } from "@/modules/orders";

/** upload-drafts:cleanup — daily; removes expired anonymous draft uploads (Phase 1). */
export const GET = cronRoute("upload-drafts:cleanup", async () => cleanupExpiredUploadDrafts());
