import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at boot (instrumentation.ts imports this module).
 * Missing or invalid variables throw immediately with a list of what is wrong.
 * Every variable is documented in .env.example.
 */
const booleanString = z
  .enum(["true", "false", "1", "0"])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),

  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: z.url().optional(),

  BETTER_AUTH_SECRET: z.string().min(32),
  TOKEN_HASH_SECRET: z.string().min(32),
  TRACKING_COOKIE_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),

  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  MESSAGING_PROVIDER: z.enum(["manual", "whatsapp_cloud"]).default("manual"),
  WHATSAPP_CLOUD_TOKEN: z.string().optional(),
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: z.string().optional(),

  ANALYTICS_PROVIDER: z.enum(["none", "plausible", "ga4"]).default("none"),

  SENTRY_DSN: z.url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),

  RATE_LIMIT_DISABLED: booleanString,
});

export type ServerEnv = z.infer<typeof serverSchema>;

function parseEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}\nSee .env.example.`);
  }
  const env = result.data;
  if (env.NODE_ENV === "production" && !env.UPSTASH_REDIS_REST_URL && !env.RATE_LIMIT_DISABLED) {
    throw new Error("UPSTASH_REDIS_REST_URL is required in production (rate limiting).");
  }
  return env;
}

export const env = parseEnv();
