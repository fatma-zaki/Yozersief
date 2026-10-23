import { describe, expect, it, vi } from "vitest";
import { TwoFactorRequiredError, UnauthorizedError } from "@/lib/errors";
import type { StaffContext } from "@/lib/rbac";
import { assertTwoFactorEnrollment, resolveStaffForAction } from "./session-guards";

const baseStaff = (overrides: Partial<StaffContext> = {}): StaffContext => ({
  id: "staff-1",
  name: "أحمد",
  roleKey: "desk",
  sessionId: "sess-1",
  twoFactorEnabled: false,
  permissions: new Set(["orders.view"]),
  ...overrides,
});

describe("resolveStaffForAction", () => {
  it("rejects missing session (no login / incomplete login 2FA / inactive)", async () => {
    await expect(resolveStaffForAction(null, "protected")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(resolveStaffForAction(null, "two_factor_setup")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects active staff without 2FA when enforcement is on", async () => {
    const staff = baseStaff({ twoFactorEnabled: false });
    await expect(
      resolveStaffForAction(staff, "protected", {
        isTwoFactorEnforced: async () => true,
      }),
    ).rejects.toBeInstanceOf(TwoFactorRequiredError);
  });

  it("allows enrolled staff on protected actions", async () => {
    const staff = baseStaff({ twoFactorEnabled: true });
    await expect(
      resolveStaffForAction(staff, "protected", {
        isTwoFactorEnforced: async () => true,
      }),
    ).resolves.toBe(staff);
  });

  it("allows staff without 2FA when enforcement is off", async () => {
    const staff = baseStaff({ twoFactorEnabled: false });
    await expect(
      resolveStaffForAction(staff, "protected", {
        isTwoFactorEnforced: async () => false,
      }),
    ).resolves.toBe(staff);
  });

  it("allows two_factor_setup mode without enrollment even when enforced", async () => {
    const staff = baseStaff({ twoFactorEnabled: false });
    const isTwoFactorEnforced = vi.fn(async () => true);
    await expect(
      resolveStaffForAction(staff, "two_factor_setup", { isTwoFactorEnforced }),
    ).resolves.toBe(staff);
    expect(isTwoFactorEnforced).not.toHaveBeenCalled();
  });

  it("does not let two_factor_setup mode weaken protected actions", async () => {
    const staff = baseStaff({ twoFactorEnabled: false });
    await expect(
      resolveStaffForAction(staff, "protected", {
        isTwoFactorEnforced: async () => true,
      }),
    ).rejects.toBeInstanceOf(TwoFactorRequiredError);
  });
});

describe("assertTwoFactorEnrollment", () => {
  it("no-ops when already enrolled", async () => {
    const isTwoFactorEnforced = vi.fn(async () => true);
    await expect(
      assertTwoFactorEnrollment(baseStaff({ twoFactorEnabled: true }), {
        isTwoFactorEnforced,
      }),
    ).resolves.toBeUndefined();
    expect(isTwoFactorEnforced).not.toHaveBeenCalled();
  });
});
