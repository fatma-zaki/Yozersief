import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { logger } from "./logger";
import { safeEqual } from "./tokens";

/**
 * Wraps a Vercel Cron route: checks `Authorization: Bearer $CRON_SECRET`, runs the job,
 * logs the outcome as one JSON line, and never leaks error details.
 */
export function cronRoute(name: string, job: () => Promise<Record<string, unknown>>) {
  return async function GET(request: Request) {
    const header = request.headers.get("authorization") ?? "";
    if (!safeEqual(header, `Bearer ${env.CRON_SECRET}`)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const started = Date.now();
    try {
      const result = await job();
      logger.info("cron finished", { cron: name, ms: Date.now() - started, ...result });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      logger.error("cron failed", { cron: name, ms: Date.now() - started, error });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  };
}
