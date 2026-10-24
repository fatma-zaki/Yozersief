import { describe, expect, it } from "vitest";
import {
  averageFirstResponseMinutes,
  daysLabel,
  deskState,
  DESK_EVENTS,
  durationLabel,
  quoteSummary,
} from "./desk";

describe("deskState", () => {
  it("keeps undecided orders and drops decided ones", () => {
    expect(deskState("new", [])).toBe("new");
    expect(deskState("review", ["review_started"])).toBe("new");
    expect(deskState("awaiting", ["info_requested"])).toBe("awaiting");
    expect(deskState("approved", [])).toBeNull();
    expect(deskState("rejected", [DESK_EVENTS.forwarded])).toBeNull();
  });

  it("is pending after a forward or a quote draft", () => {
    expect(deskState("review", ["review_started", DESK_EVENTS.forwarded])).toBe("pending");
    expect(deskState("review", ["review_started", DESK_EVENTS.quoteDrafted])).toBe("pending");
  });

  it("comes back to the desk when the customer answers", () => {
    const events = [DESK_EVENTS.forwarded, "info_requested", "customer_responded"];
    expect(deskState("review", events)).toBe("new");
  });
});

describe("quoteSummary", () => {
  it("reads like the quote the admin sends", () => {
    expect(quoteSummary({ unitPrice: "85.00", total: "2550.00", leadTimeDays: 5 })).toBe(
      "سعر القطعة: 85 ج.م · الإجمالي: 2,550 ج.م · مدة التنفيذ: 5 أيام",
    );
  });

  it("names the days in Egyptian Arabic", () => {
    expect([1, 2, 7, 14].map(daysLabel)).toEqual(["يوم واحد", "يومين", "7 أيام", "14 يوم"]);
  });
});

describe("first response", () => {
  it("averages the minutes to the first staff action", () => {
    const at = (min: number) => new Date(Date.UTC(2026, 9, 1, 10, min));
    expect(
      averageFirstResponseMinutes([
        { submittedAt: at(0), firstActionAt: at(20) },
        { submittedAt: at(0), firstActionAt: at(40) },
      ]),
    ).toBe(30);
    expect(averageFirstResponseMinutes([])).toBeNull();
  });

  it("labels durations", () => {
    expect(durationLabel(25)).toBe("25 د");
    expect(durationLabel(180)).toBe("3 س");
    expect(durationLabel(80)).toBe("1 س 20 د");
    expect(durationLabel(2 * 24 * 60)).toBe("2 يوم");
  });
});
