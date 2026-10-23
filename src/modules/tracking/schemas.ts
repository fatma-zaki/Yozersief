/**
 * Shared Zod inputs for customer tracking (form + server action).
 * Phone normalisation matches order creation (`normalizeEgyptianMobile`).
 */
import { z } from "zod";
import { normalizeOrderRef } from "@/lib/ids";
import { normalizeEgyptianMobile } from "@/lib/phone";
import { ar } from "@/i18n/ar";

export const trackingLookupSchema = z.object({
  ref: z
    .string()
    .trim()
    .min(1, ar.tracking.refRequired)
    .transform((value, ctx) => {
      const ref = normalizeOrderRef(value);
      if (!ref) {
        ctx.addIssue({ code: "custom", message: ar.tracking.refInvalid });
        return z.NEVER;
      }
      return ref;
    }),
  phone: z
    .string()
    .trim()
    .min(1, ar.tracking.phoneRequired)
    .transform((value, ctx) => {
      const phone = normalizeEgyptianMobile(value);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: ar.errors.invalidPhone });
        return z.NEVER;
      }
      return phone;
    }),
});

export type TrackingLookupInput = z.infer<typeof trackingLookupSchema>;
export type TrackingLookupRaw = z.input<typeof trackingLookupSchema>;
