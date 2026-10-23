import { generateOrderRef } from "@/lib/ids";
import type { RequestDraft } from "../../domain/request";

export type SubmitResult = { ok: true; ref: string } | { ok: false; error: string };

/**
 * Demo submission (the header shows «وضع تجريبي»). The front end is complete up to here:
 * `draft` has passed every readiness check.
 *
 * Backend wiring goes here: replace the body with a call to a server action
 * (Zod parse → rate limit → `submitOrder` use case → { ref }), upload the picked files
 * through /api/uploads/token, and set DEMO_MODE to false.
 */
export const DEMO_MODE = true;

export async function submitRequest(draft: RequestDraft): Promise<SubmitResult> {
  void draft;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { ok: true, ref: generateOrderRef() };
}
