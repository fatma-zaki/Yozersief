import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { assertCan, can, type StaffContext } from "./can";
import { defaultPermissionsFor, PERMISSIONS, type Permission } from "./permissions";
import { DASHBOARD_SECTIONS, sectionForPath } from "./routes";

const staff = (roleKey: StaffContext["roleKey"], permissions: Permission[]): StaffContext => ({
  id: "u1",
  name: "x",
  roleKey,
  sessionId: "s1",
  twoFactorEnabled: false,
  permissions: new Set(permissions),
});

describe("B9 default matrix", () => {
  it("has 19 permissions and gives admin all of them", () => {
    expect(PERMISSIONS).toHaveLength(19);
    expect(defaultPermissionsFor("admin")).toHaveLength(19);
  });

  it.each([
    [
      "desk",
      [
        "orders.view",
        "customers.view_phone",
        "orders.request_info",
        "quotes.draft",
        "orders.cancel",
        "messages.send",
      ],
    ],
    ["design", ["orders.view", "mockups.manage", "gallery.manage", "content.manage"]],
    ["prod", ["orders.view", "production.update"]],
    [
      "delivery",
      [
        "orders.view",
        "customers.view_phone",
        "messages.send",
        "payments.record",
        "delivery.handover",
      ],
    ],
  ] as const)("matches the brief for %s", (role, expected) => {
    expect(defaultPermissionsFor(role).sort()).toEqual([...expected].sort());
  });

  it("keeps final approval, payment confirmation and accounts admin-only", () => {
    for (const role of ["desk", "design", "prod", "delivery"] as const) {
      const perms = defaultPermissionsFor(role);
      expect(perms).not.toContain("orders.approve");
      expect(perms).not.toContain("payments.confirm");
      expect(perms).not.toContain("accounts.manage");
    }
  });

  it("hides prices and customer contact from production", () => {
    expect(defaultPermissionsFor("prod")).not.toContain("customers.view_phone");
  });
});

describe("can / assertCan", () => {
  it("lets admin do anything even without explicit rows", () => {
    expect(can(staff("admin", []), "accounts.manage")).toBe(true);
  });

  it("checks the permission set for other roles", () => {
    const desk = staff("desk", defaultPermissionsFor("desk"));
    expect(can(desk, "quotes.draft")).toBe(true);
    expect(can(desk, "accounts.manage")).toBe(false);
    expect(() => assertCan(desk, "accounts.manage")).toThrow(ForbiddenError);
  });
});

describe("sectionForPath", () => {
  it("maps nested paths to their section", () => {
    expect(sectionForPath("/dashboard/accounts")?.permission).toBe("accounts.manage");
    expect(sectionForPath("/dashboard/orders/123")?.permission).toBe("orders.view");
    expect(sectionForPath("/dashboard")?.permission).toBeNull();
    expect(sectionForPath("/dashboard/unknown")?.href).toBe("/dashboard");
  });

  it("only references real permissions", () => {
    const keys = new Set<string>(PERMISSIONS.map((p) => p.key));
    for (const s of DASHBOARD_SECTIONS) if (s.permission) expect(keys.has(s.permission)).toBe(true);
  });
});
