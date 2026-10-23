import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import {
  invitations,
  permissionRequests,
  permissions,
  rolePermissions,
  roles,
  staffAccounts,
  staffSessions,
  staffUsers,
} from "@/db/schema";
import type { DbOrTx } from "@/db/tx";

export async function findStaffStatus(userId: string) {
  const [row] = await db
    .select({ status: staffUsers.status })
    .from(staffUsers)
    .where(eq(staffUsers.id, userId));
  return row?.status ?? null;
}

export async function findRoleWithPermissions(roleId: number) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) return null;
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  return { key: role.key, nameAr: role.nameAr, permissionKeys: rows.map((r) => r.key) };
}

export async function findRoleByKey(key: string, tx: DbOrTx = db) {
  const [role] = await tx.select().from(roles).where(eq(roles.key, key));
  return role ?? null;
}

export async function listRoles() {
  return db.select().from(roles).orderBy(roles.id);
}

export async function hasOtherSessionOnDevice(
  userId: string,
  deviceLabel: string,
  excludeSessionId: string,
) {
  const [row] = await db
    .select({ id: staffSessions.id })
    .from(staffSessions)
    .where(
      and(
        eq(staffSessions.userId, userId),
        eq(staffSessions.deviceLabel, deviceLabel),
        ne(staffSessions.id, excludeSessionId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function hasAnyEarlierSession(userId: string, excludeSessionId: string) {
  const [row] = await db
    .select({ id: staffSessions.id })
    .from(staffSessions)
    .where(and(eq(staffSessions.userId, userId), ne(staffSessions.id, excludeSessionId)))
    .limit(1);
  return Boolean(row);
}

export async function touchLastActive(userId: string) {
  await db.update(staffUsers).set({ lastActiveAt: new Date() }).where(eq(staffUsers.id, userId));
}

export async function listSessionsForUser(userId: string) {
  return db
    .select({
      id: staffSessions.id,
      deviceLabel: staffSessions.deviceLabel,
      city: staffSessions.city,
      createdAt: staffSessions.createdAt,
      lastSeenAt: staffSessions.lastSeenAt,
    })
    .from(staffSessions)
    .where(and(eq(staffSessions.userId, userId), isNull(staffSessions.revokedAt)))
    .orderBy(desc(staffSessions.lastSeenAt));
}

/** Deleting the row ends the Better Auth session immediately. Returns how many were removed. */
export async function deleteOtherSessions(userId: string, keepSessionId: string, tx: DbOrTx) {
  const removed = await tx
    .delete(staffSessions)
    .where(and(eq(staffSessions.userId, userId), ne(staffSessions.id, keepSessionId)))
    .returning({ id: staffSessions.id });
  return removed.length;
}

export async function deleteAllSessions(userId: string, tx: DbOrTx) {
  await tx.delete(staffSessions).where(eq(staffSessions.userId, userId));
}

export async function findPermissionId(key: string) {
  const [row] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.key, key));
  return row?.id ?? null;
}

export async function findPendingPermissionRequest(userId: string, permissionId: number) {
  const [row] = await db
    .select({ id: permissionRequests.id })
    .from(permissionRequests)
    .where(
      and(
        eq(permissionRequests.userId, userId),
        eq(permissionRequests.permissionId, permissionId),
        eq(permissionRequests.status, "pending"),
      ),
    );
  return row ?? null;
}

export async function insertPermissionRequest(userId: string, permissionId: number, tx: DbOrTx) {
  const [row] = await tx
    .insert(permissionRequests)
    .values({ userId, permissionId, status: "pending" })
    .returning({ id: permissionRequests.id });
  return row!;
}

export async function insertInvitation(
  values: {
    contact: string;
    roleId: number;
    invitedBy: string;
    tokenHash: string;
    expiresAt: Date;
  },
  tx: DbOrTx,
) {
  const [row] = await tx.insert(invitations).values(values).returning({ id: invitations.id });
  return row!;
}

export async function findInvitationByTokenHash(tokenHash: string, tx: DbOrTx = db) {
  const [row] = await tx.select().from(invitations).where(eq(invitations.tokenHash, tokenHash));
  return row ?? null;
}

export async function markInvitationAccepted(id: string, tx: DbOrTx) {
  await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, id));
}

export async function findStaffByContact(
  contact: { phone?: string; email?: string },
  tx: DbOrTx = db,
) {
  if (contact.phone) {
    const [row] = await tx
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(eq(staffUsers.phone, contact.phone));
    if (row) return row;
  }
  if (contact.email) {
    const [row] = await tx
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(eq(staffUsers.email, contact.email));
    if (row) return row;
  }
  return null;
}

export async function insertStaffWithPassword(
  values: { name: string; phone: string; email: string; roleId: number; passwordHash: string },
  tx: DbOrTx,
) {
  const [user] = await tx
    .insert(staffUsers)
    .values({
      name: values.name,
      phone: values.phone,
      email: values.email,
      roleId: values.roleId,
      status: "active",
    })
    .returning({ id: staffUsers.id, email: staffUsers.email });
  await tx.insert(staffAccounts).values({
    userId: user!.id,
    accountId: user!.id,
    providerId: "credential",
    password: values.passwordHash,
  });
  return user!;
}

export async function listStaffMembers() {
  return db
    .select({
      id: staffUsers.id,
      name: staffUsers.name,
      phone: staffUsers.phone,
      email: staffUsers.email,
      status: staffUsers.status,
      roleKey: roles.key,
      roleNameAr: roles.nameAr,
      twoFactorEnabled: staffUsers.twoFactorEnabled,
      lastActiveAt: staffUsers.lastActiveAt,
    })
    .from(staffUsers)
    .innerJoin(roles, eq(roles.id, staffUsers.roleId))
    .orderBy(roles.id, staffUsers.name);
}

export async function findStaffRole(userId: string, tx: DbOrTx) {
  const [row] = await tx
    .select({ id: staffUsers.id, roleKey: roles.key })
    .from(staffUsers)
    .innerJoin(roles, eq(roles.id, staffUsers.roleId))
    .where(eq(staffUsers.id, userId));
  return row ?? null;
}

export async function updateStaffStatus(userId: string, status: "active" | "paused", tx: DbOrTx) {
  await tx
    .update(staffUsers)
    .set({ status, updatedAt: new Date() })
    .where(eq(staffUsers.id, userId));
}
