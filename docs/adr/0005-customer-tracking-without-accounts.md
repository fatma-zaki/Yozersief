# ADR-0005: Customer tracking without accounts

- Status: accepted (implementation in Phase 2)
- Date: 2026-10-23

## Context

Customers come from WhatsApp on their phones and order a few times a year. Accounts would add
friction and personal data we don't need (B2, B14).

## Decision

- A customer is identified by their Egyptian mobile (`customers.phone`, normalised to `01xxxxxxxxx`).
- Entry points:
  - `/t/[token]`: the link sent on WhatsApp. The token is 32 random bytes, stored only as an HMAC
    hash in `tracking_links`. It pre-fills the order ref; "not my order?" clears it.
  - `/track`: manual entry of ref + phone.
- Verification: the phone must match the order. A 6-digit OTP (`generateOtp`, uniform) is stored
  hashed in `verification_codes`. It expires after 10 minutes and allows 5 attempts. It is
  rate-limited per phone and per IP (`otp.send`, `otp.verify`) and sent on WhatsApp; the SMS
  fallback is pending (B13 #6).
- On success the server sets a short-lived, signed, httpOnly cookie scoped to that one order
  (`TRACKING_COOKIE_SECRET`), then shows `/track/[ref]`.
- The tracking page only ever reads `order_events` with `visible_to_customer = true`.
- Customer actions (accept quote, approve mockup / request changes, "I replied") go through the
  same `applyTransition` as staff, with `actor.kind = "customer"`. The state machine allows
  customers only on transitions marked `customerAllowed`.

## Consequences

- Losing access to the phone means asking the shop on WhatsApp. That is acceptable for this business.
- Phase 0 ships the routes as placeholders (`/t/[token]` falls back to manual entry), plus the
  token, OTP, rate-limit and cleanup-cron building blocks.
