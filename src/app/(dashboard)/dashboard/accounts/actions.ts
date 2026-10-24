"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionOk, type ActionResult } from "@/lib/action";
import { forgetRecentSessions, requirePermission } from "@/lib/auth/session";
import { PERMISSION_KEYS, ROLE_KEYS, type Permission } from "@/lib/rbac";
import {
  invalidateRoleAccess,
  setMemberRole,
  setMemberStatus,
  setRolePermission,
} from "@/modules/identity";

const memberStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "paused"]),
});

/** Accounts → «إيقاف» / «تفعيل» a member (brief A6.2). */
export async function setMemberStatusAction(
  input: z.input<typeof memberStatusSchema>,
): Promise<ActionResult> {
  try {
    const parsed = memberStatusSchema.parse(input);
    const staff = await requirePermission("accounts.manage");
    await setMemberStatus(staff, parsed);
    // A paused member must lose access now, not when the session cache expires.
    forgetRecentSessions();
    revalidatePath("/dashboard/accounts");
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}

const memberRoleSchema = z.object({
  userId: z.string().min(1),
  roleKey: z.enum(ROLE_KEYS),
});

/** Accounts → a member's «الدور» select (brief B9). */
export async function setMemberRoleAction(
  input: z.input<typeof memberRoleSchema>,
): Promise<ActionResult> {
  try {
    const parsed = memberRoleSchema.parse(input);
    const staff = await requirePermission("accounts.manage");
    await setMemberRole(staff, parsed);
    // The member's cached session still holds the old role's permissions.
    forgetRecentSessions();
    revalidatePath("/dashboard/accounts");
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}

const rolePermissionSchema = z.object({
  roleKey: z.enum(ROLE_KEYS),
  permission: z.enum(PERMISSION_KEYS as [Permission, ...Permission[]]),
  granted: z.boolean(),
});

/** Accounts → one cell of «الأدوار والصلاحيات» (brief A6.3, B9). */
export async function setRolePermissionAction(
  input: z.input<typeof rolePermissionSchema>,
): Promise<ActionResult> {
  try {
    const parsed = rolePermissionSchema.parse(input);
    const staff = await requirePermission("accounts.manage");
    await setRolePermission(staff, parsed);
    // Drop the cached permission sets so every member of the role gets the change now.
    invalidateRoleAccess();
    forgetRecentSessions();
    revalidatePath("/dashboard", "layout");
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
