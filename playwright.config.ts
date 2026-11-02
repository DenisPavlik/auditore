import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks of the site as a guest and as the demo account sees it.
 * They never write to the database (the bookings they start are never confirmed),
 * so they can run against the dev server or against production:
 *
 *   bun run e2e                                          # dev server on :3210, started if needed
 *   E2E_URL=https://auditore-seven.vercel.app bun run e2e
 */
const baseURL = process.env.E2E_URL ?? "http://localhost:3210";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_URL ? undefined : { command: "bun run dev -- -p 3210", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
