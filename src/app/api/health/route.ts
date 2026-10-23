import { connection, NextResponse } from "next/server";
import { pingDb } from "@/db/client";
import { logger } from "@/lib/logger";

/** Liveness + DB check (brief A6.9). Returns the deployed commit as the version. */
export async function GET() {
  await connection();
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? "dev";
  const started = Date.now();
  try {
    await pingDb();
    return NextResponse.json({ ok: true, version, db: { ok: true, ms: Date.now() - started } });
  } catch (error) {
    logger.error("health check: database unreachable", { error });
    return NextResponse.json({ ok: false, version, db: { ok: false } }, { status: 503 });
  }
}
