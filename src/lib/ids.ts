/**
 * Order reference alphabet: A–Z without the ambiguous I and O, plus digits 2–9 (no 0/1).
 * 32 symbols, so a random byte masked to 5 bits maps to it without bias.
 */
export const ORDER_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ORDER_REF_REGEX = /^YZ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function generateOrderRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let body = "";
  for (const byte of bytes) body += ORDER_REF_ALPHABET[byte & 31];
  return `YZ-${body}`;
}

/** Normalises what a customer types ("yz-ab12cd", " YZAB12CD ") to the canonical ref, or null. */
export function normalizeOrderRef(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = compact.startsWith("YZ") ? compact.slice(2) : compact;
  const ref = `YZ-${body}`;
  return ORDER_REF_REGEX.test(ref) ? ref : null;
}
