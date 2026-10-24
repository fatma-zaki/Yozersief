import { TeamBoard } from "@/components/admin/team/TeamBoard.client";
import { requirePagePermission } from "@/lib/auth/session";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Team activity (brief B10), from docs/design/Admin-Team.html. */
export default async function TeamPage() {
  await requirePagePermission("team.activity.view");
  return <TeamBoard />;
}
