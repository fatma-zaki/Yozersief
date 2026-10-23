import { describe, expect, it } from "vitest";
import {
  TRACKING_COOKIE_PATH,
  TRACKING_SESSION_TTL_SECONDS,
  openTrackingSession,
  sealTrackingSession,
  trackingSessionClearCookieOptions,
  trackingSessionCookieOptions,
} from "./session";

const secret = "test-tracking-cookie-secret-32chars!";
const orderId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-10-23T12:00:00.000Z");

describe("trackingSessionCookieOptions", () => {
  it("sets httpOnly, sameSite=lax, path=/track, and maxAge", () => {
    const options = trackingSessionCookieOptions(TRACKING_SESSION_TTL_SECONDS, false);
    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: TRACKING_COOKIE_PATH,
      maxAge: TRACKING_SESSION_TTL_SECONDS,
    });
    expect(options.path).toBe("/track");
  });

  it("sets secure in production and preserves flags when clearing (maxAge 0)", () => {
    const live = trackingSessionCookieOptions(TRACKING_SESSION_TTL_SECONDS, true);
    expect(live.httpOnly).toBe(true);
    expect(live.secure).toBe(true);
    expect(live.sameSite).toBe("lax");
    expect(live.path).toBe("/track");

    const cleared = trackingSessionCookieOptions(0, true);
    expect(cleared.maxAge).toBe(0);
    expect(cleared.secure).toBe(true);
    expect(cleared.httpOnly).toBe(true);
    expect(cleared.path).toBe("/track");
  });

  it("trackingSessionClearCookieOptions matches set flags with maxAge 0", () => {
    const cleared = trackingSessionClearCookieOptions(true);
    expect(cleared).toEqual(trackingSessionCookieOptions(0, true));
    expect(cleared).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: TRACKING_COOKIE_PATH,
      maxAge: 0,
    });
    expect(trackingSessionClearCookieOptions(false).secure).toBe(false);
  });
});

describe("tracking session seal/open", () => {
  it("round-trips a valid session", async () => {
    const sealed = await sealTrackingSession(orderId, secret, now, 3600);
    const opened = await openTrackingSession(sealed, secret, now);
    expect(opened?.oid).toBe(orderId);
    expect(opened?.exp).toBe(Math.floor(now.getTime() / 1000) + 3600);
  });

  it("rejects a tampered signature", async () => {
    const sealed = await sealTrackingSession(orderId, secret, now, 3600);
    const parts = sealed.split(".");
    const tampered = `${parts[0]}.${parts[1]}.${"ab".repeat(32)}`;
    await expect(openTrackingSession(tampered, secret, now)).resolves.toBeNull();
  });

  it("rejects a swapped payload with an old signature", async () => {
    const a = await sealTrackingSession(orderId, secret, now, 3600);
    const b = await sealTrackingSession(otherId, secret, now, 3600);
    const [, bodyA] = a.split(".");
    const [, , sigB] = b.split(".");
    await expect(openTrackingSession(`v1.${bodyA}.${sigB}`, secret, now)).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const sealed = await sealTrackingSession(orderId, secret, now, 60);
    const later = new Date(now.getTime() + 61_000);
    await expect(openTrackingSession(sealed, secret, later)).resolves.toBeNull();
  });

  it("rejects malformed values", async () => {
    await expect(openTrackingSession("", secret, now)).resolves.toBeNull();
    await expect(openTrackingSession("v1.only.two", secret, now)).resolves.toBeNull();
    await expect(openTrackingSession("v2.abc.def", secret, now)).resolves.toBeNull();
  });

  it("does not encode phone or order ref in the sealed value", async () => {
    const sealed = await sealTrackingSession(orderId, secret, now, 3600);
    expect(sealed.toLowerCase()).not.toContain("phone");
    expect(sealed).not.toContain("YZ-");
    expect(sealed).not.toContain("01012345678");
    const opened = await openTrackingSession(sealed, secret, now);
    expect(opened && "phone" in opened).toBe(false);
    expect(Object.keys(opened ?? {})).toEqual(["oid", "exp"]);
  });
});
