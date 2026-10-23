/**
 * Products & services admin (brief B4, B10; docs/design/Admin-Products.html). The drawer offers a
 * fixed set of colours, sizes and print places; the stored option rows keep the customer-facing
 * labels from the catalog seed.
 */
import { CATALOG_OPTION_LABELS, WEAR_SIZES } from "./catalog-seed";

export const COLOR_VALUES = ["white", "black", "other"] as const;
export const SIZE_VALUES = WEAR_SIZES;
export const PLACE_VALUES = ["front", "back", "sleeve"] as const;

export type ColorValue = (typeof COLOR_VALUES)[number];
export type SizeValue = (typeof SIZE_VALUES)[number];
export type PlaceValue = (typeof PLACE_VALUES)[number];
export type OptionType = "color" | "size" | "place";

/** Admin chip labels, as in the design. */
export const OPTION_CHOICES = {
  colors: [
    { value: "white", label: "أبيض" },
    { value: "black", label: "أسود" },
    { value: "other", label: "ألوان تانية" },
  ],
  sizes: SIZE_VALUES.map((v) => ({ value: v, label: v })),
  places: [
    { value: "front", label: "أمام" },
    { value: "back", label: "ظهر" },
    { value: "sleeve", label: "كُم" },
  ],
} as const satisfies Record<string, readonly { value: string; label: string }[]>;

export type OptionSelection = {
  colors: readonly ColorValue[];
  sizes: readonly SizeValue[];
  places: readonly PlaceValue[];
};

export type OptionRow = { type: OptionType; value: string; labelAr: string; sortOrder: number };

/** Keeps the canonical order (white → other, S → XXL, front → sleeve) and drops duplicates. */
function ordered<T extends string>(all: readonly T[], picked: readonly T[]): T[] {
  return all.filter((v) => picked.includes(v));
}

/** The `product_options` rows for a selection, in display order. */
export function optionRows(sel: OptionSelection): OptionRow[] {
  const typed: [OptionType, string[]][] = [
    ["color", ordered(COLOR_VALUES, sel.colors)],
    ["size", ordered(SIZE_VALUES, sel.sizes)],
    ["place", ordered(PLACE_VALUES, sel.places)],
  ];
  return typed
    .flatMap(([type, values]) =>
      values.map((value) => ({
        type,
        value,
        labelAr: CATALOG_OPTION_LABELS[type][value] ?? value,
      })),
    )
    .map((row, i) => ({ ...row, sortOrder: i + 1 }));
}

/** Back from stored rows to the drawer's selection; unknown values are ignored. */
export function selectionFrom(
  rows: readonly { type: OptionType; value: string }[],
): OptionSelection {
  const pick = <T extends string>(type: OptionType, all: readonly T[]) =>
    ordered(
      all,
      rows.filter((r) => r.type === type).map((r) => r.value as T),
    );
  return {
    colors: pick("color", COLOR_VALUES),
    sizes: pick("size", SIZE_VALUES),
    places: pick("place", PLACE_VALUES),
  };
}

/**
 * Key for a product the admin adds. Seeded products keep their B4 keys (tshirt, mug…), which
 * the request builder relies on; new ones get an opaque key since names are Arabic.
 */
export function newProductKey(random: () => number = Math.random): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += alphabet[Math.floor(random() * alphabet.length)] ?? "x";
  return `p-${suffix}`;
}
