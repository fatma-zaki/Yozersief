import { cairoDateString } from "@/lib/format";
import { ValidationError } from "@/lib/errors";
import { assertCan, type StaffContext } from "@/lib/rbac";
import {
  actionsForCategory,
  activityRangeWindow,
  ACTIVITY_FEED_LIMIT,
  ACTIVITY_RANGES,
  assertBoundedWindow,
  categoryForAction,
  type ActivityCategory,
  type ActivityRange,
} from "../domain/activity-feed";
import { labelForAction } from "../domain/activity-labels";
import { listActivityLogs } from "../infrastructure/activity-repository";
import { listTeamActivitySchema, type ListTeamActivityInput } from "../schemas";

export type TeamActivityItem = {
  id: number;
  createdAt: string;
  action: string;
  label: string;
  actorId: string | null;
  actorName: string | null;
  orderRef: string | null;
  isSensitive: boolean;
  category: ActivityCategory | null;
};

export type TeamActivityFeed = {
  periods: Record<ActivityRange, TeamActivityItem[]>;
};

/** Midnight in Cairo on the calendar day of `at` (same approach as delivery workspace). */
function cairoDayStart(at: Date): Date {
  const day = cairoDateString(at);
  for (const offset of ["+03:00", "+02:00"] as const) {
    const t = new Date(`${day}T00:00:00${offset}`);
    if (cairoDateString(t) === day) return t;
  }
  return new Date(at.getTime() - 24 * 3_600_000);
}

function toItem(row: Awaited<ReturnType<typeof listActivityLogs>>[number]): TeamActivityItem {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    action: row.action,
    label: labelForAction(row.action),
    actorId: row.actorId,
    actorName: row.actorName,
    orderRef: row.orderRef,
    isSensitive: row.isSensitive,
    category: categoryForAction(row.action),
  };
}

/**
 * Sensitive rows (`is_sensitive`): only Admin (`roleKey === "admin"`) may see them.
 * Non-admins with `team.activity.view` (if ever granted) get a filtered list.
 * Raw `meta` is never returned.
 */
function includeSensitiveFor(actor: StaffContext): boolean {
  return actor.roleKey === "admin";
}

/** One range of the team activity feed (brief B10). */
export async function listTeamActivity(
  actor: StaffContext,
  raw: ListTeamActivityInput = {},
  now = new Date(),
): Promise<TeamActivityItem[]> {
  assertCan(actor, "team.activity.view");
  const input = listTeamActivitySchema.parse(raw);
  const { from, to } = activityRangeWindow(input.range, now, cairoDayStart);
  try {
    assertBoundedWindow(from, to, cairoDayStart);
  } catch {
    throw new ValidationError({}, "فترة السجل أوسع من المسموح.");
  }

  const rows = await listActivityLogs({
    from,
    to,
    actorId: input.actorId,
    actions: input.category ? actionsForCategory(input.category) : undefined,
    includeSensitive: includeSensitiveFor(actor),
    limit: input.limit,
  });
  return rows.map(toItem);
}

/**
 * All three range chips at once (same idea as traffic), so switching stays instant.
 * Member/category chips filter client-side from these DTOs.
 */
export async function getTeamActivityFeed(
  actor: StaffContext,
  now = new Date(),
): Promise<TeamActivityFeed> {
  assertCan(actor, "team.activity.view");
  const includeSensitive = includeSensitiveFor(actor);
  const periods = Object.fromEntries(
    await Promise.all(
      ACTIVITY_RANGES.map(async (range) => {
        const { from, to } = activityRangeWindow(range, now, cairoDayStart);
        const rows = await listActivityLogs({
          from,
          to,
          includeSensitive,
          limit: ACTIVITY_FEED_LIMIT,
        });
        return [range, rows.map(toItem)] as const;
      }),
    ),
  ) as Record<ActivityRange, TeamActivityItem[]>;
  return { periods };
}
