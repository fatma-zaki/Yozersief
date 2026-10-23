/**
 * Applies committed SQL migrations from ./drizzle on the direct (unpooled) connection.
 * Usage: pnpm db:migrate
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is required. See .env.example.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });

migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" })
  .then(() => console.log("Migrations applied."))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
