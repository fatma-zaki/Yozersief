import { normalizeDigits } from "./format";

/** Egyptian mobile in local form: 010/011/012/015 + 8 digits (brief B5). */
export const EGYPT_MOBILE_REGEX = /^01[0125]\d{8}$/;

/**
 * Normalises user input to the local 11-digit form, or returns null if it is not an Egyptian mobile.
 * Accepts Arabic-Indic digits, spaces, dashes, and +20 / 0020 / 20 prefixes.
 */
export function normalizeEgyptianMobile(input: string): string | null {
  let digits = normalizeDigits(input).replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return EGYPT_MOBILE_REGEX.test(digits) ? digits : null;
}

/** "01012345678" → "010•••••678". Anything unexpected is fully masked. */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return "•".repeat(phone.length);
  return `${phone.slice(0, 3)}${"•".repeat(phone.length - 6)}${phone.slice(-3)}`;
}

/** International form without "+" for wa.me links: "01012345678" → "201012345678". */
export function toInternational(phone: string): string {
  return `20${phone.slice(1)}`;
}

export function lastDigits(phone: string, count = 3): string {
  return phone.slice(-count);
}
