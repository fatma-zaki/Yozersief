import { hashPassword } from "better-auth/crypto";
import { getSetting } from "@/modules/content";
import { logActivity } from "@/modules/audit";
import { withTransaction } from "@/db/tx";
import { env } from "@/env";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { normalizeEgyptianMobile } from "@/lib/phone";
import { assertCan, type StaffContext } from "@/lib/rbac";
import { err, ok, type Result } from "@/lib/result";
import { generateToken, hashToken } from "@/lib/tokens";
import { placeholderEmailFor } from "../domain/staff";
import {
  findInvitationByTokenHash,
  findRoleByKey,
  findStaffByContact,
  insertInvitation,
  insertStaffWithPassword,
  markInvitationAccepted,
} from "../infrastructure/staff-repository";
import { acceptInvitationSchema, inviteSchema, type InviteInput } from "../schemas";
import type { z } from "zod";

/**
 * The admin invites by phone or email + role (brief A6.2). Returns the single-use link to send;
 * only its hash is stored. Expiry comes from settings (`invitations.expiry_hours`, B13 #3 pending).
 */
export async function inviteStaff(
  actor: StaffContext,
  input: InviteInput,
): Promise<Result<{ inviteUrl: string; expiresAt: Date }>> {
  assertCan(actor, "accounts.manage");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return err(new ValidationError(parsed.error.flatten().fieldErrors));
  const { contact, roleKey } = parsed.data;

  if (await findStaffByContact(contact)) {
    return err(new ConflictError("staff exists", "يوجد عضو مسجّل بهذه البيانات بالفعل."));
  }
  const role = await findRoleByKey(roleKey);
  if (!role) throw new NotFoundError(`role ${roleKey}`);

  const token = generateToken();
  const { hours } = await getSetting("invitations.expiry_hours");
  const expiresAt = new Date(Date.now() + hours * 3_600_000);

  await withTransaction(async (tx) => {
    const invitation = await insertInvitation(
      {
        contact: contact.phone ?? contact.email!,
        roleId: role.id,
        invitedBy: actor.id,
        tokenHash: await hashToken(token, env.TOKEN_HASH_SECRET),
        expiresAt,
      },
      tx,
    );
    await logActivity(tx, {
      userId: actor.id,
      action: "accounts.invited",
      entityType: "invitation",
      entityId: invitation.id,
      meta: { roleKey },
    });
  });

  return ok({ inviteUrl: `${env.APP_URL}/login/invite/${token}`, expiresAt });
}

export type InvitationPreview = { contact: string; contactKind: "phone" | "email"; roleId: number };

/** Validates a link without consuming it, for rendering the accept form. */
export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  const invitation = await findInvitationByTokenHash(await hashToken(token, env.TOKEN_HASH_SECRET));
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) return null;
  return {
    contact: invitation.contact,
    contactKind: invitation.contact.includes("@") ? "email" : "phone",
    roleId: invitation.roleId,
  };
}

/** Sets the password and activates the account. The link works once. */
export async function acceptInvitation(
  input: z.input<typeof acceptInvitationSchema>,
): Promise<Result<{ email: string; phone: string }>> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) return err(new ValidationError(parsed.error.flatten().fieldErrors));
  const data = parsed.data;

  const tokenHash = await hashToken(data.token, env.TOKEN_HASH_SECRET);
  return withTransaction(async (tx) => {
    const invitation = await findInvitationByTokenHash(tokenHash, tx);
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      return err(
        new NotFoundError(
          "invitation",
          "هذا الرابط لا يعمل أو انتهت صلاحيته. اطلب دعوة جديدة من المدير.",
        ),
      );
    }

    const byEmail = invitation.contact.includes("@");
    const phone = byEmail ? normalizeEgyptianMobile(data.phone ?? "") : invitation.contact;
    if (!phone) {
      return err(new ValidationError({ phone: ["اكتب رقم هاتف مصريًا صحيحًا"] }));
    }
    const email = byEmail ? invitation.contact : (data.email ?? placeholderEmailFor(phone));

    if (await findStaffByContact({ phone, email }, tx)) {
      return err(
        new ConflictError("staff exists", "هذا الرقم أو البريد الإلكتروني مسجّل لعضو آخر."),
      );
    }

    const user = await insertStaffWithPassword(
      {
        name: data.name,
        phone,
        email,
        roleId: invitation.roleId,
        passwordHash: await hashPassword(data.password),
      },
      tx,
    );
    await markInvitationAccepted(invitation.id, tx);
    await logActivity(tx, {
      userId: user.id,
      action: "accounts.invitation_accepted",
      entityType: "invitation",
      entityId: invitation.id,
    });
    return ok({ email: user.email, phone });
  });
}
