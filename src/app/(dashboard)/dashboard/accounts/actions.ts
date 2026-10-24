"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionOk, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import { setMemberStatus } from "@/modules/identity";

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
    revalidatePath("/dashboard/accounts");
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
