# Youzersef — Build Brief for Claude Code

> **How to use this file**
>
> 1. Create an empty Git repo and put this file at `docs/PROJECT_BRIEF.md`.
> 2. Put the database schema at `docs/schema.sql` (the `youzersef-schema.sql` file from the ERD).
> 3. Unzip the HTML design export into `docs/design/` (open `docs/design/index.html` to browse all 120 screens).
> 4. Start Claude Code in the repo and say:
>    _"Read `docs/PROJECT_BRIEF.md` end to end, then execute Phase 0. Stop at the end of Phase 0 and report."_
>
> This file is both the **engineering instructions** (Part A) and the **business requirements reference** (Part B). When code and this file disagree, this file wins until it is updated.

---

## Part A — Engineering instructions

### A1. Your role and the goal

You are the lead engineer setting up the production foundation for **Youzersef (يوزرسيف)**, a print shop in Aswan, Egypt, that prints on t-shirts, hoodies, caps, mugs, phone cases, stickers and custom items, for individuals and for companies, shops, teams and events.

The goal of the first engagement (**Phase 0**) is a professional, scalable, production-ready **skeleton**: tooling, architecture, database, auth, role-based access control, design system, layouts, CI, and a working deployment on Vercel. Feature work comes in later phases (A9). Build the foundation so later features slot in without rework.

### A2. Fixed technology decisions

| Concern                  | Decision                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                 | TypeScript everywhere, `strict: true`, `noUncheckedIndexedAccess: true`. No `any` without a comment explaining why.                                                                 |
| Framework                | Next.js, latest stable, **App Router**, React Server Components first.                                                                                                              |
| Package manager          | pnpm. Pin Node LTS in `.nvmrc` and `engines`.                                                                                                                                       |
| Database                 | PostgreSQL. Production on **Neon** via the Vercel Marketplace (Vercel's managed Postgres). Local development on Docker Postgres.                                                    |
| ORM / migrations         | **Drizzle ORM** + `drizzle-kit`, SQL migrations committed to the repo. Translate `docs/schema.sql` into Drizzle schema files faithfully (same tables, enums, constraints, indexes). |
| Auth (staff only)        | **Better Auth** with the Drizzle adapter, email or phone + password, and the two-factor plugin. Customers never have accounts (see B6).                                             |
| Validation               | **Zod**. One schema per input, shared by the client form and the server action.                                                                                                     |
| Forms                    | React Hook Form + `@hookform/resolvers/zod`.                                                                                                                                        |
| Styling                  | Tailwind CSS (v4) with design tokens as CSS variables, light + dark themes, **RTL first**.                                                                                          |
| UI primitives            | shadcn/ui (Radix), adapted to RTL and the Youzersef tokens. Icons: lucide-react (outline, 1.75 stroke).                                                                             |
| Fonts                    | Cairo via `next/font/google`.                                                                                                                                                       |
| File storage             | **Vercel Blob**, client-side uploads with server-issued tokens, 20 MB per file.                                                                                                     |
| Rate limiting / cache    | Upstash Redis (`@upstash/ratelimit`).                                                                                                                                               |
| Messaging                | WhatsApp behind a provider interface (A6.6).                                                                                                                                        |
| Background work          | Transactional **outbox** table + Vercel Cron worker route. Keep the interface swappable for a queue service later.                                                                  |
| Env vars                 | Validated at boot with Zod (`src/env.ts`). The app must fail fast on missing or invalid env.                                                                                        |
| Errors / logs            | Sentry for errors. Structured JSON logs through one `logger` module.                                                                                                                |
| Analytics (site traffic) | Plausible or GA4 (decision pending, B12). Behind an `AnalyticsReader` interface. Traffic is **not** stored in our database.                                                         |
| Tests                    | Vitest (unit, domain), Playwright (e2e), and a disposable Postgres for integration tests.                                                                                           |
| CI                       | GitHub Actions: install, lint, typecheck, unit tests, migration check, build. Vercel Preview per PR, with a Neon branch per preview.                                                |
| Hosting                  | Vercel. Region close to Egypt (e.g. `fra1`), and the Neon database in the same region.                                                                                              |

If a decision here turns out to be blocked (a library broke, an API changed), stop and propose an alternative in an ADR (A8). Do not silently swap it.

### A3. Architecture: modular monolith

One Next.js app, organised by **business module**, with a clean dependency direction:

```
UI (app/, components)  →  application (use cases)  →  domain (pure logic)
                                    ↓
                         infrastructure (db, blob, messaging, analytics)
```

Rules:

- **Domain** code is pure TypeScript: no Next.js, no Drizzle, no `fetch`. It holds types, state machines, validation rules and policies. 100% unit-testable.
- **Application** code (use cases) orchestrates: checks permissions, opens a DB transaction, calls repositories, writes events, enqueues messages. One use case = one user intention (`approveOrder`, `submitQuoteDraft`, `recordPayment`…).
- **Infrastructure** implements interfaces declared by the application layer (repositories, `MessagingProvider`, `FileStorage`, `AnalyticsReader`, `Clock`).
- **Server Actions and Route Handlers are thin**: parse input with Zod, resolve the session, call one use case, map the result. No business logic in components or actions.
- Modules talk to each other only through their public `index.ts`. No deep imports across modules.
- Every state change that the customer or admin can see writes an `order_events` row and an `activity_logs` row **in the same transaction**.

### A4. Folder structure

```
.
├─ docs/
│  ├─ PROJECT_BRIEF.md          ← this file
│  ├─ schema.sql                ← source ERD (reference)
│  ├─ design/                   ← HTML design export (reference)
│  └─ adr/                      ← architecture decision records (0001-*.md …)
├─ drizzle/                     ← generated SQL migrations (committed)
├─ e2e/                         ← Playwright tests
├─ public/
├─ scripts/                     ← seed, maintenance scripts
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/           ← public site: home, services, gallery
│  │  ├─ (order)/order/         ← request builder (multi-step)
│  │  ├─ (tracking)/            ← /track, /t/[token], /track/[ref]
│  │  ├─ (dashboard)/dashboard/ ← staff area (admin + team workspaces)
│  │  ├─ (auth)/login/          ← staff login, 2FA, invite acceptance
│  │  ├─ api/                   ← route handlers: cron, blob upload tokens, webhooks, auth
│  │  ├─ layout.tsx             ← <html lang="ar" dir="rtl">, fonts, theme
│  │  ├─ not-found.tsx
│  │  └─ forbidden.tsx          ← "this page is not in your role's permissions"
│  ├─ modules/
│  │  ├─ catalog/               ← categories, products, options
│  │  ├─ customers/             ← customers, organizations, contacts
│  │  ├─ orders/                ← orders, sizes, places, files, pieces, events, lifecycle
│  │  ├─ quotes/
│  │  ├─ mockups/
│  │  ├─ production/
│  │  ├─ payments/              ← payments, invoices
│  │  ├─ delivery/
│  │  ├─ messaging/             ← templates, outbox, providers
│  │  ├─ tracking/              ← links, OTP verification, customer session
│  │  ├─ content/               ← gallery, reviews, site content, settings
│  │  ├─ identity/              ← staff users, roles, permissions, invitations, sessions
│  │  └─ audit/                 ← activity logs, sensitive-access logging
│  │     (each module:)
│  │     ├─ domain/             ← types, state machines, rules (pure)
│  │     ├─ application/        ← use cases + ports (interfaces)
│  │     ├─ infrastructure/     ← drizzle repositories, adapters
│  │     ├─ ui/                 ← module-specific components
│  │     ├─ schemas.ts          ← zod schemas (inputs/outputs)
│  │     └─ index.ts            ← the module's public API
│  ├─ db/
│  │  ├─ schema/                ← drizzle tables, one file per module
│  │  ├─ client.ts              ← pooled/serverless client
│  │  └─ tx.ts                  ← transaction helper
│  ├─ lib/
│  │  ├─ auth/                  ← Better Auth config, session helpers
│  │  ├─ rbac/                  ← permission keys, can(), requirePermission()
│  │  ├─ errors.ts              ← typed AppError (NotFound, Forbidden, Validation, Conflict)
│  │  ├─ result.ts              ← Result<T, E> helpers for use cases
│  │  ├─ logger.ts
│  │  ├─ ratelimit.ts
│  │  ├─ phone.ts               ← Egyptian mobile normalisation + masking
│  │  ├─ ids.ts                 ← order ref generator YZ-XXXXXX
│  │  └─ format.ts              ← dates (Africa/Cairo), Western digits, money
│  ├─ components/ui/            ← design-system primitives (shadcn-based)
│  ├─ styles/tokens.css         ← light/dark tokens (A7)
│  ├─ env.ts
│  └─ middleware.ts             ← auth gate for /dashboard, security headers
├─ tests/                       ← integration tests (real Postgres)
├─ .github/workflows/ci.yml
├─ docker-compose.yml           ← local Postgres (+ optional Redis)
├─ drizzle.config.ts
├─ vercel.json                  ← crons, region
├─ CLAUDE.md                    ← short pointer to this brief + conventions
└─ README.md                    ← setup in 5 commands
```

### A5. Conventions

- **Naming**: files `kebab-case.ts`, React components `PascalCase.tsx`, DB `snake_case`, TS `camelCase`. Permission keys `module.action` (e.g. `orders.approve`).
- **Server first**: pages are Server Components. Client components only for interactivity, named `*.client.tsx`.
- **Data access** only through module repositories. No Drizzle calls inside `app/`.
- **Errors**: use cases return `Result`, or throw `AppError`. Never leak stack traces or DB errors to the UI. Every user-facing error message is Egyptian Arabic, says what went wrong and how to fix it.
- **Money**: Postgres `numeric(12,2)`, handled as strings in TS; arithmetic through a small decimal helper. Currency EGP.
- **Time**: store `timestamptz` (UTC). Display in `Africa/Cairo`.
- **Digits**: always Western digits (0-9) in the UI, including Arabic text. Accept Arabic-Indic digits in inputs and normalise them.
- **Copy**: Arabic, Egyptian colloquial, matching the design (e.g. «ابدأ طلبك», «تتبّع طلبك»). Keep all UI strings in `src/i18n/ar.ts` so English can be added later.
- **Accessibility**: real buttons/links/labels, visible focus, 44px touch targets, `prefers-reduced-motion` respected.
- **Commits**: Conventional Commits. Small PRs per module.
- **Never** commit secrets. `.env.example` lists every variable with a comment.

### A6. Cross-cutting systems to build in Phase 0

#### A6.1 Database

- Drizzle schema matching `docs/schema.sql` (34 tables, 16 enums). Keep the check constraints (`orders.ref` format, org required when `customer_type <> 'person'`, `order_sizes.qty > 0`) and the indexes.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`.
- Seed: the 5 roles, all permissions, the role-permission matrix from B9, product categories/products/options from B4, message templates from B8, one admin user from env (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PHONE`), and **clearly marked demo data** only when `SEED_DEMO=true`.
- Use the pooled connection string for runtime and the direct one for migrations.

#### A6.2 Auth (staff)

- Login with email or phone + password. Invitations: the admin invites by phone/email + role, the invitee sets a password through a single-use link (token stored hashed, expiry from settings).
- Optional 2FA per user; enforceable globally from settings (`security.two_factor`).
- Session list per user (device, city, last seen) with "sign out other devices".
- Paused users cannot sign in; their active sessions are revoked.
- Alert the admin on a login from a new device (setting `security.new_device_alert`).

#### A6.3 RBAC

- Source of truth: `roles`, `permissions`, `role_permissions` tables. Admin implicitly has every permission and cannot be edited.
- `src/lib/rbac`: a typed `Permission` union generated from the seed list; `can(user, permission)`; `requirePermission(permission)` for server actions/route handlers; `<Can permission="…">` for UI hiding.
- **Enforcement is server-side.** UI hiding is only cosmetic. Every use case declares its required permission and checks it first.
- Route-level: `/dashboard/*` requires a session (middleware). Each section requires its permission; otherwise render `forbidden.tsx` with "request access" (creates a `permission_requests` row).
- Field-level: customer phone numbers are masked (`010•••••678`) unless the user has `customers.view_phone`; revealing a number writes an `activity_logs` row with `is_sensitive = true`.
- Cache the permission set per session (short TTL), and invalidate it when the role matrix changes.

#### A6.4 Order lifecycle engine (domain)

- Implement `orders/domain/lifecycle.ts` as an explicit state machine for `status` and, for business orders, `biz_stage` (B3). Each transition: allowed from-states, required permission, guards (e.g. a deposit must be `confirmed` before `production`), and the events/messages it emits.
- One function applies a transition inside a transaction: update order → insert `order_events` (customer-visible flag) → insert `activity_logs` → enqueue outbox messages.
- Exhaustive unit tests for every allowed and forbidden transition.

#### A6.5 Files

- Upload flow: the client asks `/api/uploads/token` (validates order access, kind, size ≤ 20 MB, extension) → uploads directly to Vercel Blob → server confirms and inserts `order_files`.
- Allowed: png, jpg, jpeg, pdf, ai, psd, svg; plus xlsx, xls, csv for name sheets.
- Run an image-resolution check where possible and set `quality_flag = 'low_res'`.

#### A6.6 Messaging (WhatsApp)

- `MessagingProvider` interface: `send({ to, body, templateKey, orderId }) → { providerMessageId }`.
- Implementations: `ManualLinkProvider` (MVP: prepares the message and returns a `wa.me` link the staff member taps, status `prepared`), and a `WhatsAppCloudProvider` stub, ready for when WhatsApp Business is connected. An SMS provider can be added later.
- Every message goes through the `messages` outbox table. A cron worker sends pending ones with retries and backoff, and records the status.
- Templates come from `message_templates`, with variables `{name} {ref} {link} {price} {date} {org} {reason} {update}`.

#### A6.7 Tracking & OTP (customers)

- Tracking links: `/t/[token]`, where the token is random, stored hashed, and resolves to an order. It pre-fills the order ref; the customer confirms their phone.
- Manual entry: `/track` → ref + phone.
- OTP: 6 digits, stored hashed, 10-minute expiry, max 5 attempts, rate-limited per phone and per IP, sent on WhatsApp (SMS fallback is a pending decision).
- On success, set a short-lived signed, httpOnly cookie scoped to that one order, then show `/track/[ref]`.
- Only customer-visible `order_events` are ever shown.

#### A6.8 Security & privacy

- Security headers (CSP, HSTS, frame-ancestors none, referrer-policy) in middleware.
- Rate limits on: OTP send/verify, tracking lookups, order submission, uploads, login.
- Every token and code is stored hashed (tracking links, OTP, invitations).
- Gallery publishing is blocked unless `customer_consent = true`. Reviews are shown only with consent; never fabricate reviews.
- Audit log: every write use case logs actor, action, entity and order; sensitive reads are flagged.
- Personal data stays out of logs (mask phones).

#### A6.9 Observability & ops

- Sentry (client + server), with the release tied to the Vercel deployment.
- `/api/health` checks the DB and returns the version.
- Vercel Cron jobs: `messages:dispatch` (every minute), `quotes:expire` (daily), `otp:cleanup` (hourly), `links:cleanup` (daily).

### A7. Design system implementation

The design lives in `docs/design/` (open `index.html`). Rebuild it with real components; do not copy the exported HTML.

- **Direction**: RTL Arabic. A "glass + neon" look: deep teal surfaces, mint neon accents, frosted glass cards, soft glows. Both a light and a dark theme, switchable, defaulting to the system setting.
- **Core tokens** (CSS variables in `styles/tokens.css`, exposed to Tailwind):
  - Light: page `#f3faf8`, ink `#030909`, accent ink `#005c58`, dark bands `#01302d`, glass card `linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,255,255,.62))`.
  - Dark: page `#001412`, sections `#001b17`, panels `#032722` / `#054039`, ink `#f2fbf8`, accent `#7ee8c7`.
  - Brand: teal `#005c58` / `#00706a`, deep `#004541` / `#01302d`, mint `#7ee8c7`, mint light `#b8f2de`, gold warning `#d6ae62`.
  - Primary CTA: vertical gradient `rgba(0,120,112,.92) → rgba(0,43,40,.92)`, a 1.5px mint border, and a mint glow `0 0 18px rgba(126,232,199,.42)`.
  - Radius: pills 999px, cards 24–30px, inputs 16px.
  - Motion: easing `cubic-bezier(.22,1,.36,1)`, fade-up on enter, honour `prefers-reduced-motion`.
  - Semantic: "needs the customer" = gold; done = mint; neutral = muted.
- **Primitives to build in Phase 0**: Button (cta, soft, ghost, line), Input/Select/Textarea with an invalid state, Chip/toggle chip, Switch, Checkbox, Card (glass), Badge (ok/warn/role/off), Stepper, Dialog, Sheet (mobile), Toast, Tabs, Table (div-grid responsive), EmptyState, Skeleton, Avatar, Sidebar layout, MobileBottomNav.
- **Layouts**: marketing (glass navbar, footer), order builder (dark hero band + stepper + readiness panel), tracking (mobile-first), dashboard (dark floating sidebar whose nav items are built from the user's permissions + glass header).

### A8. Documentation you must produce

- `README.md`: prerequisites, a 5-command local setup, env vars, scripts, deploy notes.
- `CLAUDE.md`: a short summary of the conventions + "read docs/PROJECT_BRIEF.md".
- `docs/adr/`: at least ADR-0001 modular monolith, 0002 Drizzle + Neon, 0003 Better Auth + RBAC model, 0004 messaging outbox, 0005 customer tracking without accounts.
- `docs/architecture.md`: the module map and a request flow diagram (Mermaid).

### A9. Delivery plan

**Phase 0 — Foundation (do this now, then stop and report)**

1. Repo tooling: Next.js + TS strict, pnpm, ESLint (incl. import boundaries between modules), Prettier, Husky + lint-staged, commitlint.
2. `env.ts`, logger, errors/result, phone/ids/format helpers (with unit tests).
3. Docker Postgres, Drizzle schema for all 34 tables, first migration, seed (A6.1).
4. Better Auth (A6.2), RBAC library + middleware + forbidden page (A6.3).
5. Lifecycle state machine + tests (A6.4).
6. Interfaces + MVP adapters: FileStorage (Vercel Blob), MessagingProvider (ManualLink), AnalyticsReader (stub), outbox + cron route.
7. Design tokens, the primitives listed in A7, the 4 layouts, light/dark switch, RTL verified.
8. Route skeletons for every page in B10, each rendering its layout and an empty state, protected by the right permission.
9. CI workflow, Vercel project config (`vercel.json` with crons + region), Sentry, `/api/health`.
10. Docs (A8). An e2e smoke test: home loads, staff login works, a desk user is forbidden from `/dashboard/accounts`.

**Definition of done for Phase 0**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass; migrations apply on a fresh DB; seed runs; the preview deploy works on Vercel with Neon; you can log in as the seeded admin and invite a "desk" user who sees only the desk workspace.

**Later phases (reference; do not start without approval)**

- Phase 1: request builder + order submission + readiness checks + confirmation (B5).
- Phase 2: admin order review, approve/info/reject, WhatsApp messages, tracking + OTP (B6–B8).
- Phase 3: business path — quotes, mockups, deposit, production board, delivery, invoices (B3, B10).
- Phase 4: team workspaces + team activity page (B9–B10).
- Phase 5: catalog/gallery/content/accounts admin, traffic dashboard (B10–B12).

At the end of each phase: report what was built, what was deferred, any decisions made, and the open questions from B13 that block the next phase.

---

## Part B — Business requirements reference

### B1. The business

- **Youzersef (يوزرسيف)**, a print shop in Aswan. WhatsApp: 01116891025.
- Sells printing on: t-shirts, hoodies, sweatshirts, caps (wear); mugs and bottles (gifts); phone cases; stickers and labels; and "custom idea" requests.
- **No public prices.** The price is decided per order after review. The website collects well-structured requests and keeps the customer updated.
- Customers are either **individuals (فرد)**, or **organisations**: a company or shop (شركة أو محل), or a team, school, event or occasion (فريق أو جهة أو مناسبة). Organisations usually order in bulk.

### B2. Actors

| Actor                                | Description                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Customer                             | No account. Identified by mobile number. Submits orders, tracks them via a link + OTP.                          |
| Admin (مدير)                         | The owner. Everything, plus final approvals, prices, payments confirmation, roles.                              |
| Desk (استقبال طلبات)                 | Reviews new orders, talks to customers, requests info, prepares quote drafts, forwards to admin.                |
| Designer (مصمم)                      | Makes mockups, checks customer files, handles change requests; can manage gallery and site texts.               |
| Production (إنتاج)                   | Production board: printing, counters, per-piece names sheet, quality check. Sees no prices or customer contact. |
| Delivery & collection (تسليم وتحصيل) | Hands over ready orders after verification, records deposits/balances, invoices.                                |

### B3. Order lifecycle

**Individual path (6 stages)**

1. Submitted (تم الإرسال) → 2. In review (قيد المراجعة) → optional _awaiting customer_ (محتاجين بيانات منك) → 3. Approved with price + date sent on WhatsApp (تمت الموافقة) or Rejected with a mandatory reason (مرفوض) → 4. In production (جاري التنفيذ) → 5. Ready (جاهز) → 6. Delivered (تم التسليم).

**Business path (9 stages, `biz_stage`)**

1. Submitted → 2. Review → 3. **Official quote** (the desk drafts, the admin approves, it is sent) → 4. **Customer accepts the quote** (button on the tracking page or a WhatsApp reply recorded by staff) → 5. **Mockup** (+ sample if requested): the customer approves or requests changes (loops back with a new version) → 6. **Deposit** recorded by delivery, confirmed by admin → 7. **Production** with a piece counter → 8. **Quality check** (sizes, names, print clarity, count) → 9. **Delivery**, in one go or in batches, + invoice if requested.

**Rules**

- "Awaiting customer" can happen at any stage before production and pauses the order until the customer responds.
- Rejection is possible before production in both paths. The reason is mandatory and sent to the customer, with an alternative where possible.
- Quotes expire after `[validity — pending]`; a reminder is sent before expiry; an expired quote needs a new version.
- Production cannot start before an approved mockup (business) and a confirmed deposit (business).
- Every stage change is visible to the customer as a timeline entry and triggers an optional WhatsApp update.

### B4. Catalog

| Category key | Arabic                 | Products                   | Category-specific fields                                                                                    |
| ------------ | ---------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| wear         | تيشيرتات وهوديز وكابات | tshirt, hoodie, sweat, cap | colour (white/black/other), total qty, size split S–XXL (not for caps), print places front/back/sleeve (≥1) |
| mug          | مجات وهدايا            | mug, bottle                | qty, optional custom text                                                                                   |
| phone        | كفرات الموبايل         | —                          | exact phone model, qty, optional text                                                                       |
| sticker      | استيكرات وملصقات       | —                          | width, height, unit (cm/mm), shape (circle/square/rect/die-cut), qty, optional usage                        |
| custom       | فكرة خاصة              | —                          | description ≥ 10 chars                                                                                      |

The admin can show/hide products, edit descriptions and options. Prices are never shown to customers.

### B5. Request builder (customer)

Steps: **1 Type & product → 2 Details → 3 Design & files → 4 Your info & receipt → 5 Review → Confirmation**.

- Step 1: "Who is this order for?" person / biz / group. For organisations, show the bulk-path note. Then the category.
- Step 2: category fields (B4). If the order is for an organisation: bulk options — _sample before full production_, _different name/number per piece_ (wear & mug only), _delivery in batches_ (+ required batch notes ≥ 5 chars). If an individual enters qty ≥ 30, suggest switching to "company or shop".
- Step 3: upload files (B10 limits) and/or "I need design help" (switch) + design notes. If per-piece names: a names sheet (xlsx/csv/pdf) is required.
- Step 4: organisation name (required for orgs), role (optional), invoice needed (switch) + tax/commercial ID (optional); contact name, Egyptian mobile (required, `^01[0125]\d{8}$` after normalising Arabic digits), email (optional, validated), receipt method pickup/delivery (+ address for delivery), desired date (optional, not in the past, "desired, not confirmed").
- **Readiness panel**: a live checklist of every required item per step (ok / needs attention / optional), with a "fix it" action that jumps to the field. Submission is blocked until all required items are ok.
- Review: grouped summary with "edit" per section, missing values highlighted.
- Submit → order ref `YZ-` + 6 chars (A–Z without ambiguous letters, 2–9), status `submitted`. Confirmation shows the ref, next steps (different for person vs organisation) and a "track your order" link.
- A failed upload or submit keeps all entered data and offers a retry.

### B6. Customer tracking

- Entry points: the WhatsApp link `/t/[token]` (ref pre-filled; "not my order?" clears it) or `/track` (manual ref + phone). An invalid or expired link shows a warning and manual entry.
- Verification: phone must match the order → 6-digit code on WhatsApp → access to that order only.
- Page: current status card + stage rail (5 stages for individuals, 7 business stages for organisations), "action needed" card (gold) when the customer must act, a timeline (newest first), order details, a help banner (WhatsApp).
- Business actions on the tracking page: accept quote / ask a question; approve mockup / request changes (with notes); deposit instructions; production progress (`36 of 60 pieces`); pickup info.

### B7. Admin — orders

- List with search (ref, name), status filter, customer-type filter (all / individuals / organisations), sort, and organisation badges.
- Order detail: customer (+ organisation and role), receipt and desired date, specs, files with download, customer notes, internal note (never shown to the customer), activity log.
- Actions: **Approve** (individual: optional price/date message; organisation: "approve and send quote" with a required quote text), **Request info** (required text), **Reject** (required reason). Optional WhatsApp message with a preview and a copy-link button.
- Business pipeline box: the 7-stage rail, bulk option chips, invoice flag, and a "record next stage" button that also prepares the customer update message.

### B8. WhatsApp message templates (seed, editable by admin)

- **approve**: «أهلًا {name}، طلبك رقم {ref} من يوزرسيف اتقبل. {price_date} تقدر تتابع حالة طلبك من اللينك ده: {link} هتحتاج رقم الطلب ورقم موبايلك عشان تفتح الصفحة.»
- **quote** (organisations): «أهلًا {name}، طلب {org} رقم {ref} من يوزرسيف اتراجع، وده عرض السعر: {quote} لو موافق رد علينا بـ «موافق» وهنبعتلك الموكاب للاعتماد. تقدر تتابع كل مراحل الطلب من هنا: {link}»
- **update**: «أهلًا {name}، تحديث على طلب {org} رقم {ref}: {update} تابع كل المراحل من هنا: {link}»
- **info**, **reject**, **ready**, **thanks**: same tone, include {ref} and, where relevant, {reason} or pickup info.
- Until WhatsApp Business is connected, messages are prepared and sent manually through a `wa.me` link (A6.6).

### B9. Roles & permissions matrix (seed)

| Permission                               | Admin | Desk | Designer | Production | Delivery |
| ---------------------------------------- | :---: | :--: | :------: | :--------: | :------: |
| orders.view                              |   ✓   |  ✓   |    ✓     |     ✓      |    ✓     |
| customers.view_phone                     |   ✓   |  ✓   |    –     |     –      |    ✓     |
| orders.request_info                      |   ✓   |  ✓   |    –     |     –      |    –     |
| quotes.draft                             |   ✓   |  ✓   |    –     |     –      |    –     |
| orders.approve (final decision & prices) |   ✓   |  –   |    –     |     –      |    –     |
| messages.send                            |   ✓   |  ✓   |    –     |     –      |    ✓     |
| mockups.manage                           |   ✓   |  –   |    ✓     |     –      |    –     |
| production.update                        |   ✓   |  –   |    –     |     ✓      |    –     |
| payments.record                          |   ✓   |  –   |    –     |     –      |    ✓     |
| payments.confirm                         |   ✓   |  –   |    –     |     –      |    –     |
| delivery.handover                        |   ✓   |  –   |    –     |     –      |    ✓     |
| catalog.manage                           |   ✓   |  –   |    –     |     –      |    –     |
| gallery.manage                           |   ✓   |  –   |    ✓     |     –      |    –     |
| content.manage                           |   ✓   |  –   |    ✓     |     –      |    –     |
| traffic.view                             |   ✓   |  –   |    –     |     –      |    –     |
| team.activity.view                       |   ✓   |  –   |    –     |     –      |    –     |
| accounts.manage                          |   ✓   |  –   |    –     |     –      |    –     |

The admin can toggle any non-admin cell. Changes are audited.

### B10. Screens (see `docs/design/`)

**Public**: Home (desktop/tablet/mobile), Service page, Request builder (desktop + mobile), Confirmation, Tracking (link entry, OTP, wrong phone, bad link, tracking views for both paths).

**Dashboard** (nav built from permissions):

- Orders (+ mobile), Traffic (+ mobile), Products & services, Gallery (consent rule), Contact & content (contact info, hero texts, WhatsApp templates, reviews), Team activity, Accounts & permissions.
- Team workspaces:
  - **Desk**: queue + quote draft → "send to admin for approval".
  - **Designer**: mockup queue, change requests, file quality, upload a new version → goes to the desk.
  - **Production**: 4-column board, counters, QC checklist, names sheet.
  - **Delivery**: ready list, handover verification by the last 3 phone digits, payment recording, invoices.
- Forbidden page with "request access".

**Team activity page (admin)**:

- "Waiting for your decision": quote drafts, payments to confirm, forwarded orders, permission requests — each with approve/return actions.
- Member cards with today / 7-day / 30-day counts.
- Activity feed filterable by member and type, alerts (no response > X hours, wrong handover code twice, pending invites), sensitive-data access log, CSV export.

**File limits**: max 20 MB per file `[pending confirmation]`. Types as in A6.5.

### B11. Content & site

- Gallery items are published only with customer consent; captions are editable.
- Reviews are real, with consent only. Empty state until real reviews exist.
- Editable site texts: hero title/subtitle, contact info (WhatsApp, address `[pending]`, hours `[pending]`).
- Security settings: global 2FA, new-device alert, auto sign-out after inactivity `[duration pending]`.

### B12. Traffic dashboard

- Visitors, sessions, top pages, sources, devices, funnel (home → request builder → submitted), live visitors.
- Read from the analytics provider through `AnalyticsReader` (Plausible or GA4, pending). Show a "demo data" notice until connected.

### B13. Open decisions (mark as `[pending]` in code and UI; do not invent values)

1. Deposit percentage and accepted payment methods.
2. Invoice type (regular or e-invoice).
3. Quote validity period; tracking link and invitation expiry.
4. Number of free mockup revisions.
5. Max file size (assumed 20 MB).
6. OTP channel: WhatsApp Business API vs SMS fallback.
7. Analytics provider (Plausible vs GA4).
8. Delivery areas, fees and pickup address/hours.
9. First-response SLA for the desk (used by alerts).
10. Final production domain.

### B14. Non-functional requirements

- Mobile-first for customers; most traffic comes from WhatsApp links on phones.
- LCP < 2.5 s on 4G for public pages; images via `next/image`.
- Accessibility WCAG 2.1 AA.
- All customer-facing copy in Egyptian Arabic; Western digits.
- Every money/state change is auditable and reversible only through a new event (no silent edits).
- Personal data minimisation; phone numbers masked by default in the dashboard.
