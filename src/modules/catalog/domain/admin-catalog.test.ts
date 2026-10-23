import { describe, expect, it } from "vitest";
import { newProductKey, optionRows, selectionFrom } from "./admin-catalog";

describe("optionRows", () => {
  it("keeps canonical order, drops duplicates and numbers rows across types", () => {
    const rows = optionRows({
      colors: ["other", "white", "white"],
      sizes: ["XL", "S"],
      places: ["sleeve", "front"],
    });
    expect(rows.map((r) => `${r.type}:${r.value}:${r.sortOrder}`)).toEqual([
      "color:white:1",
      "color:other:2",
      "size:S:3",
      "size:XL:4",
      "place:front:5",
      "place:sleeve:6",
    ]);
  });

  it("stores the customer-facing labels from the catalog seed", () => {
    const rows = optionRows({ colors: ["other"], sizes: [], places: ["back"] });
    expect(rows.map((r) => r.labelAr)).toEqual(["لون تاني", "ورا"]);
  });

  it("is empty for an empty selection", () => {
    expect(optionRows({ colors: [], sizes: [], places: [] })).toEqual([]);
  });
});

describe("selectionFrom", () => {
  it("round-trips optionRows and ignores unknown values", () => {
    const sel = { colors: ["black"], sizes: ["M", "L"], places: ["front"] } as const;
    const rows = [...optionRows(sel), { type: "color" as const, value: "gold" }];
    expect(selectionFrom(rows)).toEqual({
      colors: ["black"],
      sizes: ["M", "L"],
      places: ["front"],
    });
  });
});

describe("newProductKey", () => {
  it("is p- plus 8 unambiguous characters", () => {
    expect(newProductKey()).toMatch(/^p-[a-hj-km-np-z2-9]{8}$/);
    expect(newProductKey(() => 0)).toBe("p-aaaaaaaa");
  });
});
