/**
 * Default catalog (brief B4). Seeded once; the admin edits it from the dashboard afterwards.
 * Descriptions and photos follow docs/design/Admin-Products.html; the seed only fills them while
 * they are still empty, so the admin's edits survive a re-seed.
 */
export type SeedOption = { type: "color" | "size" | "place"; value: string; labelAr: string };
export type SeedProduct = {
  key: string;
  nameAr: string;
  description: string;
  imageUrl: string;
  options: SeedOption[];
};
export type SeedCategory = { key: string; nameAr: string; products: SeedProduct[] };

const COLORS: SeedOption[] = [
  { type: "color", value: "white", labelAr: "أبيض" },
  { type: "color", value: "black", labelAr: "أسود" },
  { type: "color", value: "other", labelAr: "لون آخر" },
];

export const WEAR_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const SIZES: SeedOption[] = WEAR_SIZES.map((s) => ({ type: "size", value: s, labelAr: s }));

const PLACES: SeedOption[] = [
  { type: "place", value: "front", labelAr: "الأمام" },
  { type: "place", value: "back", labelAr: "الخلف" },
  { type: "place", value: "sleeve", labelAr: "الكُم" },
];

/** Customer-facing label per option value, used when the admin saves a product's options. */
export const CATALOG_OPTION_LABELS: Record<SeedOption["type"], Record<string, string>> = {
  color: Object.fromEntries(COLORS.map((o) => [o.value, o.labelAr])),
  size: Object.fromEntries(SIZES.map((o) => [o.value, o.labelAr])),
  place: Object.fromEntries(PLACES.map((o) => [o.value, o.labelAr])),
};

const garment = (
  key: string,
  nameAr: string,
  description: string,
  imageUrl: string,
): SeedProduct => ({
  key,
  nameAr,
  description,
  imageUrl,
  options: [...COLORS, ...SIZES, ...PLACES],
});

export const CATALOG_SEED: SeedCategory[] = [
  {
    key: "wear",
    nameAr: "تيشيرتات وهوديز وقبعات",
    products: [
      garment("tshirt", "تيشيرت", "طباعة على تيشيرتات قطن بتصميمك.", "/images/home/tshirt.jpg"),
      garment("hoodie", "هودي", "هوديز للدفعات والفرق والمناسبات.", "/images/home/hoodie.jpg"),
      garment(
        "sweat",
        "سويتشيرت",
        "سويتشيرت للدفعات والفرق والمناسبات.",
        "/images/home/hoodie.jpg",
      ),
      // Caps have no size split (B4) and no sleeve.
      {
        key: "cap",
        nameAr: "قبعة",
        description: "قبعات مطبوعة بشعار أو اسم.",
        imageUrl: "/images/home/cap.jpg",
        options: [...COLORS, ...PLACES.filter((p) => p.value !== "sleeve")],
      },
    ],
  },
  {
    key: "mug",
    nameAr: "أكواب وهدايا",
    products: [
      {
        key: "mug",
        nameAr: "كوب",
        description: "أكواب بأسماء أو صور للهدايا.",
        imageUrl: "/images/home/mug-bottle.jpg",
        options: [],
      },
      {
        key: "bottle",
        nameAr: "قارورة",
        description: "قوارير بأسماء أو صور للهدايا.",
        imageUrl: "/images/home/mug-bottle.jpg",
        options: [],
      },
    ],
  },
  { key: "phone", nameAr: "أغطية الهواتف", products: [] },
  { key: "sticker", nameAr: "ملصقات", products: [] },
  { key: "custom", nameAr: "فكرة خاصة", products: [] },
];
