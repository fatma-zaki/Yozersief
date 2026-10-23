import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { createTestDb, type TestDb } from "./helpers/db";

let db: TestDb;
let close: () => Promise<void>;
let categoryId: number;
let customerId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  const [cat] = await db
    .insert(schema.productCategories)
    .values({ key: "wear", nameAr: "ملابس", imageUrl: "/x.svg", sortOrder: 1 })
    .returning();
  const [customer] = await db
    .insert(schema.customers)
    .values({ name: "عميل", phone: "01012345678" })
    .returning();
  categoryId = cat!.id;
  customerId = customer!.id;
});

afterAll(() => close());

const baseOrder = () => ({
  customerId,
  categoryId,
  status: "submitted" as const,
  receiptMethod: "pickup" as const,
});

describe("migrations", () => {
  it("create all 37 tables (34 from the ERD + 3 for Better Auth) and 16 enums", async () => {
    const tables = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    );
    const enums = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from pg_type t join pg_namespace n on n.oid = t.typnamespace
          where t.typtype = 'e' and n.nspname = 'public'`,
    );
    expect(tables.rows[0]?.n).toBe(37);
    expect(enums.rows[0]?.n).toBe(16);
  });
});

describe("check constraints", () => {
  it("accepts a valid person order", async () => {
    await expect(
      db.insert(schema.orders).values({ ...baseOrder(), ref: "YZ-AB23CD", customerType: "person" }),
    ).resolves.toBeDefined();
  });

  it("rejects a malformed ref", async () => {
    await expect(
      db.insert(schema.orders).values({ ...baseOrder(), ref: "YZ-abc", customerType: "person" }),
    ).rejects.toThrow();
  });

  it("requires an organisation for non-person orders, and forbids one for persons", async () => {
    await expect(
      db.insert(schema.orders).values({ ...baseOrder(), ref: "YZ-AB23CE", customerType: "biz" }),
    ).rejects.toThrow();

    const [org] = await db
      .insert(schema.organizations)
      .values({ name: "شركة", type: "biz" })
      .returning();
    await expect(
      db.insert(schema.orders).values({
        ...baseOrder(),
        ref: "YZ-AB23CF",
        customerType: "person",
        organizationId: org!.id,
      }),
    ).rejects.toThrow();
    await expect(
      db.insert(schema.orders).values({
        ...baseOrder(),
        ref: "YZ-AB23CG",
        customerType: "biz",
        organizationId: org!.id,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects non-positive size quantities", async () => {
    const [order] = await db
      .insert(schema.orders)
      .values({ ...baseOrder(), ref: "YZ-AB23CH", customerType: "person" })
      .returning();
    await expect(
      db.insert(schema.orderSizes).values({ orderId: order!.id, size: "M", qty: 0 }),
    ).rejects.toThrow();
  });
});
