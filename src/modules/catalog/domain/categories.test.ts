import { describe, expect, it } from "vitest";
import { isBuiltinCategoryKey, isCategoryKey, isServiceKey, newServiceKey } from "./categories";

describe("category keys", () => {
  it("accepts the B4 categories and dashboard services", () => {
    expect(isCategoryKey("wear")).toBe(true);
    expect(isCategoryKey("svc-ab23cd")).toBe(true);
    expect(isBuiltinCategoryKey("svc-ab23cd")).toBe(false);
    expect(isServiceKey("wear")).toBe(false);
  });

  it("rejects anything else", () => {
    for (const key of ["", "bags", "svc-", "svc-AB23CD", "svc-ab23cd7", "svc-ab-3cd"]) {
      expect(isCategoryKey(key)).toBe(false);
    }
  });

  it("generates valid service keys", () => {
    const key = newServiceKey(() => 0);
    expect(key).toBe("svc-aaaaaa");
    expect(isServiceKey(newServiceKey())).toBe(true);
  });
});
