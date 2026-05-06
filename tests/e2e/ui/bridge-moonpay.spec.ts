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

const callWeb3Store = async (page: Page, action: string, payload?: unknown): Promise<void> => {
  await page.evaluate(
    ({ action, payload }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');

      return web3Store?.[action]?.(payload);
    },
    { action, payload }
  );
};

const injectLiberlandSubBridgeContext = async (
  page: Page,
  {
    nodeIsConnected = false,
    hasApi = false,
  }: {
    nodeIsConnected?: boolean;
    hasApi?: boolean;
  } = {}
): Promise<void> => {
  await page.waitForTimeout(2_000);

  await page.evaluate(
    ({ nodeIsConnected, hasApi }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const bridgeStore = pinia?._s?.get('bridge');
      const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');

      const node = {
        chain: 'Liberland',
        name: 'Dwellir',
        address: 'wss://liberland-rpc.dwellir.com',
        location: 'EU',
      };

      const subConnection = {
        nodeIsConnected,
        nodeAddressConnecting: '',
        connectionAllowance: true,
        node,
        nodeList: [node],
        defaultNodes: [node],
        customNodes: [],
        connect: async () => undefined,
        updateCustomNode: () => undefined,
        removeCustomNode: () => undefined,
      };

      const applyConnectorState = (connector?: Record<string, any>) => {
        if (!connector) return;

        connector.standalone = {
          subNetwork: 'Liberland',
          subNetworkConnection: subConnection,
          formatAddress: (value: string) => value,
          getBlockNumber: async () => 0,
          stop: async () => undefined,
        };
        connector.accountApi = {
          connection: { api: hasApi ? {} : undefined },
          formatAddress: (value: string) => value,
        };
      };

      applyConnectorState(bridgeStore?.connector);

      if (web3Store) {
        web3Store.networkType = 'Sub';
        web3Store.networkSelected = 'Liberland';
        web3Store.subNetworkApps = { Liberland: true };
        web3Store.supportedApps = {
          EVMLegacy: {},
          EVM: {},
          Sub: ['Liberland'],
        };
      }
      web3Store?.setSubAccountDialogVisibility?.(false);
      web3Store?.setSelectSubNodeDialogVisibility?.(false);
    },
    { nodeIsConnected, hasApi }
  );
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('renders the bridge form shell and CTA', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);

  await expect(page.locator('.bridge')).toBeVisible();
  await expect(page.getByRole('heading', { name: /hashi bridge/i })).toBeVisible();
  await expect(page.locator('.bridge .account-panel-button').first()).toBeVisible();

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

test('opens the Liberland node selector instead of the sub-account dialog when the bridge connector is offline', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);
  await injectLiberlandSubBridgeContext(page);
  await expect(page.locator('.input-title--network').nth(1)).toHaveText(/Liberland/i);

  const connectTrigger = page.locator('.bridge .account-panel-button').nth(1);
  const nodeDialog = page
    .getByRole('dialog')
    .filter({ hasText: /network node selection/i })
    .first();
  const subAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(connectTrigger).toBeVisible();
  await connectTrigger.click();
  await expect(nodeDialog).toBeVisible();
  await expect(subAccountDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('redirects Liberland sub-account selection to node selection when the connector API is unavailable', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);

  await openBridge(page);
  await injectLiberlandSubBridgeContext(page);

  await callWeb3Store(page, 'selectSubAccount', {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    name: 'Liberland QA',
    source: 'polkadot-js',
  });

  const nodeDialog = page
    .getByRole('dialog')
    .filter({ hasText: /network node selection/i })
    .first();
  const subAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(nodeDialog).toBeVisible();
  await expect(subAccountDialog).toHaveCount(0);

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
