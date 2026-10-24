# ADR-0008: First-party traffic analytics

- Status: accepted
- Date: 2026-10-24
- Supersedes: brief A2 "Analytics" row and B12 provider wording; resolves B13 #7

## Context

The brief left the analytics provider open (Plausible or GA4, B13 #7) and said traffic is not
stored in our database. Until a provider was chosen the traffic dashboard showed demo figures.
The owner asked for real numbers now, without an external account, subscription or cookie
banner, and chose to record page views in our own Postgres.

## Decision

1. **Storage:** one table, `page_views` (path, visitor hash, entry flag, source, device,
   `created_at`). Only aggregates leave the `content` module.
2. **No personal data:** no cookies, no local storage, no IP and no user agent stored. A
   visitor is `HMAC(TOKEN_HASH_SECRET, Cairo day | IP | user agent)` truncated to 32 hex, so the
   same person cannot be linked across days. Paths are normalised: no query string, and
   `/track/<ref>` / `/t/<token>` become `/track/[ref]` / `/t/[token]`.
3. **Collection:** `PageViews.client.tsx` (root layout) sends one `sendBeacon` per route to
   `POST /api/analytics/collect`, which always answers 204. Skipped: `/dashboard`, `/login`,
   `/api`; bots and headless browsers; Do Not Track / Global Privacy Control; requests with a
   staff session cookie. Rate limit `analytics.collect` (120 / 10 min per IP, fails open).
4. **Visits:** a view is a visit entry when the same visitor had no view in the previous 30
   minutes. Source (utm_source, else referrer host) and device (user agent) are read per view;
   the dashboard counts them on entries.
5. **Report:** `getTrafficReport` (`traffic.view`) returns today (hourly, from Cairo midnight)
   and the last 7 / 30 days (daily), each compared with the same span right before. Orders sent
   and approved come from the `orders` module (`countOrderFunnel`). `AnalyticsReader` stays as
   the seam: `FirstPartyAnalyticsReader` is the only implementation.
6. `ANALYTICS_PROVIDER` is removed from the env schema.

## Consequences

- Real figures from the first deploy, at no cost; counts start on the day this ships.
- Counts are lower than a cookie-based tool's: the daily salt splits returning visitors, and
  DNT/GPC users and staff are not counted. Two people behind one IP with the same browser build
  count as one visitor that day.
- WhatsApp's in-app browser usually sends no referrer, so those visits show as «دخول مباشر»
  unless links carry `?utm_source=whatsapp`.
- The table grows with traffic. Retention is not decided yet `[للتأكيد]`; add a cleanup cron when
  it is (indexes on `created_at` and `(visitor_hash, created_at)` keep reads cheap meanwhile).
- Moving to Plausible or GA4 later means a second `AnalyticsReader` and removing the beacon.
