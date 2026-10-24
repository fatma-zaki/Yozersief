/**
 * Adds disposable fixtures for Playwright e2e (run after db:seed). Test databases only.
 * - Desk staff member for smoke RBAC checks
 * - Two customer orders for tracking lookup / session / DTO boundary specs
 *
 * Usage: E2E_DESK_PHONE=… E2E_DESK_PASSWORD=… pnpm tsx scripts/seed-e2e.ts
 * Tracking refs default to the values documented in .env.example (E2E_TRACKING_*).
 */
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { placeholderEmailFor } from "../src/modules/identity/domain/staff";

const phone = process.env.E2E_DESK_PHONE ?? "01000000010";
const password = process.env.E2E_DESK_PASSWORD ?? "desk-e2e-password";

/** Fixed refs use only the order-ref alphabet (no I/O/0/1). */
const trackingRef = process.env.E2E_TRACKING_REF ?? "YZ-E2ETRA";
const trackingPhone = process.env.E2E_TRACKING_PHONE ?? "01000000020";
const trackingOtherRef = process.env.E2E_TRACKING_OTHER_REF ?? "YZ-E2ETRB";
const trackingOtherPhone = process.env.E2E_TRACKING_OTHER_PHONE ?? "01000000021";
const visibleEventTitle = process.env.E2E_TRACKING_VISIBLE_EVENT ?? "تم إرسال الطلب";
const hiddenEventNote = process.env.E2E_TRACKING_HIDDEN_NOTE ?? "E2E_STAFF_ONLY_NOTE";
const internalNote = process.env.E2E_TRACKING_INTERNAL_NOTE ?? "E2E_INTERNAL_ORDER_NOTE";

if (process.env.VERCEL_ENV === "production") {
  throw new Error("seed-e2e must never run against production.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = drizzle({ client: pool, schema });

async function ensureDeskUser() {
  const [role] = await db.select().from(schema.roles).where(eq(schema.roles.key, "desk"));
  if (!role) throw new Error("Run pnpm db:seed first.");
  const [existing] = await db
    .select()
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.phone, phone));
  if (existing) {
    console.log("e2e desk user already exists");
    return;
  }

  const [user] = await db
    .insert(schema.staffUsers)
    .values({
      name: "[تجريبي] استقبال",
      phone,
      email: placeholderEmailFor(phone),
      roleId: role.id,
      status: "active",
      phoneVerified: true,
    })
    .returning();
  await db.insert(schema.staffAccounts).values({
    userId: user!.id,
    accountId: user!.id,
    providerId: "credential",
    password: await hashPassword(password),
  });
  console.log("e2e desk user created");
}

async function ensureTrackingOrder(input: {
  ref: string;
  customerName: string;
  customerPhone: string;
  withBoundaryMarkers: boolean;
}) {
  const [existing] = await db.select().from(schema.orders).where(eq(schema.orders.ref, input.ref));
  if (existing) {
    console.log(`e2e tracking order ${input.ref} already exists`);
    return;
  }

  const [cat] = await db
    .select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.key, "wear"))
    .limit(1);
  if (!cat) throw new Error("Run pnpm db:seed first (product categories missing).");

  const [customer] = await db
    .insert(schema.customers)
    .values({ name: input.customerName, phone: input.customerPhone })
    .returning();

  const [order] = await db
    .insert(schema.orders)
    .values({
      ref: input.ref,
      customerId: customer!.id,
      customerType: "person",
      categoryId: cat.id,
      status: "submitted",
      receiptMethod: "pickup",
      notes: input.withBoundaryMarkers ? "E2E_ORDER_NOTES_NOT_IN_DTO" : null,
      internalNote: input.withBoundaryMarkers ? internalNote : null,
    })
    .returning();

  await db.insert(schema.orderEvents).values(
    input.withBoundaryMarkers
      ? [
          {
            orderId: order!.id,
            type: "submitted",
            titleAr: visibleEventTitle,
            note: "وصلنا طلبك للتجربة",
            visibleToCustomer: true,
          },
          {
            orderId: order!.id,
            type: "staff_note",
            titleAr: "ملاحظة داخلية",
            note: hiddenEventNote,
            visibleToCustomer: false,
          },
        ]
      : [
          {
            orderId: order!.id,
            type: "submitted",
            titleAr: "تم الإرسال",
            visibleToCustomer: true,
          },
        ],
  );
  console.log(`e2e tracking order ${input.ref} created`);
}

async function main() {
  await ensureDeskUser();
  await ensureTrackingOrder({
    ref: trackingRef,
    customerName: "[تجريبي] تتبع أ",
    customerPhone: trackingPhone,
    withBoundaryMarkers: true,
  });
  await ensureTrackingOrder({
    ref: trackingOtherRef,
    customerName: "[تجريبي] تتبع ب",
    customerPhone: trackingOtherPhone,
    withBoundaryMarkers: false,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
