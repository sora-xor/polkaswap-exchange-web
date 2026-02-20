import { defineConfig, devices } from '@playwright/test';

const serverHost = '127.0.0.1';
const serverPort = Number(process.env.PS_IPFS_TEST_PORT ?? 41733);
const shouldReuseExistingServer = process.env.PS_PLAYWRIGHT_REUSE_SERVER === '1' && !process.env.CI;
const ipfsPrefix = (() => {
  const raw = process.env.PS_IPFS_TEST_PREFIX ?? '/ipfs/polkaswap-e2e';
  const trimmed = raw.trim();
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = normalized.replace(/\/+$/, '');
  process.env.PS_IPFS_TEST_PREFIX = withoutTrailingSlash;
  return withoutTrailingSlash;
})();
const baseURL = `http://${serverHost}:${serverPort}`;

export default defineConfig({
  testDir: './tests/e2e/ui',
  fullyParallel: false,
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.70 Safari/537.36',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.70 Safari/537.36',
      },
    },
  ],
  webServer: {
    command: `yarn build && node ./scripts/testing/ipfs-preview-server.mjs --host ${serverHost} --port ${serverPort} --prefix ${ipfsPrefix}`,
    url: baseURL,
    reuseExistingServer: shouldReuseExistingServer,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PS_IPFS_CHECK_FORCE_ONLINE: 'true',
      PS_IPFS_TEST_PREFIX: ipfsPrefix,
      PS_IPFS_TEST_PORT: String(serverPort),
    },
  },
});
