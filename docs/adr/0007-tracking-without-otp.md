# ADR-0007: Customer tracking verification without OTP

- Status: accepted
- Date: 2026-10-23
- Supersedes (interim): OTP steps in ADR-0005 / brief A6.7 / B6

## Context

ADR-0005 and the project brief specify WhatsApp OTP after matching order ref + phone.
The business decision for the current release is **not** to use OTP, SMS, WhatsApp Business
API, email verification, or any paid messaging service for tracking access.

Customers prove knowledge of the **order reference** and the **phone number registered on
that order**, then receive a short-lived signed cookie.

## Decision

1. **Verification factor:** canonical order ref + normalised Egyptian mobile matching
   `customers.phone` for that order. Lookups run only on the server.
2. **No OTP:** do not create `verification_codes`, send codes, or imply OTP in the UI copy.
3. **Session:** on success, set a signed httpOnly cookie (`TRACKING_COOKIE_SECRET`) bound to
   `orderId` + expiry only. Path `/track`, `sameSite=lax`, `secure` in production.
4. **Rate limit:** reuse `tracking.lookup`; treat it as **auth-sensitive (fail closed)** when
   Redis is configured but unavailable (throw or Upstash timeout).
5. **Public DTO:** tracking readers return only an explicit customer DTO; only
   `order_events.visible_to_customer = true`; never phone, internal notes, or staff audit rows.
6. **`/t/[token]`:** keep a safe redirect to `/track?link=invalid`. Do not resolve tokens or
   auto-send tracking links until the hashed-token design can be completed safely without
   pretending unverified tokens are authorization.

## Security limitation (explicit)

Matching an order reference and a phone number is a **knowledge factor**, not identity
verification equivalent to OTP or possession of a second factor. Anyone who learns both
values can open that order’s tracking session until the cookie expires. Losing phone access
still means contacting the shop on WhatsApp (same operational fallback as ADR-0005).

## Consequences

- OTP tables and cleanup crons remain for a possible future channel (B13 #6) but are unused
  by the live tracking flow.
- UI copy no longer promises a WhatsApp code for the lookup step.
- When OTP is reintroduced, restore ADR-0005’s verify step in front of cookie issuance and
  revisit this ADR.
- Brief A6.7 / B6 keep the historical OTP rationale but defer to this ADR for the current
  release so reviewers do not “fix” the missing OTP.
- **Staff PII in customer-visible notes:** rejection reasons and visible `order_events.note`
  values render on `/track/[ref]`. Until the admin order-detail / transition UI exists, there
  is no suitable place for an in-product warning — document the rule in brief B7 and keep
  sensitive detail in `orders.internal_note` only.
