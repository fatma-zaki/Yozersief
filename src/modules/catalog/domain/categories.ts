/** Category keys from brief B4. The DB rows (product_categories) carry the editable details. */
export const CATEGORY_KEYS = ["wear", "mug", "phone", "sticker", "custom"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export function isCategoryKey(value: string): value is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}
