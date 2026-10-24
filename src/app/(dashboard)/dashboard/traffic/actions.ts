"use server";

import { actionError, actionOk, type ActionResult } from "@/lib/action";
import { requirePermission } from "@/lib/auth/session";
import { getLiveVisitors } from "@/modules/content";

/** Traffic → «زائر على الموقع الآن», polled while the page is open. */
export async function liveVisitorsAction(): Promise<ActionResult<number>> {
  try {
    const staff = await requirePermission("traffic.view");
    return actionOk(await getLiveVisitors(staff));
  } catch (error) {
    return actionError(error);
  }
}
