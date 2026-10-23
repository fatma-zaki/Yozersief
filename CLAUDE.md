@AGENTS.md

# Youzersef

Read `docs/PROJECT_BRIEF.md` end to end before working. When code and the brief disagree, the brief wins until it is updated.

Short version of the conventions (brief A3–A5):

- Next.js App Router, Server Components first; client components are named `*.client.tsx`.
- TypeScript strict + `noUncheckedIndexedAccess`; no `any` without a comment explaining why.
- Modular monolith under `src/modules/<name>/{domain,application,infrastructure,ui}`; other modules import only `@/modules/<name>` (enforced by ESLint).
- Domain code is pure: no React, Next, Drizzle or IO.
- No Drizzle calls inside `src/app/`; data access goes through module repositories.
- UI copy is Egyptian Arabic, RTL, Western digits, kept in `src/i18n/ar.ts`.
- Money is `numeric(12,2)` as strings; time is `timestamptz` shown in `Africa/Cairo`.
- Conventional Commits (enforced by commitlint). Never commit secrets.
- Package manager: pnpm. Node 24 LTS.
