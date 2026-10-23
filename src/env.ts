import "server-only";
import { parseEnv } from "./env-schema";

/** Validated server environment. See src/env-schema.ts and .env.example. */
export const env = parseEnv();
export type { ServerEnv } from "./env-schema";
