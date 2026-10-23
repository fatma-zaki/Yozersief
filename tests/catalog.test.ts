import { eq } from "drizzle-orm";
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

const { getAdminCatalog, getHiddenProductKeys, saveProduct, setProductVisibility } =
  await import("@/modules/catalog");

let db: TestDb;
let close: () => Promise<void>;
let admin: StaffContext;
let desk: StaffContext;
let tshirtId: number;

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

  const [wear] = await db
    .insert(schema.productCategories)
    .values([
      { key: "wear", nameAr: "تيشيرتات وهوديز وكابات", imageUrl: "/w.jpg", sortOrder: 1 },
      { key: "mug", nameAr: "مجات وهدايا", imageUrl: "/m.jpg", sortOrder: 2 },
    ])
    .returning();
  const [tshirt] = await db
    .insert(schema.products)
    .values({
      categoryId: wear!.id,
      key: "tshirt",
      nameAr: "تيشيرت",
      description: "قطن",
      isVisible: true,
    })
    .returning();
  tshirtId = tshirt!.id;
  await db.insert(schema.productOptions).values([
    { productId: tshirtId, type: "color", value: "white", labelAr: "أبيض", sortOrder: 1 },
    { productId: tshirtId, type: "size", value: "M", labelAr: "M", sortOrder: 2 },
  ]);
});

afterAll(async () => {
  await close();
});

describe("catalog admin", () => {
  it("lists products with options and the category photo as fallback", async () => {
    const data = await getAdminCatalog(admin);
    expect(data.categories.map((c) => c.key)).toEqual(["wear", "mug"]);
    expect(data.products).toEqual([
      {
        id: tshirtId,
        name: "تيشيرت",
        categoryKey: "wear",
        img: "/w.jpg",
        desc: "قطن",
        colors: ["white"],
        sizes: ["M"],
        places: [],
        visible: true,
      },
    ]);
  });

  it("requires catalog.manage", async () => {
    await expect(getAdminCatalog(desk)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      setProductVisibility(desk, { id: tshirtId, visible: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a product with a generated key, its options and an audit row", async () => {
    const result = await saveProduct(admin, {
      id: null,
      name: "  مج سحري ",
      categoryKey: "mug",
      description: "بيبان الرسمة مع السخونية",
      colors: ["black"],
      sizes: [],
      places: [],
      visible: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ name: "مج سحري", created: true });

    const [row] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, result.value.id));
    expect(row).toMatchObject({ nameAr: "مج سحري", isVisible: false });
    expect(row!.key).toMatch(/^p-/);
    const opts = await db
      .select()
      .from(schema.productOptions)
      .where(eq(schema.productOptions.productId, row!.id));
    expect(opts.map((o) => [o.type, o.value, o.labelAr])).toEqual([["color", "black", "أسود"]]);

    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.entityId, String(row!.id)));
    expect(logs.map((l) => l.action)).toEqual(["catalog.product_created"]);
    expect(await getHiddenProductKeys()).toEqual([row!.key]);
  });

  it("updates fields and replaces the option set", async () => {
    const result = await saveProduct(admin, {
      id: tshirtId,
      name: "تيشيرت قطن",
      categoryKey: "wear",
      description: "",
      colors: ["white", "black"],
      sizes: ["S", "XXL"],
      places: ["back"],
      visible: true,
    });
    expect(result.ok).toBe(true);
    const product = (await getAdminCatalog(admin)).products.find((p) => p.id === tshirtId);
    expect(product).toMatchObject({
      name: "تيشيرت قطن",
      desc: "",
      colors: ["white", "black"],
      sizes: ["S", "XXL"],
      places: ["back"],
    });
  });

  it("returns Arabic field errors for bad input and touches nothing", async () => {
    const result = await saveProduct(admin, {
      id: tshirtId,
      name: " ",
      categoryKey: "wear",
      visible: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.userMessage).toBe("اكتب اسم المنتج.");
    const [row] = await db.select().from(schema.products).where(eq(schema.products.id, tshirtId));
    expect(row!.nameAr).toBe("تيشيرت قطن");
  });

  it("reports a missing product", async () => {
    const result = await saveProduct(admin, {
      id: 999,
      name: "مش موجود",
      categoryKey: "wear",
      visible: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("toggles visibility and logs only real changes", async () => {
    const hide = await setProductVisibility(admin, { id: tshirtId, visible: false });
    expect(hide).toMatchObject({ ok: true, value: { visible: false } });
    await setProductVisibility(admin, { id: tshirtId, visible: false });
    expect(await getHiddenProductKeys()).toContain("tshirt");

    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.action, "catalog.product_hidden"));
    expect(logs).toHaveLength(1);
  });
});
