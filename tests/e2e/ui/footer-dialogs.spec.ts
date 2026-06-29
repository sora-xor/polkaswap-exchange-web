import { expect, test, type Locator, type Page } from '@playwright/test';

import { ensureAppLoaded, expectHash, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const swapRouteHash = '#/swap';
const bridgeRouteHash = '#/bridge';

const openSwap = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}${swapRouteHash}`);
  await ensureAppLoaded(page);
  await expectHash(page, swapRouteHash);
};

const goToSwap = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await expectHash(page, swapRouteHash);
  await ensureAppLoaded(page);
};

const expectSwapSettingsClickable = async (page: Page): Promise<void> => {
  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(swapSettingsDialog).toHaveCount(0);
};

const footerStatusItemAt = (page: Page, index: number): Locator =>
  page.locator('.app-status .app-status__item').nth(index);

const openFooterActionDialog = async (
  page: Page,
  options: {
    statusIndex: number;
    actionName: RegExp;
    dialog: Locator;
  }
): Promise<void> => {
  const popover = page.locator('.app-status__tooltip').first();
  const item = footerStatusItemAt(page, options.statusIndex);

  await expect(item).toBeVisible();
  await item.click({ trial: true, timeout: 2_000 });
  await item.click();
  await expect(popover).toHaveCount(1);

  await popover.getByRole('button', { name: options.actionName }).click();
  await expect(options.dialog).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('keeps footer node dialog parity across escape/outside/hash/breakpoint and reopen cycles', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const nodeDialog = page
    .getByRole('dialog')
    .filter({ hasText: /network node selection/i })
    .first();

  await openFooterActionDialog(page, {
    statusIndex: 0,
    actionName: /select network node/i,
    dialog: nodeDialog,
  });

  await page.keyboard.press('Escape');
  await expect(nodeDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  await openFooterActionDialog(page, {
    statusIndex: 0,
    actionName: /select network node/i,
    dialog: nodeDialog,
  });

  await page.mouse.click(10, 10);
  await expect(nodeDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  await openFooterActionDialog(page, {
    statusIndex: 0,
    actionName: /select network node/i,
    dialog: nodeDialog,
  });

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, bridgeRouteHash);
  await ensureAppLoaded(page);
  await expect(nodeDialog).toHaveCount(0);

  await goToSwap(page);
  await expectSwapSettingsClickable(page);

  await openFooterActionDialog(page, {
    statusIndex: 0,
    actionName: /select network node/i,
    dialog: nodeDialog,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nodeDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  await openFooterActionDialog(page, {
    statusIndex: 0,
    actionName: /select network node/i,
    dialog: nodeDialog,
  });

  await page.keyboard.press('Escape');
  await expect(nodeDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});

test('renders the footer indexer block as static non-clickable status text', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const indexerBlock = page.locator('.app-status .indexer-block').first();
  const indexerDialog = page
    .getByRole('dialog')
    .filter({ hasText: /statistics services/i })
    .first();

  await expect(indexerBlock).toBeVisible();
  await expect(indexerBlock).toContainText(/(?:Polkaswap Indexer|SoraMetrics) Block #/i);
  await indexerBlock.click({ trial: true, timeout: 2_000 });
  await indexerBlock.click();
  await expect(page.locator('.app-status__tooltip')).toHaveCount(0);
  await expect(indexerDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, bridgeRouteHash);
  await ensureAppLoaded(page);
  await expect(indexerDialog).toHaveCount(0);

  await goToSwap(page);
  await expect(indexerBlock).toBeVisible();
  await expect(indexerBlock).toContainText(/(?:Polkaswap Indexer|SoraMetrics) Block #/i);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(indexerDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});
