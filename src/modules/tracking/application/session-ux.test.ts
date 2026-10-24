import { describe, expect, it } from "vitest";
import { ar } from "@/i18n/ar";
import { trackingSessionGateMessage, type TrackingSessionGate } from "./session-ux";

describe("trackingSessionGateMessage", () => {
  it("distinguishes never-authenticated (absent) from expired/invalid", () => {
    const absent = trackingSessionGateMessage("absent");
    expect(absent.title).toBe(ar.tracking.sessionRequired);
    expect(absent.body).toBe(ar.tracking.unauthorized);
    expect(absent.clearCookie).toBe(false);

    const invalid = trackingSessionGateMessage("invalid");
    expect(invalid.title).toBe(ar.tracking.sessionExpired);
    expect(invalid.body).toBe(ar.tracking.unauthorized);
    expect(invalid.clearCookie).toBe(true);

    expect(absent.title).not.toBe(invalid.title);
  });

  it("uses distinct mismatch copy without implying the URL ref exists", () => {
    const mismatch = trackingSessionGateMessage("mismatch");
    expect(mismatch.title).toBe(ar.tracking.sessionMismatch);
    expect(mismatch.body).toBe(ar.tracking.unauthorized);
    expect(mismatch.clearCookie).toBe(true);
    expect(mismatch.title).not.toBe(ar.tracking.sessionExpired);
    expect(mismatch.title).not.toBe(ar.tracking.sessionRequired);
  });

  it("clears the cookie when the session order is missing", () => {
    const missing = trackingSessionGateMessage("order_missing", ar.tracking.loadError);
    expect(missing.title).toBe(ar.tracking.loadError);
    expect(missing.body).toBe(ar.tracking.loadError);
    expect(missing.clearCookie).toBe(true);
  });

  it("does not clear for invalid URL ref format or transient load failures", () => {
    const refInvalid = trackingSessionGateMessage("ref_invalid");
    expect(refInvalid.body).toBe(ar.tracking.refInvalid);
    expect(refInvalid.clearCookie).toBe(false);

    const failed = trackingSessionGateMessage("load_failed", "حدثت مشكلة لدينا.");
    expect(failed.body).toBe("حدثت مشكلة لدينا.");
    expect(failed.clearCookie).toBe(false);
  });

  it("covers every gate with a title and body", () => {
    const gates: TrackingSessionGate[] = [
      "absent",
      "invalid",
      "mismatch",
      "order_missing",
      "ref_invalid",
      "load_failed",
    ];
    for (const gate of gates) {
      const msg = trackingSessionGateMessage(gate);
      expect(msg.title.length).toBeGreaterThan(0);
      expect(msg.body.length).toBeGreaterThan(0);
      expect(typeof msg.clearCookie).toBe("boolean");
    }
  });
});
