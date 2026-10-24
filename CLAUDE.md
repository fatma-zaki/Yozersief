@AGENTS.md

# Youzersef

Read `docs/PROJECT_BRIEF.md` end to end before working. When code and the brief disagree, the
brief wins until it is updated. Architecture: `docs/architecture.md`. Decisions: `docs/adr/`.
Next 16 differences from the brief (proxy.ts, Cache Components): ADR-0006.

Conventions (brief A3–A5):

- Next.js App Router, Server Components first. Client components are named `*.client.tsx`.
- Anything that reads the session goes inside `<Suspense>` (Cache Components).
- TypeScript strict + `noUncheckedIndexedAccess`. No `any` without a comment explaining why.
- Modules live in `src/modules/<name>/{domain,application,infrastructure,ui}`. Other code imports
  only `@/modules/<name>` or `@/modules/<name>/schemas`; ESLint enforces it.
- Domain code is pure: no React, Next, Drizzle or IO.
- No Drizzle in `src/app/`. Actions and routes are thin: Zod parse → `requirePermission` → one use
  case → `ActionResult`.
- Every use case starts with `assertCan`. Visible state changes write `order_events` +
  `activity_logs` (+ outbox) in one transaction.
- UI copy is Modern Standard Arabic (فصحى), RTL, Western digits, kept in `src/i18n/ar.ts`. Open decisions (B13)
  show as `[للتأكيد]`; never invent values.
- Money is `numeric(12,2)` ↔ string (`lib/money.ts`). Time is `timestamptz`, shown in `Africa/Cairo`
  (`lib/format.ts`).
- After a schema change, run `pnpm db:generate` and commit the migration.
- Conventional Commits (commitlint). Never commit secrets. pnpm, Node 24.
