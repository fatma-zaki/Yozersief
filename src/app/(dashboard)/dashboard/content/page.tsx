import { ContentBoard } from "@/components/admin/content/ContentBoard.client";
import { requirePagePermission } from "@/lib/auth/session";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Contact & content (brief B8, B11), from docs/design/Admin-Content.html. */
export default async function ContentPage() {
  await requirePagePermission("content.manage");
  return <ContentBoard />;
}
