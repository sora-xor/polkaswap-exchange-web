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

const clearToastNotifications = async (page: Page): Promise<void> => {
  const toastItem = page.locator('.s-toasts-display__item').first();

  await toastItem.waitFor({ state: 'detached', timeout: 1_000 }).catch(async () => {
    await page.evaluate(() => {
      document.querySelectorAll('.s-toasts-display__item').forEach((node) => node.remove());
    });
  });
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

const installPolkadotJsProvider = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const injectedWindow = window as typeof window & {
      __PS_BRIDGE_SIGN_REQUESTS__?: number;
      injectedWeb3?: Record<string, unknown>;
    };
    const account = {
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      name: 'Mainnet Liberland',
      source: 'polkadot-js',
      type: 'sr25519',
      genesisHash: null,
    };
    const accounts = {
      get: async () => [account],
      subscribe: async (callback: (items: (typeof account)[]) => void) => {
        callback([account]);
        return () => undefined;
      },
    };
    const rejectSigning = async () => {
      injectedWindow.__PS_BRIDGE_SIGN_REQUESTS__ = (injectedWindow.__PS_BRIDGE_SIGN_REQUESTS__ ?? 0) + 1;
      throw new Error('Bridge readiness test must not request a signature');
    };

    injectedWindow.__PS_BRIDGE_SIGN_REQUESTS__ = 0;
    injectedWindow.injectedWeb3 = {
      ...(injectedWindow.injectedWeb3 ?? {}),
      'polkadot-js': {
        version: 'e2e',
        enable: async () => ({
          name: 'polkadot-js',
          version: 'e2e',
          accounts,
          metadata: undefined,
          provider: undefined,
          signer: {
            signPayload: rejectSigning,
            signRaw: rejectSigning,
          },
        }),
      },
    };
  });
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
      const bridgeWindow = window as typeof window & { __PS_BRIDGE_MANUAL_CONNECT_REQUESTS__?: number };

      const node = {
        chain: 'Liberland',
        name: 'Dwellir',
        address: 'wss://liberland-rpc.n.dwellir.com',
        location: 'EU',
      };

      const createApi = () => ({
        registry: { chainSS58: 42 },
        genesisHash: {
          toString: () => '0x',
        },
      });
      let connected = nodeIsConnected;
      let connectingAddress = '';
      let api = hasApi ? createApi() : undefined;

      const accountConnection = { api };
      const accountApi = {
        api,
        connection: accountConnection,
        address: '',
        account: null as null | { address: string; meta: Record<string, unknown> },
        signer: null as unknown,
        formatAddress: (value: string) => value,
        forgetAccount: () => undefined,
        logout: () => undefined,
        setSigner(signer: unknown) {
          this.signer = signer;
        },
        async loginAccount(address: string, name: string, source: string) {
          this.address = address;
          this.account = { address, meta: { name, source } };
        },
      };

      const networkConnection = { api };
      const subConnection = {
        get status() {
          // Subscribe consumers of the raw connection to the lightweight reactive snapshot.
          // The connection identity deliberately stays stable while its readiness changes.
          void bridgeStore?.connector?.connectionState?.connecting;
          void bridgeStore?.connector?.connectionState?.ready;

          return {
            node,
            nodeList: [node],
            defaultNodes: [node],
            customNodes: [],
            nodeAddressConnecting: connectingAddress,
            connectionAllowance: !connectingAddress,
            connected,
          };
        },
        get nodeIsConnected() {
          return connected;
        },
        get nodeAddressConnecting() {
          return connectingAddress;
        },
        get connectionAllowance() {
          return !connectingAddress;
        },
        node,
        nodeList: [node],
        defaultNodes: [node],
        customNodes: [],
        async connect(options: {
          node?: typeof node;
          manualSelection?: boolean;
          onConnect?: (selectedNode: typeof node) => void;
        }) {
          const selectedNode = options.node ?? node;

          if (options.manualSelection) {
            bridgeWindow.__PS_BRIDGE_MANUAL_CONNECT_REQUESTS__ =
              (bridgeWindow.__PS_BRIDGE_MANUAL_CONNECT_REQUESTS__ ?? 0) + 1;
          }

          connected = false;
          connectingAddress = selectedNode.address;
          publishConnectorState();

          await new Promise((resolve) => setTimeout(resolve, 25));

          api = createApi();
          accountApi.api = api;
          accountConnection.api = api;
          networkConnection.api = api;
          connected = true;
          connectingAddress = '';
          publishConnectorState();
          options.onConnect?.(selectedNode);
        },
        updateCustomNode: () => undefined,
        removeCustomNode: () => undefined,
      };
      const standalone = {
        subNetwork: 'Liberland',
        subNetworkConnection: subConnection,
        connection: networkConnection,
        formatAddress: (value: string) => value,
        getBlockNumber: async () => 0,
        stop: async () => undefined,
      };
      function publishConnectorState() {
        if (!bridgeStore) return;

        bridgeStore.connector = {
          accountApi,
          standalone,
          network: standalone,
          stop: async () => undefined,
          connectionState: {
            network: 'Liberland',
            connection: subConnection,
            connecting: Boolean(connectingAddress),
            ready: Boolean(connected && networkConnection.api?.registry && accountConnection.api?.registry),
          },
        };
      }

      bridgeWindow.__PS_BRIDGE_MANUAL_CONNECT_REQUESTS__ = 0;
      publishConnectorState();

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

const injectSoraBridgeAccount = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    const walletStore = pinia?._s?.get('wallet');

    if (!walletStore?.accountState) return;

    walletStore.accountState.address = 'cnT6GtrVo7AYsRc2LgfTgW8Gu4gpZpxhaaKMm7zH8Ry14pJ8b';
    walletStore.accountState.name = 'SORA QA';
    walletStore.accountState.source = 'polkadot-js';
    walletStore.accountState.isExternal = true;
  });
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

  await clearToastNotifications(page);
  await networkTrigger.click({ trial: true, timeout: 2_000 });
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

  await clearToastNotifications(page);
  await assetTrigger.click({ trial: true, timeout: 2_000 });
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

  await clearToastNotifications(page);
  await connectTrigger.click({ trial: true, timeout: 2_000 });
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

test('reconnects persisted Dwellir and selects a Polkadot.js Liberland account without signing', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await installPolkadotJsProvider(page);
  await openBridge(page);
  await injectSoraBridgeAccount(page);
  await injectLiberlandSubBridgeContext(page);

  await expect(page.locator('.input-title--network').nth(1)).toHaveText(/Liberland/i);
  const connectTrigger = page.getByRole('button', { name: /connect account/i }).last();
  const nodeDialog = page
    .getByRole('dialog')
    .filter({ hasText: /network node selection/i })
    .first();

  await connectTrigger.click();
  await expect(nodeDialog).toBeVisible();

  const dwellirNode = nodeDialog
    .getByRole('radio')
    .filter({ hasText: /Dwellir/i })
    .first();
  await expect(dwellirNode).toBeVisible();
  await expect(dwellirNode).toHaveAttribute('aria-checked', 'false');
  await dwellirNode.click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __PS_BRIDGE_MANUAL_CONNECT_REQUESTS__?: number })
            .__PS_BRIDGE_MANUAL_CONNECT_REQUESTS__ ?? 0
      )
    )
    .toBe(1);
  await expect(page.locator('.bridge .status--success').first()).toBeVisible();
  await expect(dwellirNode).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('Escape');
  await expect(nodeDialog).toHaveCount(0);

  await connectTrigger.click();

  const accountDialog = page.locator('[role="dialog"].account-select-dialog').first();
  await expect(accountDialog).toBeVisible();

  const polkadotJsWallet = accountDialog
    .locator('.account-card')
    .filter({ hasText: /Polkadot\{\.js\}/i })
    .first();
  await expect(polkadotJsWallet).toBeVisible();
  await polkadotJsWallet.click();

  const liberlandAccount = accountDialog
    .locator('.connection__accounts .account-card')
    .filter({ hasText: /Mainnet Liberland/i })
    .first();
  await expect(liberlandAccount).toBeVisible();
  await liberlandAccount.click();
  await expect(accountDialog).toHaveCount(0);

  const externalPanel = page.locator('.bridge .account-panel').nth(1);
  await expect(externalPanel).toContainText('Mainnet Liberland');
  await expect(externalPanel).toContainText(/5GrwvaEF5z.*KutQY/);

  const nextButton = page.locator('.bridge [data-test-name="nextButton"]');
  await expect(nextButton).toContainText(/choose.*token/i);
  await expect(nextButton).not.toHaveClass(/s-button_loading/);

  const state = await page.evaluate(() => {
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');

    return {
      address: web3Store?.subAddress,
      name: web3Store?.subAddressName,
      source: web3Store?.subAddressSource,
      manualConnectRequests: (window as typeof window & { __PS_BRIDGE_MANUAL_CONNECT_REQUESTS__?: number })
        .__PS_BRIDGE_MANUAL_CONNECT_REQUESTS__,
      signRequests: (window as typeof window & { __PS_BRIDGE_SIGN_REQUESTS__?: number }).__PS_BRIDGE_SIGN_REQUESTS__,
    };
  });

  expect(state).toEqual({
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    name: 'Mainnet Liberland',
    source: 'polkadot-js',
    manualConnectRequests: 1,
    signRequests: 0,
  });
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
  await clearToastNotifications(page);
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
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
