# Youzersef (يوزرسيف)

Ordering and tracking site for the Youzersef print shop in Aswan. The full requirements live in [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md).

## Prerequisites

- Node.js 24 LTS (`.nvmrc`)
- pnpm 12

## Local setup

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Scripts

| Script           | What it does                     |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start the dev server (Turbopack) |
| `pnpm build`     | Production build                 |
| `pnpm lint`      | ESLint                           |
| `pnpm typecheck` | Generate route types and run tsc |
| `pnpm format`    | Format with Prettier             |

Commits follow Conventional Commits; Husky runs lint-staged on commit and commitlint on the message.

## Reference material

- `docs/schema.sql` — database ERD
- `docs/design/` — HTML design export (open `index.html`)
