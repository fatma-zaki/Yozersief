import { TeamBoard } from "@/components/admin/team/TeamBoard.client";
import { requirePagePermission } from "@/lib/auth/session";

/** Team activity (brief B10), from docs/design/Admin-Team.html. */
export default async function TeamPage() {
  await requirePagePermission("team.activity.view");
  return <TeamBoard />;
}
