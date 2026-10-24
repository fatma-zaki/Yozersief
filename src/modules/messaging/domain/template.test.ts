import { describe, expect, it } from "vitest";
import { TEMPLATE_SEED } from "./template-seed";
import {
  MAX_ATTEMPTS,
  missingVariables,
  nextAttemptAt,
  renderTemplate,
  whatsappLink,
} from "./template";

describe("renderTemplate", () => {
  const approve = TEMPLATE_SEED.find((t) => t.key === "approve")!.body;

  it("fills variables", () => {
    const text = renderTemplate(approve, {
      name: "منى",
      ref: "YZ-AB23CD",
      price_date: "السعر 450 ج.م والاستلام يوم 30 أكتوبر.",
      link: "https://youzersef.example/t/abc",
    });
    expect(text).toContain("مرحبًا منى، تم قبول طلبك رقم YZ-AB23CD");
    expect(text).toContain("https://youzersef.example/t/abc");
    expect(text).not.toMatch(/\{\w+\}/);
  });

  it("leaves missing variables visible and reports them", () => {
    expect(renderTemplate("مرحبًا {name} {ref}", { name: "منى" })).toBe("مرحبًا منى {ref}");
    expect(missingVariables(approve, { name: "x" }).sort()).toEqual(["link", "price_date", "ref"]);
  });

  it("seeds all seven templates, each mentioning the order ref", () => {
    expect(TEMPLATE_SEED.map((t) => t.key).sort()).toEqual(
      ["approve", "info", "quote", "ready", "reject", "thanks", "update"].sort(),
    );
    for (const t of TEMPLATE_SEED) expect(t.body).toContain("{ref}");
  });
});

describe("whatsappLink", () => {
  it("encodes the message", () => {
    expect(whatsappLink("201116891025", "مرحبًا & شكرًا")).toBe(
      `https://wa.me/201116891025?text=${encodeURIComponent("مرحبًا & شكرًا")}`,
    );
  });
});

describe("nextAttemptAt", () => {
  const now = new Date("2026-10-23T10:00:00Z");
  it("backs off and eventually gives up", () => {
    expect(nextAttemptAt(1, now)?.toISOString()).toBe("2026-10-23T10:01:00.000Z");
    expect(nextAttemptAt(2, now)?.toISOString()).toBe("2026-10-23T10:05:00.000Z");
    expect(nextAttemptAt(4, now)?.toISOString()).toBe("2026-10-23T11:00:00.000Z");
    expect(nextAttemptAt(MAX_ATTEMPTS, now)).toBeNull();
  });
});
