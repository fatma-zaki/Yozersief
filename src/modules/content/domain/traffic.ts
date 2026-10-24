/**
 * First-party traffic (brief B12, ADR-0008): what counts as a page view, where a visit came from,
 * and the date windows the dashboard compares. Pure: no IO, no framework.
 */

export const RANGES = ["today", "d7", "d30"] as const;
export type Range = (typeof RANGES)[number];

export const SOURCES = [
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
  "google",
  "direct",
  "other",
] as const;
export type Source = (typeof SOURCES)[number];

export const DEVICES = ["mobile", "desktop", "tablet"] as const;
export type Device = (typeof DEVICES)[number];

/** A view more than this long after the visitor's previous one starts a new visit. */
export const VISIT_GAP_MS = 30 * 60_000;
/** «زائر على الموقع دلوقتي»: distinct visitors seen in this window. */
export const LIVE_WINDOW_MS = 5 * 60_000;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_PATH = 200;

/** Staff and machine routes never count as traffic. */
const EXCLUDED_PREFIXES = ["/dashboard", "/login", "/api", "/_next", "/monitoring"];

/**
 * The path as stored: no query or hash, no trailing slash, and nothing that identifies an order
 * (refs in /track/…, secret tokens in /t/…). Null when the path is not public site traffic.
 */
export function normalizePath(raw: string): string | null {
  let path = raw.split(/[?#]/, 1)[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  if (/^\/track\/[^/]+/.test(path)) return "/track/[ref]";
  if (/^\/t\/[^/]+/.test(path)) return "/t/[token]";
  return path.slice(0, MAX_PATH);
}

const SOURCE_HOSTS: [Source, RegExp][] = [
  ["instagram", /(^|\.)instagram\.com$/],
  ["facebook", /(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["whatsapp", /(^|\.)(whatsapp\.com|whatsapp\.net|wa\.me)$/],
  ["google", /(^|\.)google\.[a-z.]+$/],
];

const UTM_ALIASES: Record<string, Source> = {
  ig: "instagram",
  insta: "instagram",
  fb: "facebook",
  wa: "whatsapp",
  tt: "tiktok",
};

/**
 * Where a visit came from: `utm_source` wins, then the referrer's host. No referrer, or a link
 * from our own site, is «دخول مباشر» (WhatsApp's in-app browser usually sends none).
 */
export function classifySource(input: {
  referrer: string | null;
  utmSource: string | null;
  siteHost: string;
}): Source {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm) {
    const known = (SOURCES as readonly string[]).includes(utm) ? (utm as Source) : null;
    return known ?? UTM_ALIASES[utm] ?? "other";
  }
  if (!input.referrer) return "direct";
  let host: string;
  try {
    host = new URL(input.referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (host === input.siteHost.toLowerCase()) return "direct";
  return SOURCE_HOSTS.find(([, re]) => re.test(host))?.[0] ?? "other";
}

export function classifyDevice(userAgent: string): Device {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/i.test(userAgent)) return "mobile";
  return "desktop";
}

/** Crawlers, link previews and headless browsers (incl. our own e2e runs). */
export function isBot(userAgent: string): boolean {
  return (
    !userAgent.trim() ||
    /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i.test(
      userAgent,
    )
  );
}

/* ---------- Cairo time windows ---------- */

const CAIRO_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Cairo",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

function cairoParts(at: Date) {
  const p = Object.fromEntries(CAIRO_PARTS.formatToParts(at).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Midnight in Cairo on the day of `at`, as a UTC instant. */
export function cairoDayStart(at: Date): Date {
  const p = cairoParts(at);
  const cairoAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = cairoAsUtc - Math.floor(at.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offset);
}

export type Window = {
  from: Date;
  to: Date;
  /** The same span right before it, for «عن الفترة اللي قبلها». */
  prevFrom: Date;
  prevTo: Date;
  bucketMs: number;
  buckets: number;
};

/** Today: hourly since Cairo midnight. 7/30 days: daily, today included. */
export function rangeWindow(range: Range, now: Date): Window {
  const today = cairoDayStart(now).getTime();
  const days = range === "today" ? 1 : range === "d7" ? 7 : 30;
  const from = today - (days - 1) * DAY;
  const span = days * DAY;
  return {
    from: new Date(from),
    to: now,
    prevFrom: new Date(from - span),
    prevTo: new Date(now.getTime() - span),
    bucketMs: range === "today" ? HOUR : DAY,
    buckets: range === "today" ? 24 : days,
  };
}

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/** Chart labels as in the design: «7 ص», «3 م» for hours; «22 أكتوبر» for days. */
export function bucketLabels(range: Range, w: Window): string[] {
  return Array.from({ length: w.buckets }, (_, i) => {
    if (range === "today") {
      const h = i % 12 === 0 ? 12 : i % 12;
      return `${h} ${i < 12 ? "ص" : "م"}`;
    }
    // Noon of that day, so a DST change never shifts the date.
    const p = cairoParts(new Date(w.from.getTime() + i * w.bucketMs + 12 * HOUR));
    return `${p.day} ${MONTHS[p.month - 1]}`;
  });
}

/* ---------- Comparisons ---------- */

/** «+12%» / «-3%» against the previous span; null when there is nothing to compare with. */
export function percentDelta(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

/** Conversion change in percentage points («+0.2»); null without a previous rate. */
export function pointsDelta(current: number, previous: number | null): string | null {
  if (previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`;
}

/** Orders per 100 visits. */
export function conversionRate(orders: number, visits: number): number {
  return visits > 0 ? (orders / visits) * 100 : 0;
}

/** Integer percentages that add up to 100 (largest remainder), for the devices rings. */
export function sharesOf(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map((n) => (n / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    out[i]! += 1;
  }
  return out;
}

const PAGE_NAMES: Record<string, string> = {
  "/": "الرئيسية",
  "/order": "منشئ الطلب",
  "/order/confirmation": "تأكيد الطلب",
  "/track": "تتبّع الطلب",
  "/track/[ref]": "صفحة متابعة الطلب",
  "/t/[token]": "لينك التتبّع",
  "/gallery": "معرض الأعمال",
};

/** Arabic name for a stored path; service pages use their category title. */
export function pageName(path: string, serviceTitles: Record<string, string>): string {
  const known = PAGE_NAMES[path];
  if (known) return known;
  const service = /^\/services\/([^/]+)$/.exec(path)?.[1];
  return (service && serviceTitles[service]) || path;
}
