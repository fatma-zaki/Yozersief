import { describe, expect, it } from "vitest";
import { buildPublicCatalog, type CategoryRow, type ProductRow } from "./public-catalog";

const cat = (id: number, key: string, isVisible = true): CategoryRow => ({
  id,
  key,
  nameAr: `فئة ${key}`,
  imageUrl: `/images/categories/${key}.jpg`,
  isVisible,
});
const prod = (key: string, categoryId: number, isVisible = true, imageUrl: string | null = null) =>
  ({ key, categoryId, nameAr: key, description: null, imageUrl, isVisible }) satisfies ProductRow;

describe("public catalog", () => {
  it("keeps sort order and lists only visible products", () => {
    const result = buildPublicCatalog(
      [cat(1, "wear"), cat(2, "mug")],
      [prod("tshirt", 1), prod("cap", 1, false), prod("mug", 2, true, "/m.jpg")],
    );
    expect(result.map((c) => c.key)).toEqual(["wear", "mug"]);
    expect(result[0]!.products.map((p) => p.key)).toEqual(["tshirt"]);
    expect(result[0]!.products[0]!.img).toBe("/images/categories/wear.jpg");
    expect(result[1]!.products[0]!.img).toBe("/m.jpg");
  });

  it("drops hidden categories and categories whose products are all hidden", () => {
    const result = buildPublicCatalog(
      [cat(1, "wear", false), cat(3, "phone"), cat(5, "custom")],
      [prod("tshirt", 1), prod("demo-phone-case", 3, false)],
    );
    expect(result.map((c) => c.key)).toEqual(["custom"]);
  });

  it("offers categories that have no products of their own", () => {
    expect(buildPublicCatalog([cat(4, "sticker")], []).map((c) => c.key)).toEqual(["sticker"]);
  });

  it("ignores rows that are not B4 categories", () => {
    expect(buildPublicCatalog([cat(9, "posters")], [])).toEqual([]);
  });
});
