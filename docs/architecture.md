# Architecture

Modular monolith in one Next.js 16 app (ADR-0001). Business rules live in pure `domain/` code;
use cases in `application/` orchestrate permissions, transactions, audit and messages.

## Module map

```mermaid
flowchart LR
  subgraph UI["src/app + components"]
    marketing["(marketing)"]
    order["(order)/order"]
    tracking["(tracking)"]
    dashboard["(dashboard)/dashboard"]
    authui["(auth)/login"]
    api["api/* routes"]
  end

  subgraph modules["src/modules"]
    identity --> audit
    identity --> content
    orders --> audit
    orders --> messaging
    quotes --> audit
    catalog
    customers
    mockups
    production
    payments
    delivery
    tracking_m["tracking"]
    content
  end

  subgraph lib["src/lib"]
    rbac
    auth["auth (Better Auth)"]
    helpers["errors · result · logger · phone · ids · format · money · tokens · ratelimit"]
  end

  subgraph infra["infrastructure"]
    pg[("Neon Postgres<br/>Drizzle")]
    blob[("Vercel Blob")]
    wa["WhatsApp<br/>(wa.me / Cloud API)"]
    redis[("Upstash Redis")]
    analytics["Plausible / GA4<br/>[pending]"]
  end

  UI --> modules
  UI --> lib
  auth --> identity
  modules --> pg
  orders --> blob
  messaging --> wa
  helpers --> redis
  content --> analytics
```

| Module       | Owns                                                                 | Phase 0 state                                  |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------- |
| `identity`   | staff, roles, permissions, invitations, sessions, access requests    | working                                        |
| `audit`      | `activity_logs`, sensitive-access flag                               | working                                        |
| `orders`     | orders, sizes, places, files, pieces, events, **lifecycle**, submit  | state machine + `submitOrder` + draft uploads + lifecycle |
| `messaging`  | templates, outbox, providers                                         | working (manual provider)                      |
| `content`    | settings, site content, gallery, reviews, analytics reader           | settings + demo analytics                      |
| `catalog`    | categories, products, options                                        | seed data                                      |
| `quotes`     | quote versions, expiry                                               | expiry cron                                    |
| `tracking`   | links, ref+phone verify (no OTP, ADR-0007), signed session, DTO      | working (token deep-link still placeholder)    |
| `customers`, `mockups`, `production`, `payments`, `delivery` | their tables                          | schema only (Phases 1–4)                       |

## Request flow: a staff action

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant Proxy as proxy.ts
  participant Action as Server Action (thin)
  participant UC as orders.applyTransition
  participant SM as domain/lifecycle
  participant DB as Postgres (one transaction)
  participant Cron as /api/cron/messages-dispatch
  participant WA as MessagingProvider

  Staff->>Proxy: POST /dashboard/orders/…
  Proxy->>Proxy: session cookie? security headers
  Proxy->>Action: forward
  Action->>Action: Zod parse · requirePermission()
  Action->>UC: applyTransition(actor, input)
  UC->>DB: BEGIN · SELECT order FOR UPDATE
  UC->>SM: planTransition(state, transition, actor, ctx)
  SM-->>UC: plan (to-state, event, template) or typed error
  UC->>DB: UPDATE orders
  UC->>DB: INSERT order_events (visible_to_customer)
  UC->>DB: INSERT activity_logs
  UC->>DB: INSERT messages (outbox, optional)
  UC->>DB: COMMIT
  UC-->>Action: Result
  Action-->>Staff: ActionResult (Arabic message on error)
  Cron->>DB: claim due messages (SKIP LOCKED)
  Cron->>WA: send()
  WA-->>Cron: prepared (wa.me link) / sent (id)
  Cron->>DB: record status · backoff on failure
```

## Request flow: a page in the dashboard

1. `proxy.ts`: no session cookie → redirect to `/login?next=…`.
2. The layout's static shell renders immediately; the sidebar (built from permissions), the user
   menu and the page stream in behind `<Suspense>` (ADR-0006).
3. The page calls `requirePagePermission(permission)`:
   - no session → redirect to `/login`
   - 2FA enforced but not set up → redirect to `/dashboard/security`
   - missing permission → `forbidden()` renders `app/forbidden.tsx` with "request access".

## Order lifecycle

See `src/modules/orders/domain/lifecycle.ts`. The tests in `lifecycle.test.ts` enumerate every
transition × status × business stage × path (1,350 combinations), plus guards and permissions.

```mermaid
stateDiagram-v2
  [*] --> submitted
  submitted --> in_review: start_review
  in_review --> approved: approve (person)
  in_review --> approved: approve_and_send_quote (biz → customer_approval)
  submitted --> awaiting_customer: request_info
  in_review --> awaiting_customer: request_info
  approved --> awaiting_customer: request_info
  awaiting_customer --> in_review: customer_responded
  awaiting_customer --> approved: customer_responded (paused from approved)
  submitted --> rejected: reject (reason)
  in_review --> rejected: reject (reason)
  approved --> rejected: reject (reason)
  approved --> approved: accept_quote · approve_mockup · confirm_deposit (biz stages)
  approved --> in_production: start_production (biz: mockup approved + deposit confirmed)
  in_production --> in_production: send_to_qc (biz)
  in_production --> ready: mark_ready (biz: QC passed)
  ready --> delivered: deliver
  delivered --> [*]
```
