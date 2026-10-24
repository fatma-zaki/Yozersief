import type { Device, Source } from "@/modules/content";

/**
 * Display helpers for the traffic board (docs/design/Admin-Traffic.html). The figures come from
 * `getTrafficReport` (first-party page views, ADR-0008).
 */

export type { Range } from "@/modules/content";

export const fmt = (n: number) => n.toLocaleString("en-US");

/** Catmull-Rom → cubic Bézier through the points (the design's smoothing). */
export function smoothPath(pts: [number, number][]): string {
  const [first] = pts;
  if (!first) return "";
  let line = `M${first[0].toFixed(1)},${first[1].toFixed(1)}`;
  for (let j = 0; j < pts.length - 1; j++) {
    const p1 = pts[j]!;
    const p2 = pts[j + 1]!;
    const p0 = pts[j - 1] ?? p1;
    const p3 = pts[j + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return line;
}

export const UP = "M7 17 17 7M7 7h10v10";
export const DOWN = "M7 7l10 10M17 7v10H7";

export const KPI_ICONS = {
  visits: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
  unique:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  uniqueM: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0",
  orders:
    "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
  conv: "M19 5 5 19M9 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0M20 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0",
} as const;

/** Delta text: a change without % but with a decimal is in percentage points («نقطة»). */
export function deltaText(t: string) {
  return t + (!t.includes("%") && t.includes(".") ? " نقطة" : "");
}

/** Label and icon per source, in the design's wording. */
export const SOURCE_META: Record<Source, [string, string]> = {
  instagram: [
    "إنستغرام",
    "M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01",
  ],
  facebook: ["فيسبوك", "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"],
  tiktok: ["تيك توك", "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"],
  whatsapp: ["واتساب", "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"],
  google: ["بحث جوجل", "M19 11a8 8 0 1 1-16 0 8 8 0 1 1 16 0M21 21l-4.3-4.3"],
  direct: [
    "دخول مباشر",
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  ],
  other: [
    "مواقع أخرى",
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  ],
};

export const DEVICE_META: Record<Device, [string, string]> = {
  mobile: [
    "هاتف",
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01",
  ],
  desktop: [
    "حاسوب مكتبي",
    "M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 21h8M12 17v4",
  ],
  tablet: [
    "جهاز لوحي",
    "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01",
  ],
};
