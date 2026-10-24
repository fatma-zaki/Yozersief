import { describe, expect, it } from "vitest";
import { WEAR_SIZES } from "@/modules/catalog/schemas";
import { buildChecks, emptyDraft, sizeSum, WEAR_SIZES as requestWearSizes } from "./request";

describe("wear sizes (brief B4)", () => {
  it("re-exports the catalog WEAR_SIZES constant", () => {
    expect(requestWearSizes).toBe(WEAR_SIZES);
    expect([...requestWearSizes]).toEqual(["S", "M", "L", "XL", "XXL"]);
  });

  it("emptyDraft sizes keys match WEAR_SIZES", () => {
    expect(Object.keys(emptyDraft().sizes)).toEqual([...WEAR_SIZES]);
  });

  it("sizeSum totals every wear size slot", () => {
    const sizes = emptyDraft().sizes;
    sizes.S = "2";
    sizes.XXL = "3";
    expect(sizeSum(sizes)).toBe(5);
  });
});

describe("dashboard services", () => {
  const today = "2026-10-24";
  const service = { ...emptyDraft(), ctype: "person" as const, cat: "svc-ab23cd" as const };
  const step2 = (d: typeof service) =>
    buildChecks(d, today, { "svc-ab23cd": "الطباعة على الحقائب" });

  it("names the service and asks for a quantity and a description", () => {
    const checks = step2(service);
    expect(checks.find((c) => c.id === "cat")?.msg).toBe("الطباعة على الحقائب");
    expect(checks.filter((c) => c.step === 2 && c.status === "attn").map((c) => c.id)).toEqual([
      "qty",
      "desc",
    ]);
  });

  it("is complete with both", () => {
    const checks = step2({ ...service, qty: "20", desc: "حقائب قماش بشعار المدرسة" });
    expect(checks.filter((c) => c.step === 2 && c.status === "attn")).toEqual([]);
  });
});
