import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ar } from "@/i18n/ar";
import type { TeamActivityFeed } from "@/modules/audit";
import { TeamBoard } from "./TeamBoard.client";

const emptyFeed: TeamActivityFeed = {
  periods: { today: [], week: [], month: [] },
};

describe("TeamBoard activity feed", () => {
  it("renders the empty state when there are no activity rows", () => {
    const html = renderToStaticMarkup(createElement(TeamBoard, { feed: emptyFeed }));
    expect(html).toContain(ar.team.feedEmpty);
    expect(html).toContain(ar.team.demoSections);
    expect(html).not.toContain("جهّز مسودة عرض سعر وبعتها للاعتماد");
  });

  it("renders a safe label for unknown actions without crashing", () => {
    const feed: TeamActivityFeed = {
      periods: {
        today: [
          {
            id: 1,
            createdAt: new Date().toISOString(),
            action: "weird.action",
            label: ar.team.unknownAction,
            actorId: null,
            actorName: null,
            orderRef: null,
            isSensitive: false,
            category: null,
          },
        ],
        week: [],
        month: [],
      },
    };
    const html = renderToStaticMarkup(createElement(TeamBoard, { feed }));
    expect(html).toContain(ar.team.unknownAction);
    expect(html).toContain(ar.team.systemActor);
    expect(html).not.toContain("weird.action");
  });

  it("treats blank actor names like the system actor", () => {
    const feed: TeamActivityFeed = {
      periods: {
        today: [
          {
            id: 2,
            createdAt: new Date().toISOString(),
            action: "orders.submitted",
            label: ar.team.actions["orders.submitted"],
            actorId: null,
            actorName: "   ",
            orderRef: "YZ-BLANK1",
            isSensitive: false,
            category: "orders",
          },
        ],
        week: [],
        month: [],
      },
    };
    const html = renderToStaticMarkup(createElement(TeamBoard, { feed }));
    expect(html).toContain(ar.team.systemActor);
    expect(html).toContain(ar.team.categories.orders);
    expect(html).toContain("YZ-BLANK1");
  });
});
