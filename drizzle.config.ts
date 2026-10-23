import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrations run on the direct connection; the pooler can break DDL in transactions.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(url ? { dbCredentials: { url } } : {}),
});
