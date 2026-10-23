"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ar } from "@/i18n/ar";
import { actionError, actionOk, type ActionResult } from "@/lib/action";
import { auth } from "@/lib/auth/auth";
import { normalizeEgyptianMobile } from "@/lib/phone";
import { clientIp, enforceRateLimit } from "@/lib/ratelimit";
import {
  acceptInvitation,
  loginSchema,
  twoFactorSchema,
  type AcceptInvitationInput,
  type LoginInput,
} from "@/modules/identity";

const invalid = (): ActionResult<never> => ({ ok: false, error: ar.auth.invalidCredentials });

/** Staff sign-in with email or Egyptian mobile + password (brief A6.2). */
export async function signInAction(
  input: LoginInput,
): Promise<ActionResult<{ twoFactor: boolean }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const { identifier, password } = parsed.data;
  const h = await headers();

  try {
    await enforceRateLimit("auth.login", `${clientIp(h)}:${identifier.toLowerCase()}`);
    let response: unknown;
    if (identifier.includes("@")) {
      response = await auth.api.signInEmail({
        body: { email: identifier.toLowerCase(), password },
        headers: h,
      });
    } else {
      const phone = normalizeEgyptianMobile(identifier);
      if (!phone) return invalid();
      response = await auth.api.signInPhoneNumber({
        body: { phoneNumber: phone, password },
        headers: h,
      });
    }
    const twoFactor = Boolean((response as { twoFactorRedirect?: boolean }).twoFactorRedirect);
    return actionOk({ twoFactor });
  } catch (error) {
    // Wrong password, unknown user and paused account all look the same from outside.
    if (error instanceof APIError) return invalid();
    return actionError(error);
  }
}

export async function verifyTwoFactorAction(input: {
  code: string;
  trustDevice: boolean;
}): Promise<ActionResult> {
  const parsed = twoFactorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "الكود 6 أرقام" };
  const h = await headers();
  try {
    await enforceRateLimit("auth.login", `${clientIp(h)}:2fa`);
    await auth.api.verifyTOTP({ body: parsed.data, headers: h });
    return actionOk(undefined);
  } catch (error) {
    if (error instanceof APIError)
      return { ok: false, error: "الكود مش صحيح أو انتهى. جرّب تاني." };
    return actionError(error);
  }
}

/** Activates an invited account, then signs the new member in. */
export async function acceptInvitationAction(
  input: AcceptInvitationInput,
): Promise<ActionResult<{ signedIn: boolean }>> {
  try {
    const result = await acceptInvitation(input);
    if (!result.ok) return actionError(result.error);
    try {
      await auth.api.signInEmail({
        body: { email: result.value.email, password: input.password },
        headers: await headers(),
      });
      return actionOk({ signedIn: true });
    } catch {
      return actionOk({ signedIn: false });
    }
  } catch (error) {
    return actionError(error);
  }
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
