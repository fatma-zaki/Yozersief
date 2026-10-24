import { ar } from "@/i18n/ar";

export const TIME_ZONE = "Africa/Cairo";

/** Arabic locale with Western digits (brief A5). */
const LOCALE = "ar-EG-u-nu-latn";

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western 0-9. */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base =
      code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - base);
  });
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** Activity-log style, without the year: "22 أكتوبر 10:12 ص". */
export function formatShortDateTime(date: Date): string {
  const parts = shortDateTimeFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Formats a money string like "1250.50" as "1,250.50 ج.م". Whole amounts drop the decimals. */
export function formatMoney(amount: string): string {
  const [whole = "0", fraction = "00"] = amount.split(".");
  const negative = whole.startsWith("-");
  const digits = negative ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = fraction.padEnd(2, "0").slice(0, 2);
  const body = cents === "00" ? grouped : `${grouped}.${cents}`;
  return `${negative ? "-" : ""}${body} ${ar.money.currency}`;
}

/** Calendar date (YYYY-MM-DD) as seen in Cairo, for comparing against `date` columns. */
export function cairoDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}
