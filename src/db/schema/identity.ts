import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, timestamptz } from "./_columns";

export const staffStatus = pgEnum("staff_status", ["active", "pending", "paused"]);
export const requestStatus = pgEnum("request_status", ["pending", "granted", "denied"]);

/** admin · desk · design · prod · delivery */
export const roles = pgTable("roles", {
  id: smallint("id").primaryKey().generatedByDefaultAsIdentity(),
  key: text("key").notNull().unique(),
  nameAr: text("name_ar").notNull(),
});

export const permissions = pgTable("permissions", {
  id: smallint("id").primaryKey().generatedByDefaultAsIdentity(),
  key: text("key").notNull().unique(),
  labelAr: text("label_ar").notNull(),
  groupKey: text("group_key").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: smallint("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: smallint("permission_id")
      .notNull()
      .references(() => permissions.id),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

/**
 * Staff members. Also Better Auth's `user` model (ADR-0003): `email`, `email_verified`, `image`,
 * `phone_verified` and `updated_at` exist for Better Auth. Phone-only staff get a placeholder
 * email on the reserved `.invalid` domain because Better Auth requires one.
 */
export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull().unique(),
    email: text("email").notNull().unique(),
    roleId: smallint("role_id")
      .notNull()
      .references(() => roles.id),
    status: staffStatus("status").notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    lastActiveAt: timestamptz("last_active_at"),
    createdAt: createdAt(),
    // Better Auth fields
    emailVerified: boolean("email_verified").notNull().default(false),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    image: text("image"),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("staff_users_role_id_idx").on(t.roleId)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contact: text("contact").notNull(),
    roleId: smallint("role_id")
      .notNull()
      .references(() => roles.id),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => staffUsers.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    acceptedAt: timestamptz("accepted_at"),
  },
  (t) => [
    index("invitations_role_id_idx").on(t.roleId),
    index("invitations_invited_by_idx").on(t.invitedBy),
  ],
);

/**
 * Signed-in devices. Also Better Auth's `session` model (ADR-0003): `token`, `expires_at`,
 * `ip_address` and `user_agent` exist for Better Auth; `last_seen_at` is its `updatedAt`.
 */
export const staffSessions = pgTable(
  "staff_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => staffUsers.id),
    deviceLabel: text("device_label").notNull(),
    city: text("city"),
    createdAt: createdAt(),
    lastSeenAt: timestamptz("last_seen_at").notNull().defaultNow(),
    revokedAt: timestamptz("revoked_at"),
    // Better Auth fields
    token: text("token").notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("staff_sessions_user_id_idx").on(t.userId)],
);

export const permissionRequests = pgTable(
  "permission_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => staffUsers.id),
    permissionId: smallint("permission_id")
      .notNull()
      .references(() => permissions.id),
    status: requestStatus("status").notNull(),
    decidedBy: uuid("decided_by").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    decidedAt: timestamptz("decided_at"),
  },
  (t) => [
    index("permission_requests_user_id_idx").on(t.userId),
    index("permission_requests_permission_id_idx").on(t.permissionId),
    index("permission_requests_decided_by_idx").on(t.decidedBy),
  ],
);

// ---------------------------------------------------------------------------
// Better Auth support tables (not in docs/schema.sql; see ADR-0003)
// ---------------------------------------------------------------------------

/** Credentials (password hash) per staff user. Better Auth `account` model. */
export const staffAccounts = pgTable(
  "staff_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("staff_accounts_user_id_idx").on(t.userId)],
);

/** Short-lived auth verification values (2FA OTPs, resets). Better Auth `verification` model. */
export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("auth_verifications_identifier_idx").on(t.identifier)],
);

/** TOTP secret and backup codes (encrypted by Better Auth). `twoFactor` plugin model. */
export const staffTwoFactors = pgTable(
  "staff_two_factors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: smallint("failed_verification_count").notNull().default(0),
    lockedUntil: timestamptz("locked_until"),
  },
  (t) => [
    index("staff_two_factors_user_id_idx").on(t.userId),
    index("staff_two_factors_secret_idx").on(t.secret),
  ],
);
