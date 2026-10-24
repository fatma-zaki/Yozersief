import { TeamBoard } from "@/components/admin/team/TeamBoard.client";
import { connection } from "next/server";
import { requirePagePermission } from "@/lib/auth/session";
import { getTeamActivityFeed } from "@/modules/audit";

// Session-bound data: load it on click, not ahead of time (see dashboard/loading.tsx).
export const prefetch = "force-disabled";

/** Team activity (brief B10), from docs/design/Admin-Team.html. */
export default async function TeamPage() {
  const staff = await requirePagePermission("team.activity.view");
  // Feed windows (today / 7 days / 30 days) depend on the clock: render per request.
  await connection();
  const feed = await getTeamActivityFeed(staff);
  return <TeamBoard feed={feed} />;
}
