import { describe, expect, it } from "vitest";
import { WEAR_SIZES } from "@/modules/catalog/schemas";
import { emptyDraft, sizeSum, WEAR_SIZES as requestWearSizes } from "./request";

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
