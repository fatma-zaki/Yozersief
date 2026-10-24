import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;

/**
 * Runtime client on the pooled connection string (Neon pooler in production).
 * Migrations use the direct (unpooled) URL instead; see scripts/migrate.ts.
 * The pool is cached on globalThis so dev hot reloads don't leak connections.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    // Dashboard screens fan out ~10 queries at once; fewer connections queue them in waves.
    max: 10,
    // Opening a TLS connection to Neon costs several round trips (~1s from Egypt), so keep warm
    // connections between clicks. The Neon pooler handles many idle clients cheaply.
    idleTimeoutMillis: 5 * 60_000,
  });

if (env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db: Db = drizzle({ client: pool, schema });

export async function pingDb(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("select 1");
    return true;
  } finally {
    client.release();
  }
}
