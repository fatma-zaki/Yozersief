import { ar } from "@/i18n/ar";

/**
 * Distinct unauthenticated / binding-failure states for `/track/[ref]` (audit P0 UX).
 * Does not encode whether a URL ref exists as an order.
 */
export type TrackingSessionGate =
  "absent" | "invalid" | "mismatch" | "order_missing" | "ref_invalid" | "load_failed";

export type TrackingSessionGateMessage = {
  title: string;
  body: string;
  /**
   * When true, the UI must clear the cookie via a Server Action
   * (`clearTrackingSessionCookie` / logout). RSC render cannot mutate cookies.
   */
  clearCookie: boolean;
};

/** Maps a gate reason to Egyptian Arabic copy and whether the cookie should be cleared. */
export function trackingSessionGateMessage(
  gate: TrackingSessionGate,
  loadBody?: string,
): TrackingSessionGateMessage {
  switch (gate) {
    case "absent":
      return {
        title: ar.tracking.sessionRequired,
        body: ar.tracking.unauthorized,
        clearCookie: false,
      };
    case "invalid":
      return {
        title: ar.tracking.sessionExpired,
        body: ar.tracking.unauthorized,
        clearCookie: true,
      };
    case "mismatch":
      return {
        title: ar.tracking.sessionMismatch,
        body: ar.tracking.unauthorized,
        clearCookie: true,
      };
    case "order_missing":
      return {
        title: ar.tracking.loadError,
        body: loadBody ?? ar.tracking.loadError,
        clearCookie: true,
      };
    case "ref_invalid":
      return {
        title: ar.tracking.loadError,
        body: ar.tracking.refInvalid,
        clearCookie: false,
      };
    case "load_failed":
      return {
        title: ar.tracking.loadError,
        body: loadBody ?? ar.tracking.loadError,
        clearCookie: false,
      };
  }
}
