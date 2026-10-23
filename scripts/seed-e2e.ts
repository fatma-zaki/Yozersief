/**
 * Adds a "desk" staff member for the e2e smoke test (run after db:seed). Test databases only.
 * Usage: E2E_DESK_PHONE=… E2E_DESK_PASSWORD=… pnpm tsx scripts/seed-e2e.ts
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

if (process.env.VERCEL_ENV === "production") {
  throw new Error("seed-e2e must never run against production.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = drizzle({ client: pool, schema });

async function main() {
  const [role] = await db.select().from(schema.roles).where(eq(schema.roles.key, "desk"));
  if (!role) throw new Error("Run pnpm db:seed first.");
  const [existing] = await db
    .select()
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.phone, phone));
  if (existing) return console.log("e2e desk user already exists");

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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
