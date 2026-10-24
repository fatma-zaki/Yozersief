/**
 * Team activity feed: verified action strings, UI categories, and Cairo date windows.
 * Labels live in `ar.team.actions`; this module only maps actions → categories.
 */

export const ACTIVITY_RANGES = ["today", "week", "month"] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

export const ACTIVITY_CATEGORIES = ["orders", "design", "prod", "money", "access"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/** Safe page size for the team feed (newest first). */
export const ACTIVITY_FEED_LIMIT = 100;
/** Hard cap so callers cannot ask for an unbounded history. */
export const ACTIVITY_FEED_MAX_LIMIT = 100;
/** Longest allowed window: 30 Cairo calendar days (matches the «30 يوم» chip). */
export const ACTIVITY_FEED_MAX_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Actions written by real call sites (`logActivity` / lifecycle `orders.${transition}`).
 * Category chips only map to these verified strings.
 */
export const CATEGORY_ACTIONS: Record<ActivityCategory, readonly string[]> = {
  orders: [
    "orders.submitted",
    "orders.forwarded",
    "orders.file_uploaded",
    "orders.internal_note_updated",
    "orders.start_review",
    "orders.request_info",
    "orders.customer_responded",
    "orders.approve",
    "orders.approve_and_send_quote",
    "orders.reject",
    "orders.accept_quote",
    "orders.approve_mockup",
    "orders.request_mockup_changes",
    "orders.confirm_deposit",
    "orders.start_production",
    "orders.send_to_qc",
    "orders.mark_ready",
    "orders.deliver",
    "orders.cancel",
    "quotes.drafted",
    "quotes.expired",
    "messages.whatsapp_link",
    "customers.phone_revealed",
  ],
  design: ["mockups.uploaded", "mockups.files_flagged", "mockups.sent"],
  prod: [
    "production.counter_updated",
    "production.qc_started",
    "production.qc_checked",
    "production.piece_printed",
  ],
  money: ["payments.recorded", "payments.confirmed", "delivery.wrong_code"],
  access: [
    "permissions.requested",
    "accounts.invited",
    "accounts.invitation_accepted",
    "accounts.paused",
    "accounts.reactivated",
    "auth.signed_in",
    "auth.signed_out_other_devices",
    "security.new_device",
  ],
};

const ACTION_TO_CATEGORY: ReadonlyMap<string, ActivityCategory> = new Map(
  (Object.entries(CATEGORY_ACTIONS) as [ActivityCategory, readonly string[]][]).flatMap(
    ([category, actions]) => actions.map((action) => [action, category] as const),
  ),
);

/** Actions confirmed in call sites but not in a UI category chip (shown under «الكل» only). */
export const UNCATEGORIZED_ACTIONS = [
  "gallery.uploaded",
  "gallery.sample_added",
  "gallery.updated",
  "gallery.deleted",
  "catalog.product_created",
  "catalog.product_updated",
  "catalog.product_shown",
  "catalog.product_hidden",
] as const;

export function categoryForAction(action: string): ActivityCategory | null {
  return ACTION_TO_CATEGORY.get(action) ?? null;
}

export function actionsForCategory(category: ActivityCategory): readonly string[] {
  return CATEGORY_ACTIONS[category];
}

/** Days in the range chip: today = 1, week = 7, month = 30 (today included). */
export function rangeDayCount(range: ActivityRange): number {
  if (range === "today") return 1;
  if (range === "week") return 7;
  return 30;
}

/**
 * Inclusive Cairo-day window ending at `now`.
 * `from` is Cairo midnight at the start of the first day; `to` is `now` (exclusive upper bound
 * not required — callers use `lte`/`gte` with `to = now`).
 */
export function activityRangeWindow(
  range: ActivityRange,
  now: Date,
  cairoDayStart: (at: Date) => Date,
): { from: Date; to: Date } {
  const todayStart = cairoDayStart(now);
  const days = rangeDayCount(range);
  return {
    from: new Date(todayStart.getTime() - (days - 1) * DAY_MS),
    to: now,
  };
}

/** Rejects windows longer than {@link ACTIVITY_FEED_MAX_DAYS} Cairo days. */
export function assertBoundedWindow(from: Date, to: Date, cairoDayStart: (at: Date) => Date): void {
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) {
    throw new RangeError("invalid from");
  }
  if (!(to instanceof Date) || Number.isNaN(to.getTime())) {
    throw new RangeError("invalid to");
  }
  if (from.getTime() > to.getTime()) {
    throw new RangeError("from after to");
  }
  const spanMs = cairoDayStart(to).getTime() - cairoDayStart(from).getTime();
  if (spanMs > (ACTIVITY_FEED_MAX_DAYS - 1) * DAY_MS) {
    throw new RangeError("date range too wide");
  }
}
