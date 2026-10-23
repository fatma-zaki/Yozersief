import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber, twoFactor } from "better-auth/plugins";
import { db } from "@/db/client";
import {
  authVerifications,
  staffAccounts,
  staffSessions,
  staffTwoFactors,
  staffUsers,
} from "@/db/schema";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { EGYPT_MOBILE_REGEX } from "@/lib/phone";
import { onStaffSessionCreated, prepareStaffSession } from "@/modules/identity";

/**
 * Staff authentication (brief A6.2, ADR-0003). Customers never have accounts.
 * - Sign-up is disabled: staff join only through an admin invitation.
 * - Better Auth's user/session models are mapped onto staff_users/staff_sessions.
 */
export const auth = betterAuth({
  appName: "Youzersef",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: staffUsers,
      session: staffSessions,
      account: staffAccounts,
      verification: authVerifications,
      twoFactor: staffTwoFactors,
    },
  }),
  advanced: {
    cookiePrefix: "yz",
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      roleId: { type: "number", required: true, input: false },
      status: { type: "string", required: true, input: false },
      lastActiveAt: { type: "date", required: false, input: false },
    },
  },
  session: {
    fields: { updatedAt: "lastSeenAt" },
    additionalFields: {
      deviceLabel: { type: "string", required: false, input: false },
      city: { type: "string", required: false, input: false },
      revokedAt: { type: "date", required: false, input: false },
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        // Paused or pending staff cannot sign in; device label and city are filled here.
        before: async (session, ctx) =>
          prepareStaffSession(session, ctx?.headers ?? ctx?.request?.headers),
        after: async (session) => onStaffSessionCreated(session),
      },
    },
  },
  plugins: [
    phoneNumber({
      schema: { user: { fields: { phoneNumber: "phone", phoneNumberVerified: "phoneVerified" } } },
      phoneNumberValidator: (value) => EGYPT_MOBILE_REGEX.test(value),
      // Phone OTP sign-in is not used; staff sign in with phone + password.
      sendOTP: () => {
        logger.warn("phone OTP requested but not enabled for staff");
      },
    }),
    twoFactor({ issuer: "Youzersef" }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
