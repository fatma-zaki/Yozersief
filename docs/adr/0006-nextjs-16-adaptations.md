# ADR-0006: Next.js 16 adaptations to the brief

- Status: accepted
- Date: 2026-10-23

The brief predates two Next.js 16 changes. Neither swaps a fixed technology; they change file
names and rendering patterns.

1. **`middleware.ts` is now `proxy.ts`.** The brief's `src/middleware.ts` (auth gate + security
   headers) lives in `src/proxy.ts`, with the same responsibilities.
2. **Cache Components (`cacheComponents: true`) is on.** Public pages prerender into static shells,
   which helps the LCP < 2.5s target. As a result:
   - Anything that reads cookies or headers (the session) must sit inside `<Suspense>`. The
     dashboard layout streams the sidebar, user menu and page body behind boundaries.
   - Request-time `params` on dynamic routes also need a boundary, unless the route has
     `generateStaticParams` (services do).
   - Shared data uses `'use cache'` + `cacheTag`/`cacheLife` (role permissions, settings).
   - A `forbidden()` raised after streaming starts renders the forbidden UI with HTTP 200 instead
     of 403. Authorisation is still enforced on the server; only the status code differs.
3. **CSP without nonces.** Nonce-based CSP would make every page dynamic. We ship
   `script-src 'self' 'unsafe-inline'` with `frame-ancestors 'none'` and strict defaults. Revisit
   if third-party scripts are added.
4. **`forbidden()` needs `experimental.authInterrupts`**, which is enabled in `next.config.ts`.
