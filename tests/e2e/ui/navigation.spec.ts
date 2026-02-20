import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, expectHash, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const longTimeout = 15_000;
const corruptionPatterns = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];

const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of corruptionPatterns) {
    expect(bodyText).not.toMatch(pattern);
  }
};

const openSwap = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/swap');
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('supports sidebar navigation across major routes', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const menu = page.locator('.app-menu');
  const navTargets = [
    'Swap',
    'Trade',
    'Rewards',
    'Pool',
    'Staking',
    'Bridge',
    'Account',
    'Kensetsu',
    'Explore',
    'Statistics',
  ];

  for (const label of navTargets) {
    const link = menu.getByRole('link', { name: label, exact: true }).first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(200);
    await expectNoCorruptedUiText(page);
  }

  expect(consoleErrors).toEqual([]);
});

test('keeps header settings in dropdown', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  await expect(page.locator('.settings-control')).toBeVisible();
  await expect(page.locator('.app-header [data-test-name="language"]')).toHaveCount(0);
  await expect(page.locator('.app-header [data-test-name="currency"]')).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('collapses and expands the sidebar menu', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const sidebar = page.locator('.app-menu');
  const collapseButton = sidebar.locator('.collapse-button');

  await expect(sidebar).not.toHaveClass(/collapsed/);
  await collapseButton.click();
  await expect(sidebar).toHaveClass(/collapsed/);
  await collapseButton.click();
  await expect(sidebar).not.toHaveClass(/collapsed/);

  expect(consoleErrors).toEqual([]);
});
