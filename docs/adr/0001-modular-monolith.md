# ADR-0001: Modular monolith

- Status: accepted
- Date: 2026-10-23

## Context

Youzersef is one small team running one shop. The product spans public pages, a request builder,
customer tracking and a staff dashboard with five roles. We need clear boundaries so features in
later phases (quotes, mockups, production, delivery) slot in without rework, but not the
operational cost of separate services.

## Decision

One Next.js app, organised by business module under `src/modules/<name>/`:

| Layer             | May import                                    | Must not                          |
| ----------------- | --------------------------------------------- | --------------------------------- |
| `domain/`         | other pure code (`@/lib/result`, rbac keys)   | React, Next, Drizzle, `fetch`, IO |
| `application/`    | its own domain + infrastructure, other modules' `index.ts` | UI                   |
| `infrastructure/` | Drizzle, Blob, HTTP providers                 | UI                                |
| `ui/`             | components, its own module                    | DB                                |

- Modules talk to each other only through their `index.ts`. `schemas.ts` is the one extra entry
  point, because client forms share Zod schemas with server actions.
- Both rules are enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`).
- Server actions and route handlers stay thin: parse, resolve the session, call one use case,
  map the result to `ActionResult`.
- Every state change the customer or admin can see writes `order_events` and `activity_logs` in
  the same transaction (`orders/application/apply-transition.ts`).

## Consequences

- One deploy, one database, simple local setup.
- Boundaries are lint rules, not network calls, so they can erode if the rules are bypassed.
  Review deep imports in PRs.
- A module can later move behind a queue or service, because its public API is already explicit.
