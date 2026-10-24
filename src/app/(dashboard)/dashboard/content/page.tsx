import { ContentBoard } from "@/components/admin/content/ContentBoard.client";
import { requirePagePermission } from "@/lib/auth/session";

/** Contact & content (brief B8, B11), from docs/design/Admin-Content.html. */
export default async function ContentPage() {
  await requirePagePermission("content.manage");
  return <ContentBoard />;
}
