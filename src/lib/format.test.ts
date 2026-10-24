import { describe, expect, it } from "vitest";
import {
  cairoDateString,
  formatDate,
  formatMoney,
  formatNumber,
  formatShortDateTime,
  normalizeDigits,
} from "./format";

describe("normalizeDigits", () => {
  it("converts Arabic-Indic and Persian digits", () => {
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(normalizeDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(normalizeDigits("طلب ١٢ قطعة")).toBe("طلب 12 قطعة");
  });
});

describe("formatting", () => {
  it("uses Western digits in Arabic output", () => {
    expect(formatNumber(1250)).toMatch(/^1[,٬]250$/);
    expect(formatDate(new Date("2026-10-23T10:00:00Z"))).toMatch(/23/);
    expect(formatDate(new Date("2026-10-23T10:00:00Z"))).not.toMatch(/[٠-٩]/);
  });

  it("uses Cairo time for calendar dates", () => {
    // 23:30 UTC on the 22nd is already the 23rd in Cairo.
    expect(cairoDateString(new Date("2026-10-22T23:30:00Z"))).toBe("2026-10-23");
  });

  it("formats activity-log times without the year, in Cairo time", () => {
    // 07:12 UTC is 10:12 in Cairo (UTC+3 in October 2026).
    expect(formatShortDateTime(new Date("2026-10-22T07:12:00Z"))).toBe("22 أكتوبر 10:12 ص");
  });

  it("formats money", () => {
    expect(formatMoney("1250.00")).toBe("1,250 ج.م");
    expect(formatMoney("1250.5")).toBe("1,250.50 ج.م");
    expect(formatMoney("-30.25")).toBe("-30.25 ج.م");
  });
});
