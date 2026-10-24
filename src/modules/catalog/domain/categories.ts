/** Category keys from brief B4. The DB rows (product_categories) carry the editable details. */
export const CATEGORY_KEYS = ["wear", "mug", "phone", "sticker", "custom"] as const;
export type BuiltinCategoryKey = (typeof CATEGORY_KEYS)[number];

/**
 * A service the admin adds from the dashboard. It has no questions of its own in the request
 * builder: the customer gives a quantity and describes what they want.
 */
export type ServiceKey = `svc-${string}`;
export type CategoryKey = BuiltinCategoryKey | ServiceKey;

const SERVICE_KEY = /^svc-[a-z0-9]{6}$/;

export function isBuiltinCategoryKey(value: string): value is BuiltinCategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}

export function isServiceKey(value: string): value is ServiceKey {
  return SERVICE_KEY.test(value);
}

export function isCategoryKey(value: string): value is CategoryKey {
  return isBuiltinCategoryKey(value) || isServiceKey(value);
}

/** Key for a service the admin adds (names are Arabic, so the key is opaque). */
export function newServiceKey(random: () => number = Math.random): ServiceKey {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(random() * alphabet.length)] ?? "x";
  return `svc-${suffix}`;
}
