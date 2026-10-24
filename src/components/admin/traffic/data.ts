/**
 * Demo traffic from docs/design/Admin-Traffic.html. The design shows these as «بيانات تجريبية»
 * until an analytics provider is chosen (brief B12, B13 #7); nothing here is real traffic.
 */

export type Range = "today" | "d7" | "d30";

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

export const fmt = (n: number) => n.toLocaleString("en-US");

const CFG: Record<Range, { n: number; base: number; seed: number }> = {
  today: { n: 24, base: 11, seed: 2 },
  d7: { n: 7, base: 190, seed: 5 },
  d30: { n: 30, base: 170, seed: 9 },
};

export function series(range: Range) {
  const cfg = CFG[range];
  const end = new Date(2026, 9, 22);
  const vals: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < cfg.n; i++) {
    let v =
      cfg.base * (1 + 0.32 * Math.sin((i + cfg.seed) * 0.85) + 0.14 * Math.cos(i * 2.1 + cfg.seed));
    if (range === "today")
      v = cfg.base * (0.25 + 1.6 * Math.max(0, Math.sin(((i - 7) / 17) * Math.PI))) + (i % 3);
    vals.push(Math.max(1, Math.round(v)));
    if (range === "today") {
      const h = i % 12 === 0 ? 12 : i % 12;
      labels.push(h + (i < 12 ? " ص" : " م"));
    } else {
      const d = new Date(end);
      d.setDate(end.getDate() - (cfg.n - 1 - i));
      labels.push(`${d.getDate()} ${MONTHS[d.getMonth()]}`);
    }
  }
  const total = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(...vals);
  const top = Math.ceil(max / 10) * 10 || 10;
  return { n: cfg.n, vals, labels, total, max, top };
}

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

export const DELTAS: Record<Range, [string, string, string, string]> = {
  today: ["+8%", "+5%", "+1", "+0.3"],
  d7: ["+12%", "+9%", "+18%", "+0.2"],
  d30: ["+6%", "+4%", "-3%", "-0.1"],
};

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

export const SOURCES: [string, number, string][] = [
  [
    "انستجرام",
    0.38,
    "M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01",
  ],
  ["فيسبوك", 0.22, "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"],
  ["تيك توك", 0.14, "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"],
  ["واتساب", 0.11, "M7.9 20A9 9 0 1 0 4 16.1L2 22Z"],
  ["بحث جوجل", 0.09, "M19 11a8 8 0 1 1-16 0 8 8 0 1 1 16 0M21 21l-4.3-4.3"],
  [
    "دخول مباشر",
    0.06,
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  ],
];

export const PAGES: [string, string, number][] = [
  ["الرئيسية", "/", 1],
  ["منشئ الطلب", "/request", 0.46],
  ["طباعة الملابس", "/services/tshirts", 0.31],
  ["تتبّع الطلب", "/track", 0.22],
  ["معرض الأعمال", "/#gallery", 0.18],
];

export const FUNNEL: [string, number][] = [
  ["زاروا الموقع", 1],
  ["فتحوا منشئ الطلب", 0.12],
  ["بعتوا طلب", 0.021],
  ["اتوافق على طلبهم", 0.016],
];

export const DEVICES: [string, number, string][] = [
  [
    "موبايل",
    78,
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01",
  ],
  [
    "ديسكتوب",
    15,
    "M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 21h8M12 17v4",
  ],
  ["تابلت", 7, "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01"],
];
