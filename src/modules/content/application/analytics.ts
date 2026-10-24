import { countOrderFunnel } from "@/modules/orders";
import { env } from "@/env";
import { ar } from "@/i18n/ar";
import { assertCan, type StaffContext } from "@/lib/rbac";
import { hashToken } from "@/lib/tokens";
import {
  bucketLabels,
  cairoDayStart,
  classifyDevice,
  classifySource,
  conversionRate,
  DEVICES,
  isBot,
  LIVE_WINDOW_MS,
  normalizePath,
  pageName,
  percentDelta,
  pointsDelta,
  RANGES,
  rangeWindow,
  sharesOf,
  VISIT_GAP_MS,
  type Device,
  type Range,
  type Source,
} from "../domain/traffic";
import {
  countVisitorsSince,
  firstViewAt,
  hasViewSince,
  insertPageView,
  topPages,
  visitsBy,
  visitsPerBucket,
  windowTotals,
} from "../infrastructure/page-view-repository";

/**
 * Traffic dashboard (brief B12) from first-party page views (ADR-0008). Only aggregates leave
 * this module: no visitor hash, path with an order ref, or anything personal.
 */
export type TrafficPeriod = {
  labels: string[];
  /** Visits per hour (today) or per day. */
  vals: number[];
  visits: number;
  visitors: number;
  orders: number;
  /** Orders per 100 visits. */
  conv: number;
  /** Against the same span right before; null when that span had no data. */
  deltas: {
    visits: string | null;
    visitors: string | null;
    orders: string | null;
    conv: string | null;
  };
  sources: { key: Source; visits: number }[];
  pages: { path: string; name: string; views: number }[];
  /** زاروا → فتحوا منشئ الطلب → أرسلوا طلبًا → قُبل طلبهم */
  funnel: { visitors: number; builder: number; submitted: number; approved: number };
  devices: { key: Device; pct: number }[];
};

export type TrafficReport = {
  periods: Record<Range, TrafficPeriod>;
  live: number;
  /** First recorded view; null until the site gets its first visit. */
  since: Date | null;
};

export interface AnalyticsReader {
  readonly provider: "first-party";
  report(now: Date): Promise<TrafficReport>;
  liveVisitors(now: Date): Promise<number>;
}

const serviceTitles = Object.fromEntries(
  Object.entries(ar.catalog).map(([key, value]) => [key, value.t]),
);

async function period(range: Range, now: Date): Promise<TrafficPeriod> {
  const w = rangeWindow(range, now);
  const [buckets, cur, prev, orders, prevOrders, sources, devices, pages] = await Promise.all([
    visitsPerBucket(w.from, w.to, w.bucketMs),
    windowTotals(w.from, w.to),
    windowTotals(w.prevFrom, w.prevTo),
    countOrderFunnel({ from: w.from, to: w.to }),
    countOrderFunnel({ from: w.prevFrom, to: w.prevTo }),
    visitsBy("source", w.from, w.to),
    visitsBy("device", w.from, w.to),
    topPages(w.from, w.to, 5),
  ]);

  const vals = Array.from({ length: w.buckets }, () => 0);
  for (const b of buckets) if (b.bucket >= 0 && b.bucket < w.buckets) vals[b.bucket] = b.visits;

  const conv = conversionRate(orders.submitted, cur.visits);
  const prevConv = prev.visits > 0 ? conversionRate(prevOrders.submitted, prev.visits) : null;
  const deviceCounts = DEVICES.map((d) => devices.find((x) => x.key === d)?.visits ?? 0);
  const shares = sharesOf(deviceCounts);

  return {
    labels: bucketLabels(range, w),
    vals,
    visits: cur.visits,
    visitors: cur.visitors,
    orders: orders.submitted,
    conv,
    deltas: {
      visits: percentDelta(cur.visits, prev.visits),
      visitors: percentDelta(cur.visitors, prev.visitors),
      orders: percentDelta(orders.submitted, prevOrders.submitted),
      conv: pointsDelta(conv, prevConv),
    },
    sources: sources.map((s) => ({ key: s.key as Source, visits: s.visits })),
    pages: pages.map((p) => ({ ...p, name: pageName(p.path, serviceTitles) })),
    funnel: {
      visitors: cur.visitors,
      builder: cur.builderVisitors,
      submitted: orders.submitted,
      approved: orders.approved,
    },
    devices: DEVICES.map((key, i) => ({ key, pct: shares[i] ?? 0 })),
  };
}

export class FirstPartyAnalyticsReader implements AnalyticsReader {
  readonly provider = "first-party" as const;

  async report(now: Date): Promise<TrafficReport> {
    const [periods, live, since] = await Promise.all([
      Promise.all(RANGES.map((r) => period(r, now))),
      this.liveVisitors(now),
      firstViewAt(),
    ]);
    return {
      periods: Object.fromEntries(RANGES.map((r, i) => [r, periods[i]!])) as Record<
        Range,
        TrafficPeriod
      >,
      live,
      since,
    };
  }

  liveVisitors(now: Date): Promise<number> {
    return countVisitorsSince(new Date(now.getTime() - LIVE_WINDOW_MS));
  }
}

export function createAnalyticsReader(): AnalyticsReader {
  return new FirstPartyAnalyticsReader();
}

/** «الزيارات وحركة الزوار»: all three periods at once, so switching is instant. */
export async function getTrafficReport(actor: StaffContext): Promise<TrafficReport> {
  assertCan(actor, "traffic.view");
  return createAnalyticsReader().report(new Date());
}

/** The live pill refreshes on its own. */
export async function getLiveVisitors(actor: StaffContext): Promise<number> {
  assertCan(actor, "traffic.view");
  return createAnalyticsReader().liveVisitors(new Date());
}

export type PageViewInput = {
  path: string;
  referrer: string | null;
  utmSource: string | null;
  userAgent: string;
  ip: string;
  siteHost: string;
};

/**
 * Records one public page view (no actor: called by the site's beacon). Returns false when the
 * view is not counted (staff route, bot). The IP never leaves this function.
 */
export async function recordPageView(input: PageViewInput, now = new Date()): Promise<boolean> {
  const path = normalizePath(input.path);
  if (!path || isBot(input.userAgent)) return false;

  const day = cairoDayStart(now).toISOString();
  const visitorHash = (
    await hashToken(`${day}|${input.ip}|${input.userAgent}`, `${env.TOKEN_HASH_SECRET}:pageviews`)
  ).slice(0, 32);
  const isEntry = !(await hasViewSince(visitorHash, new Date(now.getTime() - VISIT_GAP_MS)));

  await insertPageView({
    createdAt: now,
    path,
    visitorHash,
    isEntry,
    source: classifySource({
      referrer: input.referrer,
      utmSource: input.utmSource,
      siteHost: input.siteHost,
    }),
    device: classifyDevice(input.userAgent),
  });
  return true;
}
