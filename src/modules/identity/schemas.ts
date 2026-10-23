import { z } from "zod";
import { ar } from "@/i18n/ar";
import { normalizeEgyptianMobile } from "@/lib/phone";
import { ROLE_KEYS } from "@/lib/rbac";

/** Egyptian mobile, normalised (Arabic digits, +20…) before validation. */
export const egyptianMobile = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const phone = normalizeEgyptianMobile(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: ar.errors.invalidPhone });
      return z.NEVER;
    }
    return phone;
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "اكتب الإيميل أو رقم الموبايل"),
  password: z.string().min(1, "اكتب كلمة السر"),
});
export type LoginInput = z.input<typeof loginSchema>;

export const twoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "الكود 6 أرقام"),
  trustDevice: z.boolean().default(false),
});

export const inviteSchema = z.object({
  contact: z
    .string()
    .trim()
    .min(1, "اكتب موبايل أو إيميل العضو")
    .transform((v, ctx) => {
      if (v.includes("@")) {
        const email = z.email().safeParse(v.toLowerCase());
        if (email.success) return { email: email.data };
        ctx.addIssue({ code: "custom", message: "الإيميل مش مظبوط" });
        return z.NEVER;
      }
      const phone = normalizeEgyptianMobile(v);
      if (phone) return { phone };
      ctx.addIssue({ code: "custom", message: ar.errors.invalidPhone });
      return z.NEVER;
    }),
  roleKey: z.enum(ROLE_KEYS).refine((r) => r !== "admin", "مينفعش تدعو مدير تاني من هنا"),
});
export type InviteInput = z.input<typeof inviteSchema>;

const password = z
  .string()
  .min(10, "كلمة السر لازم تكون 10 حروف على الأقل")
  .max(128, "كلمة السر طويلة زيادة");

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(20),
    name: z.string().trim().min(2, "اكتب اسمك"),
    phone: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : undefined))
      .pipe(z.email("الإيميل مش مظبوط").optional()),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمتين السر مش زي بعض",
  });
export type AcceptInvitationInput = z.input<typeof acceptInvitationSchema>;
