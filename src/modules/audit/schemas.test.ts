import { describe, expect, it } from "vitest";
import { ACTIVITY_FEED_LIMIT, ACTIVITY_FEED_MAX_LIMIT } from "./domain/activity-feed";
import { listTeamActivitySchema } from "./schemas";

describe("listTeamActivitySchema", () => {
  it("applies safe defaults", () => {
    expect(listTeamActivitySchema.parse({})).toEqual({
      range: "today",
      limit: ACTIVITY_FEED_LIMIT,
    });
  });

  it("rejects invalid range, category, actor id, and oversized limits", () => {
    expect(() => listTeamActivitySchema.parse({ range: "year" })).toThrow();
    expect(() => listTeamActivitySchema.parse({ category: "ops" })).toThrow();
    expect(() => listTeamActivitySchema.parse({ actorId: "not-a-uuid" })).toThrow();
    expect(() => listTeamActivitySchema.parse({ limit: ACTIVITY_FEED_MAX_LIMIT + 1 })).toThrow();
    expect(() => listTeamActivitySchema.parse({ limit: 0 })).toThrow();
  });
});
