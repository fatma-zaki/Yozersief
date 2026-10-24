import { describe, expect, it } from "vitest";
import { ar } from "@/i18n/ar";
import { CATEGORY_ACTIONS, UNCATEGORIZED_ACTIONS } from "./activity-feed";
import { labelForAction } from "./activity-labels";

describe("labelForAction", () => {
  it("returns Arabic copy for known actions", () => {
    expect(labelForAction("orders.approve")).toBe(ar.team.actions["orders.approve"]);
    expect(labelForAction("mockups.uploaded")).toBe(ar.team.actions["mockups.uploaded"]);
  });

  it("labels every categorized and uncategorized verified action", () => {
    for (const actions of Object.values(CATEGORY_ACTIONS)) {
      for (const action of actions) {
        expect(labelForAction(action)).not.toBe(ar.team.unknownAction);
      }
    }
    for (const action of UNCATEGORIZED_ACTIONS) {
      expect(labelForAction(action)).not.toBe(ar.team.unknownAction);
    }
  });

  it("never crashes on unknown actions", () => {
    expect(labelForAction("not.a.real.action")).toBe(ar.team.unknownAction);
    expect(labelForAction("")).toBe(ar.team.unknownAction);
  });
});
