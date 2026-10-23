import "server-only";
import { TwoFactorRequiredError, UnauthorizedError } from "@/lib/errors";
import type { StaffContext } from "@/lib/rbac";

/**
 * Resolves a staff actor for Server Actions / route handlers.
 *
 * - `protected`: session + global 2FA enrollment when `security.two_factor.enforced`.
 * - `two_factor_setup`: session only — solely for enable/confirm 2FA enrollment actions.
 *
 * Incomplete login 2FA challenges never produce a StaffContext (Better Auth withholds the
 * session until TOTP succeeds), so they surface here as UnauthorizedError.
 */
export async function resolveStaffForAction(
  staff: StaffContext | null,
  mode: "protected" | "two_factor_setup",
  deps: { isTwoFactorEnforced?: () => Promise<boolean> } = {},
): Promise<StaffContext> {
  if (!staff) throw new UnauthorizedError();
  if (mode === "two_factor_setup") return staff;
  await assertTwoFactorEnrollment(staff, deps);
  return staff;
}

/** Throws when global 2FA is enforced and this staff member has not enrolled. */
export async function assertTwoFactorEnrollment(
  staff: StaffContext,
  deps: { isTwoFactorEnforced?: () => Promise<boolean> } = {},
): Promise<void> {
  if (staff.twoFactorEnabled) return;
  const isEnforced =
    deps.isTwoFactorEnforced ??
    (async () => {
      const { getSetting } = await import("@/modules/content");
      return (await getSetting("security.two_factor")).enforced;
    });
  if (await isEnforced()) throw new TwoFactorRequiredError();
}
