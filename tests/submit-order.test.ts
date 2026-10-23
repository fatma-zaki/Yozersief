import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { ConflictError } from "@/lib/errors";
import { hashToken } from "@/lib/tokens";
import { createTestDb, type TestDb } from "./helpers/db";

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
    TOKEN_HASH_SECRET: "test-token-hash-secret-32chars!!",
    MESSAGING_PROVIDER: "manual",
  },
}));

const { submitOrder } = await import("@/modules/orders/application/submit-order");
const { submitOrderInputSchema } = await import("@/modules/orders/schemas");
const ids = await import("@/lib/ids");

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;

  await db.insert(schema.productCategories).values([
    { key: "custom", nameAr: "فكرة", imageUrl: "/x.svg", sortOrder: 5, isVisible: true },
    { key: "wear", nameAr: "ملابس", imageUrl: "/w.svg", sortOrder: 1, isVisible: true },
  ]);
  const [wear] = await db
    .select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.key, "wear"));
  await db.insert(schema.products).values({
    categoryId: wear!.id,
    key: "tshirt",
    nameAr: "تيشيرت",
    isVisible: true,
  });
});

afterAll(() => close());

async function submit(input: Record<string, unknown>) {
  return submitOrder(submitOrderInputSchema.parse(input));
}

const secret = "test-token-hash-secret-32chars!!";

describe("submitOrder", () => {
  it("persists an order and returns only the public ref", async () => {
    const submissionKey = "11111111-1111-4111-8111-111111111111";
    const result = await submit({
      submissionKey,
      ctype: "person",
      cat: "custom",
      desc: "عايز أطباعة فكرة خاصة للمدرسة",
      help: true,
      hasDesignFiles: false,
      hasNamesSheet: false,
      name: "منى",
      phone: "01011112222",
      receipt: "pickup",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ref).toMatch(/^YZ-[A-Z0-9]{6}$/);
    expect(Object.keys(result.value)).toEqual(["ref"]);

    const [row] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.ref, result.value.ref));
    expect(row?.status).toBe("submitted");
    expect(row?.idempotencyKeyHash).toBe(await hashToken(submissionKey, secret));

    const events = await db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, row!.id));
    expect(events.some((e) => e.type === "submitted" && e.visibleToCustomer)).toBe(true);
  });

  it("returns the same ref on idempotent retry", async () => {
    const submissionKey = "22222222-2222-4222-8222-222222222222";
    const payload = {
      submissionKey,
      ctype: "person" as const,
      cat: "custom" as const,
      desc: "وصف أطول من عشرة حروف هنا",
      help: true,
      hasDesignFiles: false,
      hasNamesSheet: false,
      name: "سارة",
      phone: "01033334444",
      receipt: "pickup" as const,
    };
    const first = await submit(payload);
    const second = await submit(payload);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.ref).toBe(first.value.ref);

    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.idempotencyKeyHash, await hashToken(submissionKey, secret)));
    expect(rows).toHaveLength(1);
  });

  it("claims matching upload drafts into order_files", async () => {
    const submissionKey = "33333333-3333-4333-8333-333333333333";
    const hash = await hashToken(submissionKey, secret);
    await db.insert(schema.uploadDrafts).values({
      submissionKeyHash: hash,
      kind: "design",
      fileName: "logo.png",
      mimeType: "image/png",
      sizeBytes: 1200,
      storageKey: "https://blob.example/drafts/logo.png",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await submit({
      submissionKey,
      ctype: "person",
      cat: "custom",
      desc: "وصف أطول من عشرة حروف هنا",
      help: false,
      hasDesignFiles: true,
      hasNamesSheet: false,
      name: "كريم",
      phone: "01055556666",
      receipt: "pickup",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.ref, result.value.ref));
    const files = await db
      .select()
      .from(schema.orderFiles)
      .where(eq(schema.orderFiles.orderId, order!.id));
    expect(files).toHaveLength(1);
    expect(files[0]?.kind).toBe("design");

    const drafts = await db
      .select()
      .from(schema.uploadDrafts)
      .where(eq(schema.uploadDrafts.submissionKeyHash, hash));
    expect(drafts).toHaveLength(0);
  });

  it("rejects when design files are claimed but drafts are missing", async () => {
    const result = await submit({
      submissionKey: "44444444-4444-4444-8444-444444444444",
      ctype: "person",
      cat: "custom",
      desc: "وصف أطول من عشرة حروف هنا",
      help: false,
      hasDesignFiles: true,
      hasNamesSheet: false,
      name: "نور",
      phone: "01077778888",
      receipt: "pickup",
    });
    expect(result.ok).toBe(false);
  });

  it("concurrent submits with the same key share one order and do not duplicate side effects", async () => {
    const submissionKey = "55555555-5555-4555-8555-555555555555";
    const phone = "01099990000";
    const hash = await hashToken(submissionKey, secret);
    await db.insert(schema.uploadDrafts).values({
      submissionKeyHash: hash,
      kind: "design",
      fileName: "race.png",
      mimeType: "image/png",
      sizeBytes: 800,
      storageKey: "https://blob.example/drafts/race.png",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const payload = {
      submissionKey,
      ctype: "person" as const,
      cat: "custom" as const,
      desc: "وصف أطول من عشرة حروف هنا",
      help: false,
      hasDesignFiles: true,
      hasNamesSheet: false,
      name: "سباق",
      phone,
      receipt: "pickup" as const,
    };

    const [a, b] = await Promise.all([submit(payload), submit(payload)]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.ref).toBe(b.value.ref);

    const customers = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.phone, phone));
    expect(customers).toHaveLength(1);

    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.idempotencyKeyHash, hash));
    expect(orders).toHaveLength(1);
    const orderId = orders[0]!.id;
    expect(orders[0]!.customerId).toBe(customers[0]!.id);

    const files = await db
      .select()
      .from(schema.orderFiles)
      .where(eq(schema.orderFiles.orderId, orderId));
    expect(files).toHaveLength(1);

    const events = await db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, orderId));
    expect(events.filter((e) => e.type === "submitted")).toHaveLength(1);

    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.orderId, orderId));
    expect(logs.filter((l) => l.action === "orders.submitted")).toHaveLength(1);

    const leftoverDrafts = await db
      .select()
      .from(schema.uploadDrafts)
      .where(eq(schema.uploadDrafts.submissionKeyHash, hash));
    expect(leftoverDrafts).toHaveLength(0);
  });

  it("concurrent first-time submits with different keys and the same phone create two orders and one customer", async () => {
    const phone = "01088889999";
    const keyA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const keyB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const hashA = await hashToken(keyA, secret);
    const hashB = await hashToken(keyB, secret);

    const base = {
      ctype: "person" as const,
      cat: "custom" as const,
      desc: "وصف أطول من عشرة حروف هنا",
      help: true,
      hasDesignFiles: false,
      hasNamesSheet: false,
      name: "مشترك",
      phone,
      receipt: "pickup" as const,
    };

    const [a, b] = await Promise.all([
      submit({ ...base, submissionKey: keyA }),
      submit({ ...base, submissionKey: keyB }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.ref).not.toBe(b.value.ref);

    const customers = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.phone, phone));
    expect(customers).toHaveLength(1);

    const orderA = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.idempotencyKeyHash, hashA));
    const orderB = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.idempotencyKeyHash, hashB));
    expect(orderA).toHaveLength(1);
    expect(orderB).toHaveLength(1);
    expect(orderA[0]!.ref).toBe(a.value.ref);
    expect(orderB[0]!.ref).toBe(b.value.ref);
    expect(orderA[0]!.customerId).toBe(customers[0]!.id);
    expect(orderB[0]!.customerId).toBe(customers[0]!.id);
    expect(orderA[0]!.idempotencyKeyHash).toBe(hashA);
    expect(orderB[0]!.idempotencyKeyHash).toBe(hashB);
  });

  it("re-throws non-unique database errors instead of treating them as idempotent hits", async () => {
    const repo = await import("@/modules/orders/infrastructure/submit-repository");
    const spy = vi
      .spyOn(repo, "insertSubmittedOrder")
      .mockRejectedValueOnce(Object.assign(new Error("statement timeout"), { code: "57014" }));
    try {
      await expect(
        submit({
          submissionKey: "66666666-6666-4666-8666-666666666666",
          ctype: "person",
          cat: "custom",
          desc: "وصف أطول من عشرة حروف هنا",
          help: true,
          hasDesignFiles: false,
          hasNamesSheet: false,
          name: "فشل",
          phone: "01012121212",
          receipt: "pickup",
        }),
      ).rejects.toThrow(/statement timeout/);
    } finally {
      spy.mockRestore();
    }
  });

  it("surfaces ref-collision exhaustion as ConflictError (not a silent idempotent hit)", async () => {
    const takenRef = "YZ-AAAAAA";
    const [customer] = await db
      .insert(schema.customers)
      .values({ name: "موجود", phone: "01013131313" })
      .returning({ id: schema.customers.id });
    const [category] = await db
      .select({ id: schema.productCategories.id })
      .from(schema.productCategories)
      .where(eq(schema.productCategories.key, "custom"));
    await db.insert(schema.orders).values({
      ref: takenRef,
      idempotencyKeyHash: await hashToken("77777777-7777-4777-8777-777777777777", secret),
      customerId: customer!.id,
      customerType: "person",
      categoryId: category!.id,
      status: "submitted",
      receiptMethod: "pickup",
      needsDesignHelp: true,
    });

    const spy = vi.spyOn(ids, "generateOrderRef").mockReturnValue(takenRef);
    try {
      await expect(
        submit({
          submissionKey: "88888888-8888-4888-8888-888888888888",
          ctype: "person",
          cat: "custom",
          desc: "وصف أطول من عشرة حروف هنا",
          help: true,
          hasDesignFiles: false,
          hasNamesSheet: false,
          name: "تصادم",
          phone: "01014141414",
          receipt: "pickup",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    } finally {
      spy.mockRestore();
    }
  });
});
