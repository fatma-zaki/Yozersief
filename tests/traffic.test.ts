import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/errors";
import type { StaffContext } from "@/lib/rbac";
import { defaultPermissionsFor } from "@/lib/rbac";
import { createTestDb, type TestDb } from "./helpers/db";

// Swap the runtime Postgres pool for an in-memory PGlite database with real migrations.
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", () => ({
  get db() {
    return holder.db;
  },
  pingDb: async () => true,
}));
vi.mock("@/env", () => ({
  env: { NODE_ENV: "test", APP_URL: "https://yz.test", TOKEN_HASH_SECRET: "x".repeat(32) },
}));

const { getLiveVisitors, getTrafficReport, recordPageView } = await import("@/modules/content");

let db: TestDb;
let close: () => Promise<void>;

const staff = (roleKey: "admin" | "desk"): StaffContext => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: roleKey,
  roleKey,
  sessionId: "s",
  twoFactorEnabled: false,
  permissions: new Set(defaultPermissionsFor(roleKey)),
});

const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148";
const DESK_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140";
const view = (path: string, extra: Partial<Parameters<typeof recordPageView>[0]> = {}) => ({
  path,
  referrer: null,
  utmSource: null,
  userAgent: PHONE_UA,
  ip: "10.0.0.1",
  siteHost: "yz.test",
  ...extra,
});

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;
});

afterAll(async () => {
  await close();
});

describe("page views", () => {
  it("records public views and skips staff routes and bots", async () => {
    expect(await recordPageView(view("/dashboard/orders"))).toBe(false);
    expect(await recordPageView(view("/", { userAgent: "Googlebot/2.1" }))).toBe(false);
    expect(await recordPageView(view("/track/YZ-ABC234"))).toBe(true);

    const rows = await db.select().from(schema.pageViews);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ path: "/track/[ref]", isEntry: true, device: "mobile" });
    // Neither the IP nor the user agent is stored.
    expect(JSON.stringify(rows)).not.toContain("10.0.0.1");
    expect(rows[0]!.visitorHash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("starts a new visit only after 30 quiet minutes", async () => {
    await db.delete(schema.pageViews);
    // A couple of minutes ago, so every view falls inside "today so far" and the live window.
    const t0 = new Date(Date.now() - 2 * 60_000);
    await recordPageView(view("/", { referrer: "https://l.instagram.com/" }), t0);
    await recordPageView(view("/order"), new Date(t0.getTime() + 60_000));
    await recordPageView(view("/", { ip: "10.0.0.2", userAgent: DESK_UA }), t0);

    const rows = await db.select().from(schema.pageViews).orderBy(schema.pageViews.id);
    expect(rows.map((r) => [r.path, r.isEntry, r.source, r.device])).toEqual([
      ["/", true, "instagram", "mobile"],
      ["/order", false, "direct", "mobile"],
      ["/", true, "direct", "desktop"],
    ]);
  });
});

describe("traffic report", () => {
  it("requires traffic.view", async () => {
    await expect(getTrafficReport(staff("desk"))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getLiveVisitors(staff("desk"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("aggregates visits, visitors, sources, pages, devices and the funnel", async () => {
    const report = await getTrafficReport(staff("admin"));
    const today = report.periods.today;

    expect(today.visits).toBe(2);
    expect(today.visitors).toBe(2);
    expect(today.vals.reduce((a, b) => a + b, 0)).toBe(2);
    expect(today.vals).toHaveLength(24);
    expect(today.sources).toEqual(
      expect.arrayContaining([
        { key: "instagram", visits: 1 },
        { key: "direct", visits: 1 },
      ]),
    );
    expect(today.pages[0]).toEqual({ path: "/", name: "الرئيسية", views: 2 });
    expect(today.pages[1]).toMatchObject({ path: "/order", name: "منشئ الطلب", views: 1 });
    expect(today.devices).toEqual([
      { key: "mobile", pct: 50 },
      { key: "desktop", pct: 50 },
      { key: "tablet", pct: 0 },
    ]);
    expect(today.funnel).toEqual({ visitors: 2, builder: 1, submitted: 0, approved: 0 });
    // Nothing recorded before today, so there is no baseline to compare with.
    expect(today.deltas).toEqual({ visits: null, visitors: null, orders: null, conv: null });
    expect(report.periods.d7.visits).toBe(2);
    expect(report.periods.d30.labels).toHaveLength(30);
    expect(report.live).toBe(2);
    expect(report.since).toBeInstanceOf(Date);
  });
});
