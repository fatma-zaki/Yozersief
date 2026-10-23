export { cleanupTrackingLinks, cleanupVerificationCodes } from "./application/cleanup";
export { verifyTrackingLookup, type VerifyLookupResult } from "./application/verify-lookup";
export { getCustomerTrackingView } from "./application/get-tracking-view";
export {
  setTrackingSessionCookie,
  readTrackingSessionOrderId,
  clearTrackingSessionCookie,
} from "./application/session-cookie";
export {
  TRACKING_COOKIE_NAME,
  TRACKING_COOKIE_PATH,
  TRACKING_SESSION_TTL_SECONDS,
  sealTrackingSession,
  openTrackingSession,
  trackingSessionCookieOptions,
  type TrackingSessionCookieOptions,
  type TrackingSessionPayload,
} from "./domain/session";
export {
  toCustomerTrackingDto,
  customerDtoHasProhibitedFields,
  CUSTOMER_DTO_PROHIBITED_KEYS,
  customerStatusPresentation,
  personRailIndex,
  bizRailIndex,
  type CustomerTrackingDto,
  type CustomerTrackingEvent,
} from "./domain/customer-view";
export { trackingLookupSchema, type TrackingLookupInput, type TrackingLookupRaw } from "./schemas";
