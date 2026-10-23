/**
 * Traffic dashboard port (brief B12). Provider is pending (Plausible vs GA4, B13 #7), so the
 * stub returns clearly flagged demo data; traffic is never stored in our database.
 */
export type TrafficSummary = {
  isDemo: boolean;
  range: { from: Date; to: Date };
  visitors: number;
  sessions: number;
  topPages: { path: string; views: number }[];
  sources: { source: string; visitors: number }[];
  devices: { device: "mobile" | "desktop" | "tablet"; share: number }[];
  /** home → request builder → submitted */
  funnel: { step: "home" | "order" | "submitted"; visitors: number }[];
  liveVisitors: number;
};

export interface AnalyticsReader {
  readonly provider: "none" | "plausible" | "ga4";
  summary(range: { from: Date; to: Date }): Promise<TrafficSummary>;
}

export class DemoAnalyticsReader implements AnalyticsReader {
  readonly provider = "none" as const;

  async summary(range: { from: Date; to: Date }): Promise<TrafficSummary> {
    return {
      isDemo: true,
      range,
      visitors: 1240,
      sessions: 1610,
      topPages: [
        { path: "/", views: 980 },
        { path: "/order", views: 410 },
        { path: "/track", views: 260 },
      ],
      sources: [
        { source: "whatsapp", visitors: 690 },
        { source: "facebook", visitors: 300 },
        { source: "direct", visitors: 250 },
      ],
      devices: [
        { device: "mobile", share: 0.82 },
        { device: "desktop", share: 0.15 },
        { device: "tablet", share: 0.03 },
      ],
      funnel: [
        { step: "home", visitors: 1240 },
        { step: "order", visitors: 410 },
        { step: "submitted", visitors: 96 },
      ],
      liveVisitors: 7,
    };
  }
}

export function createAnalyticsReader(): AnalyticsReader {
  // Plausible / GA4 adapters land with B13 #7; until then everything is demo data.
  return new DemoAnalyticsReader();
}
