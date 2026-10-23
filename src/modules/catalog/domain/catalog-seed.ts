/**
 * Default catalog (brief B4). Seeded once; the admin edits it from the dashboard afterwards.
 * Category images are placeholders until real photos are uploaded.
 */
export type SeedOption = { type: "color" | "size" | "place"; value: string; labelAr: string };
export type SeedProduct = { key: string; nameAr: string; options: SeedOption[] };
export type SeedCategory = { key: string; nameAr: string; products: SeedProduct[] };

const COLORS: SeedOption[] = [
  { type: "color", value: "white", labelAr: "أبيض" },
  { type: "color", value: "black", labelAr: "أسود" },
  { type: "color", value: "other", labelAr: "لون تاني" },
];

export const WEAR_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const SIZES: SeedOption[] = WEAR_SIZES.map((s) => ({ type: "size", value: s, labelAr: s }));

const PLACES: SeedOption[] = [
  { type: "place", value: "front", labelAr: "قدّام" },
  { type: "place", value: "back", labelAr: "ورا" },
  { type: "place", value: "sleeve", labelAr: "الكُم" },
];

const garment = (key: string, nameAr: string): SeedProduct => ({
  key,
  nameAr,
  options: [...COLORS, ...SIZES, ...PLACES],
});

export const CATALOG_SEED: SeedCategory[] = [
  {
    key: "wear",
    nameAr: "تيشيرتات وهوديز وكابات",
    products: [
      garment("tshirt", "تيشيرت"),
      garment("hoodie", "هودي"),
      garment("sweat", "سويتشيرت"),
      // Caps have no size split (B4) and no sleeve.
      {
        key: "cap",
        nameAr: "كاب",
        options: [...COLORS, ...PLACES.filter((p) => p.value !== "sleeve")],
      },
    ],
  },
  {
    key: "mug",
    nameAr: "مجات وهدايا",
    products: [
      { key: "mug", nameAr: "مج", options: [] },
      { key: "bottle", nameAr: "مطرة", options: [] },
    ],
  },
  { key: "phone", nameAr: "كفرات الموبايل", products: [] },
  { key: "sticker", nameAr: "استيكرات وملصقات", products: [] },
  { key: "custom", nameAr: "فكرة خاصة", products: [] },
];
