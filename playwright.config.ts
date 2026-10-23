import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);

/** Smoke tests against a production build (brief A9 step 10). Needs a migrated + seeded DB. */
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
