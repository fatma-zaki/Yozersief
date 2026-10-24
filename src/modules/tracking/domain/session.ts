/**
 * Stateless signed tracking session (ADR-0005 / ADR-0007).
 * Payload holds only orderId + expiry — never phone, ref, or other PII.
 */
import { hashToken, safeEqual } from "@/lib/tokens";

export const TRACKING_SESSION_TTL_SECONDS = 2 * 60 * 60;
export const TRACKING_COOKIE_NAME = "yz_track";
export const TRACKING_COOKIE_PATH = "/track";

export type TrackingSessionPayload = {
  /** Order UUID the session is bound to. */
  oid: string;
  /** Unix expiry (seconds). */
  exp: number;
};

/** Cookie flags for the tracking session (ADR-0007). Pure — no env/IO. */
export type TrackingSessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: typeof TRACKING_COOKIE_PATH;
  maxAge: number;
};

/**
 * Builds the options passed to `cookies().set` for the tracking session.
 * Call sites must use this helper (not a duplicate test-only contract).
 */
export function trackingSessionCookieOptions(
  maxAge: number,
  isProduction: boolean,
): TrackingSessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: TRACKING_COOKIE_PATH,
    maxAge,
  };
}

/**
 * Cookie options for clearing the tracking session.
 * Must match set flags (`path`, `sameSite`, `secure`, `httpOnly`) or the browser keeps the cookie.
 */
export function trackingSessionClearCookieOptions(
  isProduction: boolean,
): TrackingSessionCookieOptions {
  return trackingSessionCookieOptions(0, isProduction);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Seals an order-scoped session value for the httpOnly cookie. */
export async function sealTrackingSession(
  orderId: string,
  secret: string,
  now: Date = new Date(),
  ttlSeconds: number = TRACKING_SESSION_TTL_SECONDS,
): Promise<string> {
  if (!UUID_RE.test(orderId)) throw new Error("tracking session requires a uuid order id");
  const payload: TrackingSessionPayload = {
    oid: orderId,
    exp: Math.floor(now.getTime() / 1000) + ttlSeconds,
  };
  const body = toBase64Url(JSON.stringify(payload));
  const sig = await hashToken(body, secret);
  return `v1.${body}.${sig}`;
}

/**
 * Validates signature + expiry. Returns null for any tamper, malformation, or expiry
 * (callers must treat all failures the same — no enumeration).
 */
export async function openTrackingSession(
  value: string,
  secret: string,
  now: Date = new Date(),
): Promise<TrackingSessionPayload | null> {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [version, body, sig] = parts;
  if (version !== "v1" || !body || !sig) return null;

  const expected = await hashToken(body, secret);
  if (!safeEqual(sig, expected)) return null;

  const json = fromBase64Url(body);
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const oid = (parsed as { oid?: unknown }).oid;
  const exp = (parsed as { exp?: unknown }).exp;
  if (typeof oid !== "string" || !UUID_RE.test(oid)) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (Math.floor(now.getTime() / 1000) >= exp) return null;

  return { oid, exp };
}
