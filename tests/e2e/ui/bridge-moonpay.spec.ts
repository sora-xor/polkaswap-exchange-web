import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, expectHash, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const metrics = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    return { viewportWidth, docScrollWidth, bodyScrollWidth };
  });

  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
};

const expectLocatorWithinViewport = async (page: Page, selector: string): Promise<void> => {
  const metrics = await page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.top).toBeGreaterThanOrEqual(-1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
};

const openBridge = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/bridge`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/bridge');
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('renders the bridge form shell and CTA', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);

  await expect(page.locator('.bridge')).toBeVisible();
  await expect(page.getByRole('heading', { name: /hashi bridge/i })).toBeVisible();
  await expect(page.locator('[data-test-name="nextButton"]')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('restores bridge network selector trigger clickability immediately after closing dialog', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);

  const networkTrigger = page.locator('.bridge .el-button--settings').first();
  const networkDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select network/i })
    .first();

  await expect(networkTrigger).toBeVisible();
  await networkTrigger.click();
  await expect(networkDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(networkDialog).toHaveCount(0);

  await networkTrigger.click({ trial: true, timeout: 100 });
  await networkTrigger.click();
  await expect(networkDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('keeps bridge network selector dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.setViewportSize({ width: 280, height: 640 });
  await openBridge(page);

  const networkTrigger = page.locator('.bridge .el-button--settings').first();
  const networkDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select network/i })
    .first();

  await expect(networkTrigger).toBeVisible();
  await networkTrigger.click();
  await expect(networkDialog).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.dialog-card');

  expect(consoleErrors).toEqual([]);
});

test('restores bridge asset selector trigger clickability immediately after closing dialog', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);

  const assetTrigger = page.locator('.bridge .token-select-button').first();
  const assetDialog = page.locator('.asset-select').first();

  await expect(assetTrigger).toBeVisible();
  await assetTrigger.click();
  await expect(assetDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(assetDialog).toHaveCount(0);

  await assetTrigger.click({ trial: true, timeout: 100 });
  await assetTrigger.click();
  await expect(assetDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('keeps bridge asset selector dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.setViewportSize({ width: 280, height: 640 });
  await openBridge(page);

  const assetTrigger = page.locator('.bridge .token-select-button').first();
  const assetDialog = page.locator('.asset-select').first();

  await expect(assetTrigger).toBeVisible();
  await assetTrigger.click();
  await expect(assetDialog).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.asset-select');

  expect(consoleErrors).toEqual([]);
});

test('restores bridge account connect trigger clickability immediately after closing connect dialog', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);

  const connectTrigger = page.locator('.bridge .account-panel-button').first();
  const connectDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(connectTrigger).toBeVisible();
  await connectTrigger.click();
  await expect(connectDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(connectDialog).toHaveCount(0);

  await connectTrigger.click({ trial: true, timeout: 100 });
  await connectTrigger.click();
  await expect(connectDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('keeps bridge connect dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.setViewportSize({ width: 280, height: 640 });
  await openBridge(page);

  const connectTrigger = page.locator('.bridge .account-panel-button').first();
  const connectDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(connectTrigger).toBeVisible();
  await connectTrigger.click();
  await expect(connectDialog).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.dialog-card');

  expect(consoleErrors).toEqual([]);
});

test('does not leak bridge network dialog overlay after hash navigation to swap', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);

  const networkTrigger = page.locator('.bridge .el-button--settings').first();
  const networkDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select network/i })
    .first();

  await expect(networkTrigger).toBeVisible();
  await networkTrigger.click();
  await expect(networkDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await expectHash(page, '#/swap');
  await ensureAppLoaded(page);
  await expect(networkDialog).toHaveCount(0);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();
  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 100 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('shows MoonPay purchase option on the deposit page', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/deposit`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/deposit');

  const moonpayCard = page.locator('.pay-options-moonpay');
  await expect(moonpayCard).toBeVisible();
  await expect(moonpayCard.getByRole('heading', { name: /moonpay/i })).toBeVisible();
  await expect(moonpayCard.getByRole('button')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
