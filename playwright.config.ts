import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const baseURL = testDatabaseUrl ? "http://127.0.0.1:3001" : "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./src/e2e",
  fullyParallel: true,
  globalSetup: "./src/e2e/global-setup.ts",
  webServer: {
    command: testDatabaseUrl ? "npm run dev -- --port 3001" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !testDatabaseUrl,
    timeout: 120_000,
    env: testDatabaseUrl
      ? {
          DATABASE_URL: testDatabaseUrl,
          NEXT_DIST_DIR: ".next-test",
          OPENROUTER_API_KEY: ""
        }
      : undefined
  },
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 15"] } }
  ]
});
