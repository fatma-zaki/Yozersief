/**
 * Idempotent seed (brief A6.1): roles, permissions, the B9 matrix, catalog (B4), message
 * templates (B8), site content, settings, and one admin from env. Demo data only with SEED_DEMO=true.
 * Usage: pnpm db:seed
 */
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import * as schema from "../src/db/schema";
import { normalizeEgyptianMobile } from "../src/lib/phone";
import { defaultPermissionsFor, PERMISSIONS, ROLES } from "../src/lib/rbac/permissions";
import { CATALOG_SEED } from "../src/modules/catalog/domain/catalog-seed";
import { TEMPLATE_SEED } from "../src/modules/messaging/domain/template-seed";
import { placeholderEmailFor } from "../src/modules/identity/domain/staff";
import { seedDemo } from "./seed-demo";

// Empty values in .env ("KEY=") count as unset.
const unsetIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema);

const seedEnv = z
  .object({
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: unsetIfEmpty(z.string().optional()),
    SEED_ADMIN_NAME: unsetIfEmpty(z.string().default("المدير")),
    SEED_ADMIN_EMAIL: unsetIfEmpty(z.email().optional()),
    SEED_ADMIN_PHONE: unsetIfEmpty(z.string({ error: "SEED_ADMIN_PHONE is required" })),
    SEED_ADMIN_PASSWORD: unsetIfEmpty(
      z.string({ error: "SEED_ADMIN_PASSWORD is required" }).min(12, "at least 12 characters"),
    ),
    SEED_DEMO: unsetIfEmpty(z.enum(["true", "false"]).default("false")),
  })
  .parse(process.env);

const adminPhone = normalizeEgyptianMobile(seedEnv.SEED_ADMIN_PHONE);
if (!adminPhone) throw new Error("SEED_ADMIN_PHONE must be an Egyptian mobile (01xxxxxxxxx).");

const pool = new Pool({
  connectionString: seedEnv.DATABASE_URL_UNPOOLED || seedEnv.DATABASE_URL,
  max: 1,
});
const db = drizzle({ client: pool, schema });

/** Pending business decisions (B13) are stored with `pending: true` and shown as [للتأكيد]. */
const SETTINGS: { key: string; value: unknown }[] = [
  { key: "security.two_factor", value: { enforced: false } },
  { key: "security.new_device_alert", value: { enabled: true } },
  { key: "security.timeout", value: { minutes: null, pending: true } },
  // Placeholder so invitations work before B13 #3 is decided; flagged pending in the UI.
  { key: "invitations.expiry_hours", value: { hours: 72, pending: true } },
  { key: "tracking.link_expiry_days", value: { days: null, pending: true } },
  { key: "quotes.validity_days", value: { days: null, pending: true } },
  { key: "mockups.free_revisions", value: { count: null, pending: true } },
  { key: "files.max_mb", value: { mb: 20, pending: true } },
  { key: "payments.deposit_percent", value: { percent: null, pending: true } },
  { key: "payments.methods", value: { methods: null, pending: true } },
  { key: "invoices.type", value: { type: null, pending: true } },
  { key: "desk.first_response_sla_hours", value: { hours: null, pending: true } },
  { key: "otp.channel", value: { channel: "whatsapp", smsFallback: null, pending: true } },
];

const SITE_CONTENT: { key: string; value: string }[] = [
  { key: "hero.title", value: "اطبع فكرتك على أي حاجة" },
  {
    key: "hero.subtitle",
    value: "تيشيرتات، هوديز، كابات، مجات، كفرات واستيكرات — للأفراد والشركات والفرق في أسوان.",
  },
  { key: "contact.whatsapp", value: "01116891025" },
  { key: "contact.address", value: "[للتأكيد]" },
  { key: "contact.hours", value: "[للتأكيد]" },
];

async function seedRbac() {
  for (const role of ROLES) {
    await db
      .insert(schema.roles)
      .values(role)
      .onConflictDoUpdate({ target: schema.roles.key, set: { nameAr: role.nameAr } });
  }
  for (const p of PERMISSIONS) {
    await db
      .insert(schema.permissions)
      .values({ key: p.key, labelAr: p.labelAr, groupKey: p.groupKey })
      .onConflictDoUpdate({
        target: schema.permissions.key,
        set: { labelAr: p.labelAr, groupKey: p.groupKey },
      });
  }

  const roleRows = await db.select().from(schema.roles);
  const permRows = await db.select().from(schema.permissions);
  const permId = new Map(permRows.map((p) => [p.key, p.id]));

  // Only add missing defaults: the admin may have toggled cells since the last seed.
  for (const role of roleRows) {
    const keys = defaultPermissionsFor(role.key as (typeof ROLES)[number]["key"]);
    const values = keys.map((k) => ({ roleId: role.id, permissionId: permId.get(k)! }));
    if (values.length) await db.insert(schema.rolePermissions).values(values).onConflictDoNothing();
  }
  return roleRows;
}

async function seedCatalog() {
  for (const [i, category] of CATALOG_SEED.entries()) {
    const [cat] = await db
      .insert(schema.productCategories)
      .values({
        key: category.key,
        nameAr: category.nameAr,
        imageUrl: `/images/categories/${category.key}.svg`,
        sortOrder: i + 1,
        isVisible: true,
      })
      .onConflictDoUpdate({ target: schema.productCategories.key, set: { key: category.key } })
      .returning();

    for (const product of category.products) {
      const [prod] = await db
        .insert(schema.products)
        .values({ categoryId: cat!.id, key: product.key, nameAr: product.nameAr, isVisible: true })
        .onConflictDoUpdate({ target: schema.products.key, set: { key: product.key } })
        .returning();

      const existing = await db
        .select({ id: schema.productOptions.id })
        .from(schema.productOptions)
        .where(eq(schema.productOptions.productId, prod!.id))
        .limit(1);
      if (existing.length === 0 && product.options.length > 0) {
        await db
          .insert(schema.productOptions)
          .values(product.options.map((o, j) => ({ ...o, productId: prod!.id, sortOrder: j + 1 })));
      }
    }
  }
}

async function seedContent() {
  for (const t of TEMPLATE_SEED) {
    await db.insert(schema.messageTemplates).values(t).onConflictDoNothing();
  }
  for (const c of SITE_CONTENT) {
    await db.insert(schema.siteContent).values(c).onConflictDoNothing();
  }
  for (const s of SETTINGS) {
    await db.insert(schema.settings).values(s).onConflictDoNothing();
  }
}

async function seedAdmin(roleRows: { id: number; key: string }[]) {
  const adminRole = roleRows.find((r) => r.key === "admin")!;
  const email = seedEnv.SEED_ADMIN_EMAIL?.toLowerCase() ?? placeholderEmailFor(adminPhone!);

  const [existing] = await db
    .select()
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.phone, adminPhone!));
  if (existing) {
    console.log(`Admin ${existing.email} already exists; password unchanged.`);
    return existing;
  }

  const [user] = await db
    .insert(schema.staffUsers)
    .values({
      name: seedEnv.SEED_ADMIN_NAME,
      phone: adminPhone!,
      email,
      roleId: adminRole.id,
      status: "active",
      emailVerified: Boolean(seedEnv.SEED_ADMIN_EMAIL),
      phoneVerified: true,
    })
    .returning();

  await db.insert(schema.staffAccounts).values({
    userId: user!.id,
    accountId: user!.id,
    providerId: "credential",
    password: await hashPassword(seedEnv.SEED_ADMIN_PASSWORD),
  });
  console.log(`Admin created: ${email}`);
  return user!;
}

async function main() {
  const roleRows = await seedRbac();
  await seedCatalog();
  await seedContent();
  const admin = await seedAdmin(roleRows);

  if (seedEnv.SEED_DEMO === "true") {
    await seedDemo(db, admin.id);
  }

  const [counts] = await db
    .execute<{ roles: number; perms: number; matrix: number }>(
      sql`
    select (select count(*) from roles)::int as roles,
           (select count(*) from permissions)::int as perms,
           (select count(*) from role_permissions)::int as matrix`,
    )
    .then((r) => r.rows);
  console.log(
    `Seed done: ${counts?.roles} roles, ${counts?.perms} permissions, ${counts?.matrix} matrix cells.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
