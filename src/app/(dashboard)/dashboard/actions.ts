"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { actionError, actionOk, fromResult, type ActionResult } from "@/lib/action";
import { auth } from "@/lib/auth/auth";
import { requirePermission, requireStaff } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/ratelimit";
import { isPermission } from "@/lib/rbac";
import {
  inviteStaff,
  requestAccess,
  signOutOtherDevices,
  type InviteInput,
} from "@/modules/identity";

/** Forbidden page → "request access" (brief A6.3). */
export async function requestAccessAction(
  permission: string,
): Promise<ActionResult<{ status: string }>> {
  try {
    const staff = await requireStaff();
    if (!isPermission(permission)) throw new ValidationError({}, "الصلاحية دي مش موجودة.");
    await enforceRateLimit("access.request", staff.id);
    return fromResult(await requestAccess(staff, permission));
  } catch (error) {
    return actionError(error);
  }
}

export async function inviteStaffAction(
  input: InviteInput,
): Promise<ActionResult<{ inviteUrl: string; expiresAt: string }>> {
  try {
    const staff = await requirePermission("accounts.manage");
    const result = await inviteStaff(staff, input);
    if (!result.ok) return actionError(result.error);
    revalidatePath("/dashboard/accounts");
    return actionOk({
      inviteUrl: result.value.inviteUrl,
      expiresAt: result.value.expiresAt.toISOString(),
    });
  } catch (error) {
    return actionError(error);
  }
}

export async function signOutOtherDevicesAction(): Promise<ActionResult<{ removed: number }>> {
  try {
    const staff = await requireStaff();
    const removed = await signOutOtherDevices(staff);
    revalidatePath("/dashboard/security");
    return actionOk({ removed });
  } catch (error) {
    return actionError(error);
  }
}

/** Step 1 of 2FA setup: returns the otpauth URI and backup codes (needs the password). */
export async function enableTwoFactorAction(
  password: string,
): Promise<ActionResult<{ totpURI: string; backupCodes: string[] }>> {
  try {
    await requireStaff();
    const result = await auth.api.enableTwoFactor({ body: { password }, headers: await headers() });
    if (result.method !== "totp") throw new Error("expected TOTP two-factor setup");
    return actionOk({ totpURI: result.totpURI, backupCodes: result.backupCodes });
  } catch (error) {
    if (error instanceof APIError) return { ok: false, error: "كلمة السر مش صحيحة." };
    return actionError(error);
  }
}

/** Step 2: the first valid code turns 2FA on. */
export async function confirmTwoFactorAction(code: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
    revalidatePath("/dashboard/security");
    return actionOk(undefined);
  } catch (error) {
    if (error instanceof APIError) return { ok: false, error: "الكود مش صحيح. جرّب تاني." };
    return actionError(error);
  }
}
