# Youzersef (يوزرسيف)

Ordering and tracking site for the Youzersef print shop in Aswan. Requirements live in
[docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md), architecture in
[docs/architecture.md](docs/architecture.md), and decisions in [docs/adr/](docs/adr/).

## Prerequisites

- Node.js 24 LTS (`.nvmrc`) and pnpm 12 (`npm i -g pnpm`)
- Postgres 17: `docker compose up -d`, or a Neon branch URL

## Local setup (5 commands)

```bash
pnpm install
cp .env.example .env            # fill the secrets and SEED_ADMIN_*; also copy to .env.local
docker compose up -d            # local Postgres (skip if DATABASE_URL points to Neon)
pnpm db:migrate && pnpm db:seed
pnpm dev                        # http://localhost:3000 — staff login at /login
```

Generate each secret with `openssl rand -base64 32`. Every variable is described in
[.env.example](.env.example). The app refuses to start if one is missing or invalid (`src/env-schema.ts`).

## Scripts

| Script                  | What it does                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`              | Dev server (Turbopack)                                                        |
| `pnpm build` / `start`  | Production build / server                                                     |
| `pnpm lint`             | ESLint, including module-boundary and pure-domain rules                       |
| `pnpm typecheck`        | Route types + `tsc`                                                           |
| `pnpm format`           | Prettier                                                                      |
| `pnpm test`             | Unit tests (Vitest): domain, lifecycle, helpers                               |
| `pnpm test:integration` | Integration tests on a fresh in-memory Postgres (PGlite) with real migrations |
| `pnpm e2e`              | Playwright smoke tests (needs a migrated + seeded DB and `pnpm build`)        |
| `pnpm db:generate`      | New SQL migration from `src/db/schema` (commit it)                            |
| `pnpm db:migrate`       | Apply migrations (direct/unpooled connection)                                 |
| `pnpm db:check`         | Check migration consistency                                                   |
| `pnpm db:seed`          | Idempotent seed: roles, permissions, catalog, templates, settings, admin      |
| `pnpm db:studio`        | Drizzle Studio                                                                |

Set `SEED_DEMO=true` to add clearly marked `[تجريبي]` demo orders. Never use it in production.

Commits follow Conventional Commits. Husky runs lint-staged on commit and commitlint on the message.

## Deploying (Vercel)

1. Import the GitHub repo in Vercel. The `fra1` region and crons come from `vercel.json`.
2. Add the integrations:
   - **Neon**: sets `DATABASE_URL` / `DATABASE_URL_UNPOOLED`, with a branch per preview. Create
     the project in Frankfurt.
   - **Vercel Blob**: sets `BLOB_READ_WRITE_TOKEN`.
   - **Upstash Redis**: sets `UPSTASH_REDIS_REST_*`. Required in production.
3. Set the remaining variables from `.env.example`: secrets, `APP_URL`, Sentry, `CRON_SECRET`.
4. The build runs `pnpm db:migrate && pnpm build`. Run `pnpm db:seed` once per new database with
   that environment's variables.
5. The every-minute `messages:dispatch` cron needs Vercel Pro. On Hobby, crons run daily at most.

Health check: `GET /api/health` returns DB status and the deployed commit.

## Reference material

- `docs/schema.sql`: database ERD (source for `src/db/schema`)
- `docs/design/`: HTML design export (open `index.html`). Rebuilt with real components, not copied.
