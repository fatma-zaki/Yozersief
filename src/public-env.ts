import { z } from "zod";

/**
 * Variables exposed to the browser. Next inlines NEXT_PUBLIC_* at build time,
 * so each one must be read by its literal name.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^20\d{10}$/)
    .default("201116891025"),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined,
});
