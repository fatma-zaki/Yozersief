import { getSetting } from "@/modules/content";
import { logActivity } from "@/modules/audit";
import { db } from "@/db/client";
import { logger } from "@/lib/logger";
import { deviceLabelFromUserAgent } from "../domain/device";
import { canSignIn, type StaffStatus } from "../domain/staff";
import {
  findStaffStatus,
  hasAnyEarlierSession,
  hasOtherSessionOnDevice,
  touchLastActive,
} from "../infrastructure/staff-repository";

type NewSession = { id?: string; userId: string; userAgent?: string | null } & Record<
  string,
  unknown
>;

/**
 * Better Auth `session.create.before`: blocks paused/pending staff (brief A6.2) and fills the
 * device label and city shown in the session list.
 */
export async function prepareStaffSession(session: NewSession, headers?: Headers | null) {
  const status = (await findStaffStatus(session.userId)) as StaffStatus | null;
  if (!status || !canSignIn(status)) {
    logger.warn("sign-in blocked for non-active staff", { userId: session.userId, status });
    return false;
  }

  const userAgent = session.userAgent ?? headers?.get("user-agent") ?? null;
  const rawCity = headers?.get("x-vercel-ip-city");
  return {
    data: {
      ...session,
      deviceLabel: deviceLabelFromUserAgent(userAgent),
      city: rawCity ? decodeURIComponent(rawCity) : null,
    },
  };
}

/** Better Auth `session.create.after`: audit, last-active, and the new-device alert. */
export async function onStaffSessionCreated(session: NewSession & { id: string }) {
  try {
    const deviceLabel = String(session.deviceLabel ?? deviceLabelFromUserAgent(session.userAgent));
    await touchLastActive(session.userId);
    await logActivity(db, {
      userId: session.userId,
      action: "auth.signed_in",
      entityType: "staff_session",
      entityId: session.id,
      meta: { deviceLabel, city: session.city ?? null },
    });

    const alert = await getSetting("security.new_device_alert");
    const knownDevice = await hasOtherSessionOnDevice(session.userId, deviceLabel, session.id);
    const firstEver = !(await hasAnyEarlierSession(session.userId, session.id));
    if (alert.enabled && !knownDevice && !firstEver) {
      // Surfaces in the admin's team-activity alerts (B10).
      await logActivity(db, {
        userId: session.userId,
        action: "security.new_device",
        entityType: "staff_session",
        entityId: session.id,
        isSensitive: true,
        meta: { deviceLabel, city: session.city ?? null },
      });
    }
  } catch (error) {
    // Never fail a sign-in because bookkeeping failed.
    logger.error("post sign-in bookkeeping failed", { error, userId: session.userId });
  }
}
