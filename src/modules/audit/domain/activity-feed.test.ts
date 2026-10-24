import { describe, expect, it } from "vitest";
import {
  actionsForCategory,
  activityRangeWindow,
  assertBoundedWindow,
  categoryForAction,
  CATEGORY_ACTIONS,
  UNCATEGORIZED_ACTIONS,
} from "./activity-feed";

/** Fixed Cairo midnight helper for window math (UTC+2 winter-style offset). */
function cairoDayStart(at: Date): Date {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(at);
  return new Date(`${day}T00:00:00+02:00`);
}

describe("activity feed categories", () => {
  it("maps only verified actions, and leaves gallery/catalog uncategorized", () => {
    expect(categoryForAction("mockups.uploaded")).toBe("design");
    expect(categoryForAction("production.piece_printed")).toBe("prod");
    expect(categoryForAction("payments.recorded")).toBe("money");
    expect(categoryForAction("permissions.requested")).toBe("access");
    expect(categoryForAction("orders.approve")).toBe("orders");
    expect(categoryForAction("gallery.uploaded")).toBeNull();
    expect(categoryForAction("totally.unknown")).toBeNull();
    for (const action of UNCATEGORIZED_ACTIONS) {
      expect(categoryForAction(action)).toBeNull();
    }
  });

  it("keeps category action sets disjoint", () => {
    const seen = new Set<string>();
    for (const actions of Object.values(CATEGORY_ACTIONS)) {
      for (const action of actions) {
        expect(seen.has(action)).toBe(false);
        seen.add(action);
      }
    }
    expect(actionsForCategory("design")).toEqual([
      "mockups.uploaded",
      "mockups.files_flagged",
      "mockups.sent",
    ]);
  });
});

describe("activity range windows", () => {
  it("bounds today / week / month from Cairo midnight", () => {
    const now = new Date("2026-10-24T12:00:00+02:00");
    const today = activityRangeWindow("today", now, cairoDayStart);
    expect(today.from.toISOString()).toBe(cairoDayStart(now).toISOString());
    expect(today.to).toBe(now);

    const week = activityRangeWindow("week", now, cairoDayStart);
    expect(week.from.getTime()).toBe(today.from.getTime() - 6 * 86_400_000);

    const month = activityRangeWindow("month", now, cairoDayStart);
    expect(month.from.getTime()).toBe(today.from.getTime() - 29 * 86_400_000);
  });

  it("rejects windows wider than 30 Cairo days", () => {
    const to = new Date("2026-10-24T12:00:00+02:00");
    const from = new Date(cairoDayStart(to).getTime() - 30 * 86_400_000);
    expect(() => assertBoundedWindow(from, to, cairoDayStart)).toThrow(/too wide/);
    expect(() => assertBoundedWindow(cairoDayStart(to), to, cairoDayStart)).not.toThrow();
  });
});
