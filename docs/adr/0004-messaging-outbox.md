# ADR-0004: WhatsApp messaging through a transactional outbox

- Status: accepted
- Date: 2026-10-23

## Decision

- Every customer message is a row in `messages`, inserted by the use case **in the same
  transaction** as the state change (`messaging/application/outbox.ts#enqueueMessage`). If the
  transaction rolls back, no message exists.
- Bodies come from `message_templates` (seeded from B8, editable by the admin), rendered with
  `{name} {ref} {link} {price} {date} {org} {reason} {update}`. Missing variables stay visible so
  the preview shows the gap.
- The `messages:dispatch` cron runs every minute. It claims due rows with
  `FOR UPDATE SKIP LOCKED`, calls the `MessagingProvider`, and records the outcome. Retries back
  off at 1m, 5m, 15m and 1h; after 5 attempts the message is `failed`.
- Providers (`messaging/infrastructure/providers.ts`):
  - `ManualLinkProvider` (MVP): the message stays `prepared`, and staff tap a `wa.me` link to send
    it from the shop's WhatsApp.
  - `WhatsAppCloudProvider`: a stub for when WhatsApp Business is connected (B13 #6). Outside the
    24h customer window Meta requires approved templates.
- The provider is chosen by `MESSAGING_PROVIDER`. An SMS provider can implement the same interface.

## Consequences

- Vercel Cron's every-minute schedule needs a Pro plan. On Hobby, any schedule that runs more
  than once a day fails the deploy. While on Hobby, `vercel.json` runs every cron daily as a
  backstop, and a scheduled GitHub Actions workflow (`.github/workflows/cron.yml`) calls
  `messages:dispatch` every 5 minutes and `otp:cleanup` hourly with the same `CRON_SECRET`.
  GitHub can delay scheduled runs by a few minutes. On Pro, move the schedules back to
  `vercel.json` and delete the workflow.
- Today the dispatcher calls providers inside the claiming transaction. That is fine for the
  manual provider and small batches. With the Cloud API, move to claim → commit → send →
  update, or to a queue service; the interface stays the same.
