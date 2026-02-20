import { expect, test, type Page } from '@playwright/test';

import { ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const corruptionPatterns = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];
const bodySamplesPerRoute = 6;
const bodySampleDelayMs = 250;

type RouteTarget = {
  target: string;
  acceptedHashes: string[];
};

const routeTargets: RouteTarget[] = [
  { target: '/swap', acceptedHashes: ['#/swap'] },
  { target: '/trade', acceptedHashes: ['#/trade'] },
  { target: '/rewards', acceptedHashes: ['#/rewards', '#/points'] },
  { target: '/pool', acceptedHashes: ['#/pool'] },
  { target: '/staking', acceptedHashes: ['#/staking'] },
  { target: '/bridge', acceptedHashes: ['#/bridge'] },
  { target: '/wallet', acceptedHashes: ['#/wallet'] },
  { target: '/kensetsu', acceptedHashes: ['#/kensetsu'] },
  { target: '/explore', acceptedHashes: ['#/explore'] },
  { target: '/stats', acceptedHashes: ['#/stats'] },
  // Protected route: unauthenticated users are redirected back to swap.
  { target: '/account', acceptedHashes: ['#/account', '#/swap'] },
];

const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of corruptionPatterns) {
    expect(bodyText).not.toMatch(pattern);
  }
};

const sampleNoCorruptedUiText = async (page: Page): Promise<void> => {
  for (let sample = 0; sample < bodySamplesPerRoute; sample += 1) {
    await page.waitForTimeout(bodySampleDelayMs);
    await expectNoCorruptedUiText(page);
  }
};

const ensureShellLoaded = async (page: Page): Promise<void> => {
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('#app').length)).resolves.toBe(1);
  await expect(page.locator('.header')).toBeVisible({ timeout: 15_000 });
};

const waitForAcceptedHash = async (page: Page, acceptedHashes: string[]): Promise<void> => {
  const accepted = acceptedHashes;
  await page.waitForFunction(
    (expectedHashes) => {
      const current = window.location.hash;
      return expectedHashes.some((expected) => current === expected || current.startsWith(`${expected}/`));
    },
    accepted,
    { timeout: 15_000 }
  );
};

const navigateInApp = async (page: Page, route: RouteTarget): Promise<void> => {
  await page.evaluate((target) => {
    window.location.hash = target;
  }, route.target);
  await waitForAcceptedHash(page, route.acceptedHashes);
  await sampleNoCorruptedUiText(page);
};

const runRouteCycles = async (page: Page, routes: RouteTarget[], rounds: number): Promise<void> => {
  for (let round = 0; round < rounds; round += 1) {
    for (const route of routes) {
      await navigateInApp(page, route);
    }
  }
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('keeps full route churn stable on desktop', async ({ page }) => {
  test.slow();
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureShellLoaded(page);
  await runRouteCycles(page, routeTargets, 3);

  expect(consoleErrors).toEqual([]);
});

test('keeps full route churn stable on mobile viewport', async ({ page }) => {
  test.slow();
  const consoleErrors = trackConsole(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureShellLoaded(page);
  await runRouteCycles(page, routeTargets, 2);

  expect(consoleErrors).toEqual([]);
});
