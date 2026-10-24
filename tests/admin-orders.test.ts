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
  env: {
    NODE_ENV: "test",
    APP_URL: "https://yz.test",
    MESSAGING_PROVIDER: "manual",
    TOKEN_HASH_SECRET: "x".repeat(32),
  },
}));

const { advanceOrderStage, countNewOrders, decideOrder, getAdminOrders, saveInternalNote } =
  await import("@/modules/orders");

let db: TestDb;
let close: () => Promise<void>;
let admin: StaffContext;
let desk: StaffContext;
let personOrder: string;
let bizOrder: string;

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

  const roles = await db
    .insert(schema.roles)
    .values([
      { key: "admin", nameAr: "مدير" },
      { key: "desk", nameAr: "استقبال" },
    ])
    .returning();
  const [a, d] = await db
    .insert(schema.staffUsers)
    .values([
      {
        name: "مدير",
        phone: "01000000099",
        email: "a@x.invalid",
        roleId: roles[0]!.id,
        status: "active",
      },
      {
        name: "استقبال",
        phone: "01000000010",
        email: "d@x.invalid",
        roleId: roles[1]!.id,
        status: "active",
      },
    ])
    .returning();
  admin = staffContext(a!.id, "admin");
  desk = staffContext(d!.id, "desk");

  await db.insert(schema.messageTemplates).values(TEMPLATE_SEED);
  const [wear] = await db
    .insert(schema.productCategories)
    .values({ key: "wear", nameAr: "تيشيرتات وهوديز وكابات", imageUrl: "/x.jpg", sortOrder: 1 })
    .returning();
  const [tshirt] = await db
    .insert(schema.products)
    .values({ categoryId: wear!.id, key: "tshirt", nameAr: "تيشيرت", isVisible: true })
    .returning();
  const [mona, ahmed] = await db
    .insert(schema.customers)
    .values([
      { name: "منى إبراهيم", phone: "01012345678" },
      { name: "أحمد فتحي", phone: "01112345678" },
    ])
    .returning();
  const [cafe] = await db
    .insert(schema.organizations)
    .values({ name: "كافيه النخيل", type: "biz" })
    .returning();
  await db
    .insert(schema.organizationContacts)
    .values({ organizationId: cafe!.id, customerId: ahmed!.id, title: "صاحب المحل" });

  const base = {
    categoryId: wear!.id,
    productId: tshirt!.id,
    status: "submitted" as const,
    receiptMethod: "pickup" as const,
    quantity: 12,
    color: "white",
  };
  const [p, b] = await db
    .insert(schema.orders)
    .values([
      { ...base, ref: "YZ-AB23CD", customerId: mona!.id, customerType: "person" },
      {
        ...base,
        ref: "YZ-CD45EF",
        customerId: ahmed!.id,
        customerType: "biz",
        organizationId: cafe!.id,
        wantsSample: true,
        quantity: 60,
      },
    ])
    .returning();
  personOrder = p!.id;
  bizOrder = b!.id;
  await db.insert(schema.orderSizes).values([
    { orderId: personOrder, size: "M", qty: 8 },
    { orderId: personOrder, size: "S", qty: 4 },
  ]);
  await db.insert(schema.orderPrintPlaces).values({ orderId: personOrder, place: "front" });
});

afterAll(() => close());

const orderRow = async (id: string) =>
  (await db.select().from(schema.orders).where(eq(schema.orders.id, id)))[0]!;
const events = (id: string) =>
  db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, id));
const messages = (id: string) =>
  db.select().from(schema.messages).where(eq(schema.messages.orderId, id));

describe("admin orders screen", () => {
  it("lists orders with masked phones, labels and what the viewer may do", async () => {
    const data = await getAdminOrders(desk);
    const p = data.orders.find((o) => o.id === personOrder)!;
    expect(p).toMatchObject({
      ref: "YZ-AB23CD",
      name: "منى إبراهيم",
      phone: "010•••••678",
      product: "تيشيرت أبيض × 12",
      status: "new",
      receipt: "استلام من المحل",
      date: "مش محدد",
      can: { approve: false, info: true, reject: false, note: true },
    });
    expect(p.specs).toContainEqual({ k: "المقاسات", v: "S4 · M8" });
    const b = data.orders.find((o) => o.id === bizOrder)!;
    expect(b).toMatchObject({ ctype: "biz", org: "كافيه النخيل", role: "صاحب المحل" });
    expect(data.stats.new).toBe(2);
    expect(data.trackUrl).toBe("https://yz.test/track");
    expect(data.templates.quote).toContain("{quote}");
    expect(await countNewOrders(desk)).toBe(2);
  });

  it("writes nothing when the role may not decide", async () => {
    const result = await decideOrder(desk, { orderId: personOrder, decision: "approve" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("forbidden");
    expect((await orderRow(personOrder)).status).toBe("submitted");
    expect(await events(personOrder)).toHaveLength(0);
  });

  it("requires a clear reason to reject", async () => {
    const result = await decideOrder(admin, {
      orderId: personOrder,
      decision: "reject",
      text: "لا",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation");
  });

  it("approves a new order in one go and prepares the WhatsApp message", async () => {
    const result = await decideOrder(admin, {
      orderId: personOrder,
      decision: "approve",
      text: "السعر 1200 جنيه · الاستلام الخميس",
      notify: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((await orderRow(personOrder)).status).toBe("approved");
    const types = (await events(personOrder)).map((e) => [e.type, e.visibleToCustomer]);
    expect(types).toEqual([
      ["review_started", true],
      ["approved", true],
      ["message_prepared", false],
    ]);
    const [message] = await messages(personOrder);
    expect(message?.body).toContain("أهلًا منى");
    expect(message?.body).toContain("YZ-AB23CD");
    expect(message?.body).toContain("السعر 1200 جنيه");
    expect(message?.body).toContain("https://yz.test/track");
    expect(result.value.waLink).toMatch(/^https:\/\/wa\.me\/201012345678\?text=/);
  });

  it("asks a business for info, then sends the quote after resuming", async () => {
    const info = await decideOrder(desk, {
      orderId: bizOrder,
      decision: "info",
      text: "محتاجين ملف اللوجو بدقة أعلى",
    });
    expect(info.ok).toBe(true);
    expect((await orderRow(bizOrder)).status).toBe("awaiting_customer");

    const quote = await decideOrder(admin, {
      orderId: bizOrder,
      decision: "approve",
      text: "سعر القطعة 180 · الإجمالي 10800 · المدة 7 أيام",
    });
    expect(quote.ok).toBe(true);
    const order = await orderRow(bizOrder);
    expect([order.status, order.bizStage]).toEqual(["approved", "customer_approval"]);
    const bodies = (await messages(bizOrder)).map((m) => m.body);
    expect(bodies.at(-1)).toContain("كافيه النخيل");
    expect(bodies.at(-1)).toContain("سعر القطعة 180");
  });

  it("records the next business stage, and stops at a guard without writing", async () => {
    const accepted = await advanceOrderStage(admin, { orderId: bizOrder });
    expect(accepted.ok && accepted.value.label).toBe("العميل وافق على العرض");
    expect((await orderRow(bizOrder)).bizStage).toBe("mockup");
    const before = (await events(bizOrder)).length;

    const blocked = await advanceOrderStage(admin, { orderId: bizOrder });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.userMessage).toBe("مفيش موكاب متبعت للعميل لسه.");
    expect((await orderRow(bizOrder)).bizStage).toBe("mockup");
    expect(await events(bizOrder)).toHaveLength(before);

    const view = (await getAdminOrders(admin)).orders.find((o) => o.id === bizOrder)!;
    expect(view.next).toEqual({
      label: "العميل اعتمد الموكاب والعينة",
      blocked: "مفيش موكاب متبعت للعميل لسه.",
    });
  });

  it("saves the internal note without touching the customer timeline", async () => {
    const before = (await events(personOrder)).length;
    const result = await saveInternalNote(desk, {
      orderId: personOrder,
      note: "العميل عايز يستلم بدري",
    });
    expect(result.ok).toBe(true);
    expect((await orderRow(personOrder)).internalNote).toBe("العميل عايز يستلم بدري");
    expect(await events(personOrder)).toHaveLength(before);
  });
});
