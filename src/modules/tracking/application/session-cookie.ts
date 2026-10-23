import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";
import {
  TRACKING_COOKIE_NAME,
  TRACKING_SESSION_TTL_SECONDS,
  openTrackingSession,
  sealTrackingSession,
  trackingSessionCookieOptions,
} from "../domain/session";

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

/** Validates the tracking cookie; returns the bound order id or null. */
export async function readTrackingSessionOrderId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(TRACKING_COOKIE_NAME)?.value;
  if (!raw) return null;
  const session = await openTrackingSession(raw, env.TRACKING_COOKIE_SECRET);
  return session?.oid ?? null;
}

/** Clears the tracking session cookie (logout). */
export async function clearTrackingSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(TRACKING_COOKIE_NAME, "", trackingSessionCookieOptions(0, env.NODE_ENV === "production"));
}
