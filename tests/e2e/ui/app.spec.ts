import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, expectHash, ipfsBasePath, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('[object Promise]');
  expect(bodyText).not.toMatch(/\bNaN\b/);
};

test('renders the swap page shell', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/swap`);

  await expect.poll(async () => page.evaluate(() => window.location.pathname)).resolves.toBe(`${ipfsBasePath}/`);
  await ensureAppLoaded(page);
  await expect(page.evaluate(() => window.__PS_IPFS_CHECK__ === true)).resolves.toBe(true);

  await expect(page.locator('.header')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Swap' })).toBeVisible();
  await expect(page.locator('.app-main')).toHaveClass(/app-main--swap/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Connect account' }).first()).toBeVisible();
  await expectNoCorruptedUiText(page);

  expect(consoleErrors).toEqual([]);
});

test('loads the full app from a direct ipfs index file URL', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsBasePath}/index.html`);
  await page.waitForTimeout(500);

  const checks = await page.evaluate(() => ({
    isOfflineShell: window.__PS_IPFS_CHECK__ === true,
    hasHeader: !!document.querySelector('.header'),
    hasMenu: !!document.querySelector('.app-menu'),
    pathname: window.location.pathname,
    appMainClass: document.querySelector('.app-main')?.className ?? '',
  }));

  expect(checks.isOfflineShell).toBe(false);
  expect(checks.pathname).toBe(`${ipfsBasePath}/index.html`);
  expect(checks.hasHeader).toBe(true);
  expect(checks.hasMenu).toBe(true);
  expect(checks.appMainClass).toContain('app-main');

  await expectNoCorruptedUiText(page);
  expect(consoleErrors).toEqual([]);
});

test('renders offline preview on ipfs-check URL as expected', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.addInitScript(() => {
    window.__PS_FORCE_ONLINE__ = false;
  });

  await page.goto(`${ipfsBasePath}/index.html?ipfs-check=1`);
  await page.waitForTimeout(500);

  const checks = await page.evaluate(() => ({
    isOfflineShell: window.__PS_IPFS_CHECK__ === true,
    hasHeader: !!document.querySelector('.header'),
    hasMenu: !!document.querySelector('.app-menu'),
    pathText: document.body.innerText,
  }));

  expect(checks.isOfflineShell).toBe(true);
  expect(checks.hasHeader).toBe(false);
  expect(checks.hasMenu).toBe(false);
  expect(checks.pathText).toContain('Offline preview');

  expect(consoleErrors).toEqual([]);
});

test('navigates to the bridge form from the main menu', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/swap');

  await page.getByRole('link', { name: 'Bridge' }).click();
  await page.waitForTimeout(200);
  await expectNoCorruptedUiText(page);

  expect(consoleErrors).toEqual([]);
});

test.describe('loads primary routes directly', () => {
  const routes = [
    { hash: '#/swap', name: 'Swap', appClass: 'app-main--swap' },
    { hash: '#/bridge', name: 'Bridge', appClass: 'app-main--bridge' },
    { hash: '#/wallet', name: 'Wallet', appClass: 'app-main--wallet' },
    { hash: '#/kensetsu', name: 'Kensetsu', appClass: 'app-main--vaults' },
    {
      hash: '#/explore',
      name: 'Explore',
      appClass: 'app-main--explore/tokens',
      hashes: ['#/explore', '#/explore/tokens'],
    },
    { hash: '#/stats', name: 'Stats', appClass: 'app-main--stats' },
    { hash: '#/points', name: 'Rewards', appClass: 'app-main--pointsystemwrapper' },
  ];

  for (const route of routes) {
    test(`renders ${route.name} route under IPFS prefix`, async ({ page }) => {
      const consoleErrors = trackConsole(page);

      await page.goto(`${ipfsEntryUrl}${route.hash}`);
      await ensureAppLoaded(page);
      const acceptedHashes = route.hashes ?? [route.hash];
      await page.waitForFunction(
        (allowed) => {
          const current = window.location.hash;
          return allowed.some((expected) => current === expected || current.startsWith(`${expected}/`));
        },
        acceptedHashes,
        { timeout: 15_000 }
      );
      await page.waitForTimeout(200);

      const appMainClasses = await page.evaluate(() => document.querySelector('.app-main')?.className ?? '');
      expect(appMainClasses.split(/\s+/)).toContain(route.appClass);
      await expectNoCorruptedUiText(page);

      expect(consoleErrors).toEqual([]);
    });
  }
});
