import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import {
  defaultPermissionsFor,
  PERMISSIONS,
  ROLES,
  type Permission,
  type RoleKey,
  type StaffContext,
} from "@/lib/rbac";
import { createTestDb, type TestDb } from "./helpers/db";

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock("@/env", () => ({
  env: { APP_URL: "https://youzersef.test", TOKEN_HASH_SECRET: "t".repeat(32) },
}));
// Outside Next there is no cache scope; role access falls through to the database.
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));

const { getRoleAccess, getRoleMatrix, setMemberRole, setMemberStatus, setRolePermission } =
  await import("@/modules/identity");

let db: TestDb;
let close: () => Promise<void>;
const roleId = {} as Record<RoleKey, number>;
const user = {} as Record<"admin" | "admin2" | "desk" | "design", string>;

const ctx = (id: string, roleKey: RoleKey, extra: Permission[] = []): StaffContext => ({
  id,
  name: roleKey,
  roleKey,
  sessionId: "s",
  twoFactorEnabled: false,
  permissions: new Set([...defaultPermissionsFor(roleKey), ...extra]),
});
let admin: StaffContext;

async function deskHas(permission: Permission) {
  const [row] = await db
    .select()
    .from(schema.rolePermissions)
    .innerJoin(schema.permissions, eq(schema.permissions.id, schema.rolePermissions.permissionId))
    .where(
      and(eq(schema.rolePermissions.roleId, roleId.desk), eq(schema.permissions.key, permission)),
    );
  return Boolean(row);
}

async function staffRow(id: string) {
  const [row] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.id, id));
  return row!;
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;
  for (const r of await db
    .insert(schema.roles)
    .values([...ROLES])
    .returning())
    roleId[r.key as RoleKey] = r.id;
  const perms = await db
    .insert(schema.permissions)
    .values(PERMISSIONS.map((p) => ({ key: p.key, labelAr: p.labelAr, groupKey: p.groupKey })))
    .returning();
  const permId = new Map(perms.map((p) => [p.key, p.id]));
  for (const role of ROLES) {
    const values = defaultPermissionsFor(role.key).map((k) => ({
      roleId: roleId[role.key],
      permissionId: permId.get(k)!,
    }));
    await db.insert(schema.rolePermissions).values(values);
  }
  const people = [
    ["admin", "admin", "01000000001"],
    ["admin2", "admin", "01000000002"],
    ["desk", "desk", "01000000003"],
    ["design", "design", "01000000004"],
  ] as const;
  for (const [name, role, phone] of people) {
    const [row] = await db
      .insert(schema.staffUsers)
      .values({
        name,
        phone,
        email: `${name}@x.invalid`,
        roleId: roleId[role],
        status: "active",
      })
      .returning();
    user[name] = row!.id;
  }
  admin = ctx(user.admin, "admin");
});

afterAll(() => close());

describe("role matrix", () => {
  it("writes the admin's toggles to role_permissions and the session reads them", async () => {
    expect(await deskHas("orders.view")).toBe(true);

    await setRolePermission(admin, { roleKey: "desk", permission: "orders.view", granted: false });
    expect(await deskHas("orders.view")).toBe(false);
    expect((await getRoleAccess(roleId.desk))?.permissions).not.toContain("orders.view");
    expect((await getRoleMatrix(admin)).desk).not.toContain("orders.view");

    await setRolePermission(admin, { roleKey: "desk", permission: "traffic.view", granted: true });
    expect(await deskHas("traffic.view")).toBe(true);
    expect((await getRoleAccess(roleId.desk))?.permissions).toContain("traffic.view");

    const logs = await db
      .select({ action: schema.activityLogs.action, meta: schema.activityLogs.meta })
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.entityType, "role"));
    expect(logs).toEqual([
      {
        action: "accounts.permission_revoked",
        meta: { role: "desk", permission: "orders.view" },
      },
      { action: "accounts.permission_granted", meta: { role: "desk", permission: "traffic.view" } },
    ]);
  });

  it("is idempotent: granting twice or revoking a missing cell does not fail", async () => {
    await setRolePermission(admin, { roleKey: "desk", permission: "traffic.view", granted: true });
    await setRolePermission(admin, { roleKey: "desk", permission: "orders.view", granted: false });
    expect(await deskHas("traffic.view")).toBe(true);
    expect(await deskHas("orders.view")).toBe(false);
  });

  it("refuses the admin row and non-admin editors", async () => {
    await expect(
      setRolePermission(admin, { roleKey: "admin", permission: "orders.view", granted: false }),
    ).rejects.toMatchObject({ code: "validation" });
    const manager = ctx(user.desk, "desk", ["accounts.manage"]);
    await expect(
      setRolePermission(manager, { roleKey: "desk", permission: "orders.approve", granted: true }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      setRolePermission(ctx(user.design, "design"), {
        roleKey: "desk",
        permission: "orders.approve",
        granted: true,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(await deskHas("orders.approve")).toBe(false);
  });
});

describe("member role", () => {
  it("moves a member to another role in the database", async () => {
    await setMemberRole(admin, { userId: user.design, roleKey: "prod" });
    expect((await staffRow(user.design)).roleId).toBe(roleId.prod);
    await setMemberRole(admin, { userId: user.design, roleKey: "design" });
    expect((await staffRow(user.design)).roleId).toBe(roleId.design);
  });

  it("keeps admin promotion to the admin and blocks changing your own role", async () => {
    const manager = ctx(user.desk, "desk", ["accounts.manage"]);
    await expect(
      setMemberRole(manager, { userId: user.design, roleKey: "admin" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      setMemberRole(manager, { userId: user.admin2, roleKey: "desk" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      setMemberRole(admin, { userId: user.admin, roleKey: "desk" }),
    ).rejects.toMatchObject({ code: "validation" });
    expect((await staffRow(user.admin2)).roleId).toBe(roleId.admin);
  });
});

describe("pausing", () => {
  it("lets the admin pause any other account, including another admin, and ends its sessions", async () => {
    await db.insert(schema.staffSessions).values({
      userId: user.admin2,
      deviceLabel: "Chrome",
      token: "tok-admin2",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await setMemberStatus(admin, { userId: user.admin2, status: "paused" });
    expect((await staffRow(user.admin2)).status).toBe("paused");
    const sessions = await db
      .select()
      .from(schema.staffSessions)
      .where(eq(schema.staffSessions.userId, user.admin2));
    expect(sessions).toHaveLength(0);

    await setMemberStatus(admin, { userId: user.desk, status: "paused" });
    expect((await staffRow(user.desk)).status).toBe("paused");
    await setMemberStatus(admin, { userId: user.desk, status: "active" });
    expect((await staffRow(user.desk)).status).toBe("active");
  });

  it("refuses pausing yourself, and a non-admin pausing an admin", async () => {
    await expect(
      setMemberStatus(admin, { userId: user.admin, status: "paused" }),
    ).rejects.toMatchObject({ code: "validation" });
    const manager = ctx(user.desk, "desk", ["accounts.manage"]);
    await expect(
      setMemberStatus(manager, { userId: user.admin, status: "paused" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect((await staffRow(user.admin)).status).toBe("active");
  });
});
