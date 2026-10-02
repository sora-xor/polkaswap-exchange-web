import { defineConfig, devices } from '@playwright/test';

/** A separate Vite server keeps these component browser flows clear of the production IPFS preview. */
export default defineConfig({
  testDir: '../ui',
  testMatch: 'bot-discovery-harness.spec.ts',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:41879',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node .yarn/releases/yarn-4.10.3.cjs vite --config tests/e2e/discovery-harness/vite.config.mjs',
    cwd: process.cwd(),
    url: 'http://127.0.0.1:41879',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
