import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";
import {
  TRACKING_COOKIE_NAME,
  TRACKING_SESSION_TTL_SECONDS,
  openTrackingSession,
  sealTrackingSession,
  trackingSessionClearCookieOptions,
  trackingSessionCookieOptions,
} from "../domain/session";

/** Result of reading the tracking cookie — distinguishes never-auth from unusable cookie. */
export type TrackingSessionState =
  { status: "absent" } | { status: "invalid" } | { status: "authenticated"; orderId: string };

/** Issues a short-lived, signed, httpOnly cookie scoped to `/track` and one order. */
export async function setTrackingSessionCookie(orderId: string): Promise<void> {
  const value = await sealTrackingSession(orderId, env.TRACKING_COOKIE_SECRET);
  const jar = await cookies();
  jar.set(
    TRACKING_COOKIE_NAME,
    value,
    trackingSessionCookieOptions(TRACKING_SESSION_TTL_SECONDS, env.NODE_ENV === "production"),
  );
}

/**
 * Classifies the tracking cookie without revealing order existence.
 * `absent` = never authenticated; `invalid` = present but expired/tampered/malformed.
 */
export async function readTrackingSession(): Promise<TrackingSessionState> {
  const jar = await cookies();
  const raw = jar.get(TRACKING_COOKIE_NAME)?.value;
  if (!raw) return { status: "absent" };
  const session = await openTrackingSession(raw, env.TRACKING_COOKIE_SECRET);
  if (!session) return { status: "invalid" };
  return { status: "authenticated", orderId: session.oid };
}

/** Validates the tracking cookie; returns the bound order id or null. */
export async function readTrackingSessionOrderId(): Promise<string | null> {
  const session = await readTrackingSession();
  return session.status === "authenticated" ? session.orderId : null;
}

/**
 * Clears the tracking session cookie using the same flags as issuance (path/secure/sameSite).
 * Only callable from a Server Action or Route Handler — not from a Server Component render.
 */
export async function clearTrackingSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(
    TRACKING_COOKIE_NAME,
    "",
    trackingSessionClearCookieOptions(env.NODE_ENV === "production"),
  );
}
