/**
 * Clearly marked demo data (SEED_DEMO=true only). Every demo name starts with «[تجريبي]», every
 * demo phone uses the 0100000xxxx range and every demo product key starts with `demo-`, so it is
 * easy to spot and delete.
 */
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import { generateOrderRef } from "../src/lib/ids";
import { CATALOG_OPTION_LABELS } from "../src/modules/catalog/domain/catalog-seed";

const DEMO = "[تجريبي]";

/** Items from docs/design/Admin-Products.html with no B4 product behind them. */
const DEMO_PRODUCTS = [
  {
    key: "demo-phone-case",
    category: "phone",
    nameAr: "كفرات موبايل",
    description: "حسب موديل الموبايل [الموديلات المتاحة للتأكيد].",
    imageUrl: "/images/home/phone-cases.jpg",
    isVisible: true,
    places: [],
  },
  {
    key: "demo-sticker",
    category: "sticker",
    nameAr: "استيكرات",
    description: "استيكرات بأي مقاس وشكل.",
    imageUrl: "/images/home/sticker.jpg",
    isVisible: true,
    places: [],
  },
  {
    key: "demo-heat-press",
    category: "custom",
    nameAr: "الطباعة الحرارية",
    description: "طباعة حرارية على قطع العميل نفسه.",
    imageUrl: "/images/home/heat-press.jpg",
    isVisible: true,
    places: ["front", "back"],
  },
  {
    key: "demo-shop-sign",
    category: "custom",
    nameAr: "هدايا ولافتات مخصصة",
    description: "لافتات محلات وهدايا بتصميم خاص.",
    imageUrl: "/images/home/shop-sign.jpg",
    isVisible: false,
    places: [],
  },
] as const;

async function seedDemoProducts(db: NodePgDatabase<typeof schema>) {
  const categories = await db.select().from(schema.productCategories);
  const categoryId = new Map(categories.map((c) => [c.key, c.id]));
  let added = 0;
  for (const p of DEMO_PRODUCTS) {
    const [row] = await db
      .insert(schema.products)
      .values({
        categoryId: categoryId.get(p.category)!,
        key: p.key,
        nameAr: `${DEMO} ${p.nameAr}`,
        description: p.description,
        imageUrl: p.imageUrl,
        isVisible: p.isVisible,
      })
      .onConflictDoNothing({ target: schema.products.key })
      .returning();
    if (!row) continue;
    added++;
    if (p.places.length) {
      await db.insert(schema.productOptions).values(
        p.places.map((value, i) => ({
          productId: row.id,
          type: "place" as const,
          value,
          labelAr: CATALOG_OPTION_LABELS.place[value] ?? value,
          sortOrder: i + 1,
        })),
      );
    }
  }
  console.log(`Demo products: ${added} added.`);
}

export async function seedDemo(db: NodePgDatabase<typeof schema>, adminId: string) {
  await seedDemoProducts(db);

  const [existing] = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(eq(schema.customers.phone, "01000000001"));
  if (existing) {
    console.log("Demo data already present.");
    return;
  }

  const [wear] = await db
    .select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.key, "wear"));
  const [tshirt] = await db.select().from(schema.products).where(eq(schema.products.key, "tshirt"));

  await db.transaction(async (tx) => {
    const [person] = await tx
      .insert(schema.customers)
      .values({ name: `${DEMO} منى أحمد`, phone: "01000000001" })
      .returning();
    const [contact] = await tx
      .insert(schema.customers)
      .values({ name: `${DEMO} كريم سامي`, phone: "01000000002" })
      .returning();
    const [org] = await tx
      .insert(schema.organizations)
      .values({ name: `${DEMO} مدرسة النيل`, type: "group" })
      .returning();
    await tx
      .insert(schema.organizationContacts)
      .values({ organizationId: org!.id, customerId: contact!.id, title: "مشرف الأنشطة" });

    const [personOrder] = await tx
      .insert(schema.orders)
      .values({
        ref: generateOrderRef(),
        customerId: person!.id,
        customerType: "person",
        categoryId: wear!.id,
        productId: tshirt!.id,
        status: "submitted",
        quantity: 2,
        color: "black",
        receiptMethod: "pickup",
        notes: `${DEMO} طلب تجريبي`,
      })
      .returning();
    await tx.insert(schema.orderSizes).values([
      { orderId: personOrder!.id, size: "M", qty: 1 },
      { orderId: personOrder!.id, size: "L", qty: 1 },
    ]);
    await tx.insert(schema.orderPrintPlaces).values({ orderId: personOrder!.id, place: "front" });

    const [bizOrder] = await tx
      .insert(schema.orders)
      .values({
        ref: generateOrderRef(),
        customerId: contact!.id,
        organizationId: org!.id,
        customerType: "group",
        categoryId: wear!.id,
        productId: tshirt!.id,
        status: "in_review",
        bizStage: "quote",
        quantity: 60,
        color: "white",
        perPieceNames: true,
        wantsSample: true,
        receiptMethod: "pickup",
        notes: `${DEMO} طلب جهة تجريبي`,
      })
      .returning();
    await tx.insert(schema.orderSizes).values([
      { orderId: bizOrder!.id, size: "S", qty: 20 },
      { orderId: bizOrder!.id, size: "M", qty: 25 },
      { orderId: bizOrder!.id, size: "L", qty: 15 },
    ]);
    await tx.insert(schema.orderPrintPlaces).values([
      { orderId: bizOrder!.id, place: "front" },
      { orderId: bizOrder!.id, place: "back" },
    ]);

    for (const order of [personOrder!, bizOrder!]) {
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        type: "submitted",
        titleAr: "تم الإرسال",
        visibleToCustomer: true,
      });
    }
    await tx.insert(schema.activityLogs).values({
      userId: adminId,
      action: "demo.seeded",
      entityType: "seed",
      entityId: "demo",
      meta: { note: DEMO },
    });
  });
  console.log("Demo data added (marked [تجريبي]).");
}
