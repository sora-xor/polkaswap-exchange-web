import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, ipfsBasePath } from './support/ipfs';

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

const isIgnorableLiveRuntimeError = (message: string): boolean => {
  return message.includes('Failed to load resource: net::ERR_CERT_COMMON_NAME_INVALID');
};

const trackStrictConsole = (page: Page): string[] => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const entry = `[console.${message.type()}] ${message.text()}`;
    if (isIgnorableLiveRuntimeError(entry)) return;
    errors.push(entry);
  });

  page.on('pageerror', (error) => {
    const entry = `[pageerror] ${error.message}`;
    if (isIgnorableLiveRuntimeError(entry)) return;
    errors.push(entry);
  });

  return errors;
};

test.describe('live runtime smoke', () => {
  test.skip(!process.env.PS_E2E_LIVE_NETWORK, 'Enable with PS_E2E_LIVE_NETWORK=1');

  test('keeps core shell interactions functional without network stubbing', async ({ page }) => {
    const consoleErrors = trackStrictConsole(page);

    await page.goto(`${ipfsBasePath}/#/swap`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    const settingsTrigger = page.locator('.app-header-menu i.s-icon-grid-block-align-left-24').first();
    const settingsOverlay = page.locator('.header-menu');

    await settingsTrigger.click();
    await expect(settingsOverlay).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(settingsOverlay).toHaveCount(0);

    const infoTrigger = page.locator('.app-menu .menu-item--small').first();
    const infoPopover = page.locator('.app-info-popper');

    await infoTrigger.click();
    await expect(infoPopover).toBeVisible();
    await infoPopover.getByRole('button', { name: /get sora wallet/i }).click();
    await expect(page.locator('.popup-mobile')).toBeVisible();

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps mobile menu and swap controls functional without network stubbing', async ({ page }) => {
    const consoleErrors = trackStrictConsole(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${ipfsBasePath}/#/swap`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    const menuButton = page.locator('.app-menu-button');
    const menu = page.locator('.app-menu');

    await menuButton.click();
    await expect(menu).toHaveClass(/is-open/);

    await page.getByRole('link', { name: 'Bridge', exact: true }).first().click();
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await expect(menu).toHaveClass(/is-closed/);

    await menuButton.click();
    await expect(menu).toHaveClass(/is-open/);
    await page.getByRole('link', { name: 'Swap', exact: true }).first().click();
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );

    const settingsButton = page.locator('.el-button--settings').first();
    const settingsDialog = page.locator('.market-algorithm');
    await settingsButton.click();
    await expect(settingsDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settingsDialog).toHaveCount(0);

    await menuButton.click();
    await expect(menu).toHaveClass(/is-open/);

    const infoTrigger = page.locator('.app-menu .menu-item--small').first();
    const infoPopover = page.locator('.app-info-popper');
    await infoTrigger.click();
    await expect(infoPopover).toBeVisible();
    await infoPopover.getByRole('button', { name: /get sora wallet/i }).click();
    await expect(page.locator('.popup-mobile')).toBeVisible();
    await expect(menu).toHaveClass(/is-closed/);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });
});
