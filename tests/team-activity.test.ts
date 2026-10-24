import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/errors";
import { defaultPermissionsFor, type StaffContext } from "@/lib/rbac";
import { createTestDb, type TestDb } from "./helpers/db";

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

const { getTeamActivityFeed, labelForAction, listTeamActivity } = await import("@/modules/audit");

let db: TestDb;
let close: () => Promise<void>;
let admin: StaffContext;
let desk: StaffContext;
let deskWithFeed: StaffContext;
let actorA: string;
let actorB: string;
let orderRef: string;
let orderId: string;

const staff = (
  id: string,
  roleKey: "admin" | "desk",
  permissions = defaultPermissionsFor(roleKey),
): StaffContext => ({
  id,
  name: roleKey,
  roleKey,
  sessionId: "s",
  twoFactorEnabled: false,
  permissions: new Set(permissions),
});

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;

  const [adminRole] = await db
    .insert(schema.roles)
    .values({ key: "admin", nameAr: "مدير" })
    .returning();
  const [deskRole] = await db
    .insert(schema.roles)
    .values({ key: "desk", nameAr: "استقبال" })
    .returning();

  const [a] = await db
    .insert(schema.staffUsers)
    .values({
      name: "مدير النظام",
      phone: "01000000001",
      email: "admin@x.invalid",
      roleId: adminRole!.id,
      status: "active",
    })
    .returning();
  const [d] = await db
    .insert(schema.staffUsers)
    .values({
      name: "سارة الاستقبال",
      phone: "01000000002",
      email: "desk@x.invalid",
      roleId: deskRole!.id,
      status: "active",
    })
    .returning();
  const [b] = await db
    .insert(schema.staffUsers)
    .values({
      name: "مصمم تجريبي",
      phone: "01000000003",
      email: "design@x.invalid",
      roleId: deskRole!.id,
      status: "active",
    })
    .returning();

  actorA = a!.id;
  actorB = b!.id;
  admin = staff(actorA, "admin");
  desk = staff(d!.id, "desk");
  deskWithFeed = staff(d!.id, "desk", ["team.activity.view", "orders.view"]);

  const [cat] = await db
    .insert(schema.productCategories)
    .values({ key: "wear", nameAr: "ملابس", imageUrl: "/x.jpg", sortOrder: 1 })
    .returning();
  const [customer] = await db
    .insert(schema.customers)
    .values({ name: "منى", phone: "01012345678" })
    .returning();
  const [order] = await db
    .insert(schema.orders)
    .values({
      ref: "YZ-FEED01",
      customerId: customer!.id,
      customerType: "person",
      categoryId: cat!.id,
      status: "submitted",
      receiptMethod: "pickup",
    })
    .returning();
  orderId = order!.id;
  orderRef = order!.ref;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60_000);
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60_000);

  await db.insert(schema.activityLogs).values([
    {
      userId: actorA,
      action: "orders.approve",
      entityType: "order",
      entityId: orderId,
      orderId,
      isSensitive: false,
      meta: { secret: "should-never-leak", phone: "01012345678" },
      createdAt: twoHoursAgo,
    },
    {
      userId: actorB,
      action: "mockups.uploaded",
      entityType: "order",
      entityId: orderId,
      orderId,
      isSensitive: false,
      meta: { deviceLabel: "iPhone" },
      createdAt: hourAgo,
    },
    {
      userId: d!.id,
      action: "customers.phone_revealed",
      entityType: "order",
      entityId: orderId,
      orderId,
      isSensitive: true,
      meta: { city: "أسوان" },
      createdAt: now,
    },
    {
      userId: null,
      action: "orders.submitted",
      entityType: "order",
      entityId: orderId,
      orderId,
      isSensitive: false,
      createdAt: new Date(now.getTime() - 30 * 60_000),
    },
    {
      userId: actorA,
      action: "permissions.requested",
      entityType: "permission",
      entityId: "traffic.view",
      isSensitive: false,
      createdAt: eightDaysAgo,
    },
    {
      userId: actorB,
      action: "totally.unknown_action",
      entityType: "order",
      entityId: orderId,
      orderId,
      isSensitive: false,
      createdAt: new Date(now.getTime() - 10 * 60_000),
    },
  ]);
});

afterAll(async () => {
  await close();
});

describe("listTeamActivity authorization", () => {
  it("denies staff without team.activity.view", async () => {
    await expect(listTeamActivity(desk)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getTeamActivityFeed(desk)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lets an authorized admin read the feed", async () => {
    const rows = await listTeamActivity(admin, { range: "today" });
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("listTeamActivity query behaviour", () => {
  it("returns newest first with deterministic id tie-break", async () => {
    const rows = await listTeamActivity(admin, { range: "today" });
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]!;
      const cur = rows[i]!;
      const prevT = Date.parse(prev.createdAt);
      const curT = Date.parse(cur.createdAt);
      expect(prevT).toBeGreaterThanOrEqual(curT);
      if (prevT === curT) expect(prev.id).toBeGreaterThan(cur.id);
    }
  });

  it("filters by actor UUID", async () => {
    const rows = await listTeamActivity(admin, { range: "month", actorId: actorB });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.actorId === actorB)).toBe(true);
    expect(rows.some((r) => r.action === "mockups.uploaded")).toBe(true);
  });

  it("filters by verified category action sets", async () => {
    const design = await listTeamActivity(admin, { range: "month", category: "design" });
    expect(design.every((r) => r.category === "design")).toBe(true);
    expect(design.some((r) => r.action === "mockups.uploaded")).toBe(true);

    const access = await listTeamActivity(admin, { range: "month", category: "access" });
    expect(access.some((r) => r.action === "permissions.requested")).toBe(true);
    expect(access.every((r) => r.category === "access")).toBe(true);
  });

  it("applies the Cairo date range (today excludes last week)", async () => {
    const today = await listTeamActivity(admin, { range: "today" });
    const month = await listTeamActivity(admin, { range: "month" });
    expect(today.some((r) => r.action === "permissions.requested")).toBe(false);
    expect(month.some((r) => r.action === "permissions.requested")).toBe(true);
  });

  it("keeps null user_id rows with a null actor name", async () => {
    const rows = await listTeamActivity(admin, { range: "today" });
    const system = rows.find((r) => r.action === "orders.submitted");
    expect(system).toMatchObject({ actorId: null, actorName: null, orderRef });
  });

  it("hides sensitive rows from non-admins even with team.activity.view", async () => {
    const asAdmin = await listTeamActivity(admin, { range: "today" });
    const asDesk = await listTeamActivity(deskWithFeed, { range: "today" });
    expect(asAdmin.some((r) => r.action === "customers.phone_revealed" && r.isSensitive)).toBe(
      true,
    );
    expect(asDesk.some((r) => r.isSensitive)).toBe(false);
    expect(asDesk.some((r) => r.action === "customers.phone_revealed")).toBe(false);
  });

  it("never returns raw meta, phones, or unrestricted fields", async () => {
    const rows = await listTeamActivity(admin, { range: "month" });
    const blob = JSON.stringify(rows);
    expect(blob).not.toContain("should-never-leak");
    expect(blob).not.toContain("deviceLabel");
    expect(blob).not.toContain("01012345678");
    expect(blob).not.toContain('"meta"');
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        [
          "action",
          "actorId",
          "actorName",
          "category",
          "createdAt",
          "id",
          "isSensitive",
          "label",
          "orderRef",
        ].sort(),
      );
    }
  });

  it("uses a safe Arabic fallback for unknown actions", async () => {
    const rows = await listTeamActivity(admin, { range: "today" });
    const unknown = rows.find((r) => r.action === "totally.unknown_action");
    expect(unknown?.label).toBe(labelForAction("nope"));
    expect(unknown?.label).toBeTruthy();
    expect(unknown?.label).not.toBe("totally.unknown_action");
  });

  it("returns an empty list when nothing matches (no fake rows)", async () => {
    const rows = await listTeamActivity(admin, {
      range: "today",
      actorId: "00000000-0000-4000-8000-000000009999",
    });
    expect(rows).toEqual([]);
  });

  it("attaches the order ref when the order relation exists", async () => {
    const rows = await listTeamActivity(admin, { range: "today", category: "orders" });
    expect(rows.some((r) => r.orderRef === orderRef)).toBe(true);
  });
});

describe("getTeamActivityFeed", () => {
  it("preloads today / week / month for the board", async () => {
    const feed = await getTeamActivityFeed(admin);
    expect(feed.periods.today.length).toBeGreaterThan(0);
    expect(feed.periods.week.length).toBeGreaterThanOrEqual(feed.periods.today.length);
    expect(feed.periods.month.length).toBeGreaterThanOrEqual(feed.periods.week.length);
    expect(feed.periods.month.some((r) => r.action === "permissions.requested")).toBe(true);
  });
});
