import { describe, expect, it } from "vitest";
import {
  bucketLabels,
  cairoDayStart,
  classifyDevice,
  classifySource,
  conversionRate,
  isBot,
  normalizePath,
  pageName,
  percentDelta,
  pointsDelta,
  rangeWindow,
  sharesOf,
} from "./traffic";

describe("normalizePath", () => {
  it("drops query, hash and trailing slash", () => {
    expect(normalizePath("/order/?category=mug#x")).toBe("/order");
    expect(normalizePath("/")).toBe("/");
  });

  it("never stores order refs or tracking tokens", () => {
    expect(normalizePath("/track/YZ-ABC234")).toBe("/track/[ref]");
    expect(normalizePath("/t/secret-token-value")).toBe("/t/[token]");
    expect(normalizePath("/track")).toBe("/track");
  });

  it("ignores staff, api and odd paths", () => {
    for (const p of [
      "/dashboard",
      "/dashboard/orders",
      "/login/invite/x",
      "/api/health",
      "x",
      "//evil.com",
    ]) {
      expect(normalizePath(p)).toBeNull();
    }
    expect(normalizePath("/dashboards-are-public")).toBe("/dashboards-are-public");
  });
});

describe("classifySource", () => {
  const site = "youzersef.com";
  it("prefers utm_source, with short aliases", () => {
    expect(
      classifySource({ referrer: "https://google.com/", utmSource: "IG", siteHost: site }),
    ).toBe("instagram");
    expect(classifySource({ referrer: null, utmSource: "newsletter", siteHost: site })).toBe(
      "other",
    );
  });

  it("maps referrer hosts", () => {
    const from = (referrer: string) =>
      classifySource({ referrer, utmSource: null, siteHost: site });
    expect(from("https://l.instagram.com/?u=x")).toBe("instagram");
    expect(from("https://m.facebook.com/")).toBe("facebook");
    expect(from("https://www.tiktok.com/@yz")).toBe("tiktok");
    expect(from("https://wa.me/2011")).toBe("whatsapp");
    expect(from("https://www.google.com.eg/")).toBe("google");
    expect(from("https://example.org/")).toBe("other");
  });

  it("treats no referrer, bad referrer and our own site as direct", () => {
    for (const referrer of [null, "", "not a url", "https://youzersef.com/order"]) {
      expect(classifySource({ referrer, utmSource: null, siteHost: site })).toBe("direct");
    }
  });
});

describe("devices and bots", () => {
  it("classifies user agents", () => {
    expect(classifyDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148")).toBe("mobile");
    expect(classifyDevice("Mozilla/5.0 (Linux; Android 14; SM-S918B) Mobile Safari")).toBe(
      "mobile",
    );
    expect(classifyDevice("Mozilla/5.0 (Linux; Android 14; SM-X710) Safari")).toBe("tablet");
    expect(classifyDevice("Mozilla/5.0 (iPad; CPU OS 18_0)")).toBe("tablet");
    expect(classifyDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140")).toBe("desktop");
  });

  it("filters bots and headless browsers", () => {
    expect(isBot("")).toBe(true);
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/140")).toBe(true);
    expect(isBot("facebookexternalhit/1.1 (preview)")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone) Mobile/15E148")).toBe(false);
  });
});

describe("Cairo windows", () => {
  // 2026-10-24 01:30 in Cairo (UTC+3 in October 2026) is 2026-10-23 22:30 UTC.
  const now = new Date("2026-10-23T22:30:00Z");

  it("finds Cairo midnight", () => {
    expect(cairoDayStart(now).toISOString()).toBe("2026-10-23T21:00:00.000Z");
  });

  it("builds today / 7 / 30 day windows with the previous span", () => {
    const today = rangeWindow("today", now);
    expect(today).toMatchObject({ buckets: 24, bucketMs: 3_600_000 });
    expect(today.prevFrom.toISOString()).toBe("2026-10-22T21:00:00.000Z");
    expect(today.prevTo.toISOString()).toBe("2026-10-22T22:30:00.000Z");

    const week = rangeWindow("d7", now);
    expect(week.from.toISOString()).toBe("2026-10-17T21:00:00.000Z");
    expect(week.prevFrom.toISOString()).toBe("2026-10-10T21:00:00.000Z");
    expect(rangeWindow("d30", now).buckets).toBe(30);
  });

  it("labels hours and days as in the design", () => {
    expect(bucketLabels("today", rangeWindow("today", now)).slice(0, 2)).toEqual(["12 ص", "1 ص"]);
    expect(bucketLabels("today", rangeWindow("today", now))[13]).toBe("1 م");
    const days = bucketLabels("d7", rangeWindow("d7", now));
    expect(days[0]).toBe("18 أكتوبر");
    expect(days[6]).toBe("24 أكتوبر");
  });
});

describe("comparisons", () => {
  it("formats deltas, or null without a baseline", () => {
    expect(percentDelta(112, 100)).toBe("+12%");
    expect(percentDelta(97, 100)).toBe("-3%");
    expect(percentDelta(5, 0)).toBeNull();
    expect(pointsDelta(2.3, 2.1)).toBe("+0.2");
    expect(pointsDelta(2, 2.1)).toBe("-0.1");
    expect(pointsDelta(2, null)).toBeNull();
    expect(conversionRate(0, 0)).toBe(0);
    expect(conversionRate(2, 100)).toBe(2);
  });

  it("splits shares into integers that sum to 100", () => {
    expect(sharesOf([1, 1, 1])).toEqual([34, 33, 33]);
    expect(sharesOf([0, 0, 0])).toEqual([0, 0, 0]);
    expect(sharesOf([78, 15, 7])).toEqual([78, 15, 7]);
  });

  it("names pages", () => {
    expect(pageName("/order", {})).toBe("منشئ الطلب");
    expect(pageName("/services/wear", { wear: "طباعة الملابس" })).toBe("طباعة الملابس");
    expect(pageName("/unknown", {})).toBe("/unknown");
  });
});
