import * as Sentry from "@sentry/nextjs";
import { parseEnv } from "./env-schema";
import { scrub } from "./lib/logger";

/**
 * Runs once per server instance at boot (brief A2, A6.9):
 * 1. Fail fast on missing or invalid environment variables.
 * 2. Start Sentry, with the release tied to the Vercel deployment and personal data scrubbed.
 */
export async function register() {
  parseEnv();

  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      return scrub(event) as typeof event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
