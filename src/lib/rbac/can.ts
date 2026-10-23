import { ForbiddenError } from "@/lib/errors";
import type { Permission, RoleKey } from "./permissions";

/** The signed-in staff member as every use case sees them. */
export type StaffContext = {
  id: string;
  name: string;
  roleKey: RoleKey;
  sessionId: string;
  twoFactorEnabled: boolean;
  permissions: ReadonlySet<Permission>;
};

/** Admin implicitly has every permission (brief A6.3). */
export function can(user: Pick<StaffContext, "roleKey" | "permissions">, permission: Permission) {
  return user.roleKey === "admin" || user.permissions.has(permission);
}

/** First line of every use case: throws ForbiddenError if the actor lacks the permission. */
export function assertCan(user: StaffContext, permission: Permission): void {
  if (!can(user, permission)) throw new ForbiddenError(permission);
}
