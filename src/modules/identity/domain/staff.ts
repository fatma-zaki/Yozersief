/**
 * Staff identity rules. Better Auth requires an email per user (ADR-0003), so staff who sign in
 * by phone only get a placeholder on the reserved `.invalid` TLD, which can never receive mail.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = "phone.youzersef.invalid";

export function placeholderEmailFor(phone: string): string {
  return `${phone}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

/** The real email to show in the UI, or null for phone-only staff. */
export function displayEmail(email: string): string | null {
  return isPlaceholderEmail(email) ? null : email;
}

export type StaffStatus = "active" | "pending" | "paused";

export function canSignIn(status: StaffStatus): boolean {
  return status === "active";
}
