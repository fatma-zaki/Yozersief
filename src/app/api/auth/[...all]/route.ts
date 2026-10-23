import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { enforceAuthApiRateLimit } from "@/lib/auth/auth-route-ratelimit";
import { isAppError, toAppError } from "@/lib/errors";

/**
 * Better Auth catch-all. Sensitive paths are rate-limited with our Upstash policy
 * before the handler runs (see `auth-route-ratelimit.ts`). Login Server Actions use
 * `auth.api` and never pass through this route, so they keep their own limits.
 */
const { GET: authGet, POST: authPost } = toNextJsHandler(auth);

async function withAuthRateLimit(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  try {
    await enforceAuthApiRateLimit(request);
    return await handler(request);
  } catch (error) {
    if (isAppError(error) && error.code === "rate_limited") {
      return NextResponse.json({ error: error.userMessage }, { status: 429 });
    }
    // Unexpected errors from our wrapper only; Better Auth handles its own failures.
    const appError = toAppError(error);
    return NextResponse.json({ error: appError.userMessage }, { status: appError.httpStatus });
  }
}

export async function GET(request: Request) {
  return withAuthRateLimit(request, (req) => authGet(req));
}

export async function POST(request: Request) {
  return withAuthRateLimit(request, (req) => authPost(req));
}
