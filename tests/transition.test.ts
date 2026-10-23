import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { StaffContext } from "@/lib/rbac";
import { defaultPermissionsFor } from "@/lib/rbac";
import { TEMPLATE_SEED } from "@/modules/messaging";
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
  env: { NODE_ENV: "test", MESSAGING_PROVIDER: "manual", TOKEN_HASH_SECRET: "x".repeat(32) },
}));

const { applyTransition } = await import("@/modules/orders");
const { dispatchDueMessages, ManualLinkProvider } = await import("@/modules/messaging");

let db: TestDb;
let close: () => Promise<void>;
let orderId: string;
let desk: StaffContext;
let admin: StaffContext;

const staffContext = (id: string, roleKey: "admin" | "desk"): StaffContext => ({
  id,
  name: roleKey,
  roleKey,
  sessionId: "s",
  twoFactorEnabled: false,
  permissions: new Set(defaultPermissionsFor(roleKey)),
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
      name: "مدير",
      phone: "01000000099",
      email: "a@x.invalid",
      roleId: adminRole!.id,
      status: "active",
    })
    .returning();
  const [d] = await db
    .insert(schema.staffUsers)
    .values({
      name: "استقبال",
      phone: "01000000010",
      email: "d@x.invalid",
      roleId: deskRole!.id,
      status: "active",
    })
    .returning();
  admin = staffContext(a!.id, "admin");
  desk = staffContext(d!.id, "desk");

  await db.insert(schema.messageTemplates).values(TEMPLATE_SEED);
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
      ref: "YZ-AB23CD",
      customerId: customer!.id,
      customerType: "person",
      categoryId: cat!.id,
      status: "submitted",
      receiptMethod: "pickup",
    })
    .returning();
  orderId = order!.id;
});

afterAll(() => close());

const counts = async () => ({
  events: (
    await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, orderId))
  ).length,
  logs: (
    await db.select().from(schema.activityLogs).where(eq(schema.activityLogs.orderId, orderId))
  ).length,
  messages: (await db.select().from(schema.messages).where(eq(schema.messages.orderId, orderId)))
    .length,
});

describe("applyTransition", () => {
  it("writes order, event and audit row together", async () => {
    const result = await applyTransition(
      { kind: "staff", staff: desk },
      { orderId, transition: "start_review" },
    );
    expect(result.ok).toBe(true);
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    expect(order?.status).toBe("in_review");
    expect(await counts()).toEqual({ events: 1, logs: 1, messages: 0 });
  });

  it("writes nothing when the actor lacks the permission", async () => {
    const before = await counts();
    const result = await applyTransition(
      { kind: "staff", staff: desk },
      { orderId, transition: "approve" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("forbidden");
    expect(await counts()).toEqual(before);
  });

  it("writes nothing when a guard fails", async () => {
    const before = await counts();
    const result = await applyTransition(
      { kind: "staff", staff: admin },
      { orderId, transition: "reject" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation");
    expect(await counts()).toEqual(before);
  });

  it("queues the customer message in the same transaction and resumes after a pause", async () => {
    const paused = await applyTransition(
      { kind: "staff", staff: desk },
      {
        orderId,
        transition: "request_info",
        reason: "محتاجين صورة أوضح للتصميم",
        notifyCustomer: true,
      },
    );
    expect(paused.ok).toBe(true);
    const [message] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.orderId, orderId));
    expect(message?.status).toBe("prepared");
    expect(message?.body).toContain("YZ-AB23CD");
    expect(message?.body).toContain("محتاجين صورة أوضح للتصميم");

    const resumed = await applyTransition(
      { kind: "customer" },
      { orderId, transition: "customer_responded" },
    );
    expect(resumed.ok && resumed.value.to.status).toBe("in_review");
  });

  it("dispatches due messages through the provider", async () => {
    const summary = await dispatchDueMessages(new ManualLinkProvider());
    expect(summary).toMatchObject({ claimed: 1, prepared: 1, failed: 0 });
    const again = await dispatchDueMessages(new ManualLinkProvider());
    expect(again.claimed).toBe(0);
  });
});
