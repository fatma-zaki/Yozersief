import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);

/**
 * Playwright against a production build (brief A9 step 10 + tracking ADR-0007).
 * Smoke + seeded tracking specs need a migrated DB + `pnpm tsx scripts/seed-e2e.ts`.
 * Tracking specs that only exercise redirects / cookie UX / client validation run without DB.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "ar-EG",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
