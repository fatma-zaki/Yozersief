import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { defaultPermissionsFor, type StaffContext } from "@/lib/rbac";
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
// Outside Next there is no cache scope; settings fall through to the database.
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));

const { acceptInvitation, inviteStaff, previewInvitation } = await import("@/modules/identity");

let db: TestDb;
let close: () => Promise<void>;
let admin: StaffContext;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  holder.db = db;
  const roles = await db
    .insert(schema.roles)
    .values([
      { key: "admin", nameAr: "مدير" },
      { key: "desk", nameAr: "استقبال طلبات" },
    ])
    .returning();
  const [a] = await db
    .insert(schema.staffUsers)
    .values({
      name: "مدير",
      phone: "01000000099",
      email: "admin@x.invalid",
      roleId: roles[0]!.id,
      status: "active",
    })
    .returning();
  admin = {
    id: a!.id,
    name: "مدير",
    roleKey: "admin",
    sessionId: "s",
    twoFactorEnabled: false,
    permissions: new Set(defaultPermissionsFor("admin")),
  };
});

afterAll(() => close());

const tokenFrom = (url: string) => url.split("/login/invite/")[1]!;

describe("invitations", () => {
  it("lets the admin invite a desk member who then sets a password once", async () => {
    const invited = await inviteStaff(admin, { contact: "٠١٠١٢٣٤٥٦٧٨", roleKey: "desk" });
    expect(invited.ok).toBe(true);
    if (!invited.ok) return;
    const token = tokenFrom(invited.value.inviteUrl);

    // Only the hash is stored.
    const [row] = await db.select().from(schema.invitations);
    expect(row?.contact).toBe("01012345678");
    expect(row?.tokenHash).not.toContain(token);
    expect(await previewInvitation(token)).toMatchObject({ contactKind: "phone" });

    const accepted = await acceptInvitation({
      token,
      name: "سارة",
      password: "desk-password-123",
      confirmPassword: "desk-password-123",
    });
    expect(accepted.ok).toBe(true);

    const [user] = await db
      .select()
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.phone, "01012345678"));
    expect(user).toMatchObject({ status: "active", email: "01012345678@phone.youzersef.invalid" });
    const [account] = await db
      .select()
      .from(schema.staffAccounts)
      .where(eq(schema.staffAccounts.userId, user!.id));
    expect(account?.providerId).toBe("credential");
    expect(await verifyPassword({ hash: account!.password!, password: "desk-password-123" })).toBe(
      true,
    );

    // Single use.
    expect(await previewInvitation(token)).toBeNull();
    const again = await acceptInvitation({
      token,
      name: "x",
      password: "another-pass-123",
      confirmPassword: "another-pass-123",
    });
    expect(again.ok).toBe(false);
  });

  it("refuses non-admins, admin invites and duplicates", async () => {
    const desk: StaffContext = {
      ...admin,
      roleKey: "desk",
      permissions: new Set(defaultPermissionsFor("desk")),
    };
    await expect(inviteStaff(desk, { contact: "01112345678", roleKey: "desk" })).rejects.toThrow();
    expect((await inviteStaff(admin, { contact: "01112345678", roleKey: "admin" })).ok).toBe(false);
    expect((await inviteStaff(admin, { contact: "01012345678", roleKey: "desk" })).ok).toBe(false);
  });
});
