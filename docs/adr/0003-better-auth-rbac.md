# ADR-0003: Better Auth for staff + table-driven RBAC

- Status: accepted
- Date: 2026-10-23

## Authentication

- Better Auth with the Drizzle adapter. Only staff have accounts; customers never do (ADR-0005).
- Better Auth's `user` and `session` models are **mapped onto the ERD tables** `staff_users` and
  `staff_sessions` (`src/lib/auth/auth.ts`), so the dashboard's session list and Better Auth read
  the same rows. Better Auth's `updatedAt` on sessions is our `last_seen_at`.
- Sign-in: email + password, or Egyptian mobile + password (`phoneNumber` plugin, mapped to
  `staff_users.phone`). Better Auth requires an email per user, so phone-only staff get
  `<phone>@phone.youzersef.invalid`. The `.invalid` TLD can never receive mail, and the UI hides it
  (`identity/domain/staff.ts`).
- Sign-up is disabled. The admin invites by phone or email + role. The invitee sets a password
  through a single-use link: the token is stored as an HMAC hash, and expiry comes from the
  `invitations.expiry_hours` setting (placeholder 72h, pending B13 #3).
- 2FA: the `twoFactor` plugin (TOTP + backup codes). It is optional per user and can be enforced
  globally with `security.two_factor`. When enforced, members without 2FA are redirected to set it up.
- Paused or pending staff are blocked in `session.create.before`. Pausing a user must also delete
  their sessions (`deleteAllSessions`), which revokes them immediately.
- New-device alert: `session.create.after` writes a sensitive `security.new_device` audit row,
  which the team-activity page will surface (`security.new_device_alert` setting).

## Authorisation

- The source of truth is `roles`, `permissions` and `role_permissions`. The seed writes the B9
  matrix from `src/lib/rbac/permissions.ts`, which also derives the typed `Permission` union.
- Admin implicitly has every permission (`can()`), and their row cannot be edited.
- **Enforcement is server-side**:
  - `proxy.ts` is only an optimistic cookie check for `/dashboard/*`.
  - Every page calls `requirePagePermission`, which renders `forbidden.tsx` when the permission is missing.
  - Every action or route calls `requirePermission`.
  - Every use case calls `assertCan` first.
  - `<Can>`-style hiding (the sidebar) is cosmetic.
- `forbidden.tsx` works out the missing permission from the same route map as the sidebar
  (`lib/rbac/routes.ts`) and offers "request access", which creates a `permission_requests` row.
- Role permission sets are cached with `'use cache'` + `cacheTag('rbac')` (60s). Editing the matrix
  calls `invalidateRoleAccess()`, which invalidates the cache on every instance.

## Consequences

- Better Auth schema upgrades must be checked against the mapped tables before bumping versions.
- Customer phone masking and sensitive-read logging (`customers.view_phone`) arrive with the
  orders dashboard in Phase 2; the helpers (`maskPhone`, `logActivity({ isSensitive })`) exist now.
