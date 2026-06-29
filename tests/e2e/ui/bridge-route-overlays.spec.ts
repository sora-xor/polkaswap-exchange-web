import { expect, test, type Locator, type Page } from '@playwright/test';

import { ensureAppLoaded, expectHash, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const bridgeRouteHash = '#/bridge';
const swapRouteHash = '#/swap';

const openBridge = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}${bridgeRouteHash}`);
  await ensureAppLoaded(page);
  await expectHash(page, bridgeRouteHash);
  await expect(page.locator('.bridge')).toBeVisible();
};

const goToSwap = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await expectHash(page, swapRouteHash);
  await ensureAppLoaded(page);
};

const goToBridge = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, bridgeRouteHash);
  await ensureAppLoaded(page);
  await expect(page.locator('.bridge')).toBeVisible();
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

const callWeb3Store = async (page: Page, action: string, payload?: unknown): Promise<void> => {
  await page.evaluate(
    ({ action, payload }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');

      web3Store?.[action]?.(payload);
    },
    { action, payload }
  );
};

const installDuplicateEip6963Announcements = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const browserWindow = window as typeof window & {
      __PS_E2E_EIP6963_STATE__?: { requestCount: number };
    };
    const providers = [
      { uuid: 'ps-e2e-provider-alpha', name: 'E2E Alpha Wallet', rdns: 'io.polkaswap.e2e.alpha' },
      { uuid: 'ps-e2e-provider-beta', name: 'E2E Beta Wallet', rdns: 'io.polkaswap.e2e.beta' },
    ];

    browserWindow.__PS_E2E_EIP6963_STATE__ = { requestCount: 0 };

    const announceProviders = () => {
      providers.forEach((info) => {
        for (let index = 0; index < 2; index += 1) {
          window.dispatchEvent(
            new CustomEvent('eip6963:announceProvider', {
              detail: {
                info: {
                  ...info,
                  icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
                },
                provider: {
                  request: async () => null,
                },
              },
            })
          );
        }
      });
    };

    window.addEventListener('eip6963:requestProvider', () => {
      browserWindow.__PS_E2E_EIP6963_STATE__!.requestCount += 1;
      announceProviders();
    });
  });
};

const getEip6963DiscoveryState = async (page: Page) =>
  page.evaluate(() => {
    const browserWindow = window as typeof window & {
      __PS_E2E_EIP6963_STATE__?: { requestCount: number };
    };
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');
    const e2eProviders = ((web3Store?.appEvmProviders ?? []) as Array<{ uuid?: string; name?: string }>).filter(
      (provider) => provider.uuid?.startsWith('ps-e2e-provider-')
    );

    return {
      requestCount: browserWindow.__PS_E2E_EIP6963_STATE__?.requestCount ?? 0,
      uuids: e2eProviders.map((provider) => provider.uuid),
      names: e2eProviders.map((provider) => provider.name),
    };
  });

const injectSubNodeDialogContext = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    const bridgeStore = pinia?._s?.get('bridge');
    const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');

    const subConnection = {
      nodeIsConnected: true,
      nodeAddressConnecting: '',
      connectionAllowance: true,
      node: { chain: 'Kusama', name: 'Parity', address: 'wss://kusama-rpc.polkadot.io', location: 'JP' },
      nodeList: [{ chain: 'Kusama', name: 'Parity', address: 'wss://kusama-rpc.polkadot.io', location: 'JP' }],
      defaultNodes: [{ chain: 'Kusama', name: 'Parity', address: 'wss://kusama-rpc.polkadot.io', location: 'JP' }],
      customNodes: [],
      connect: async () => undefined,
      updateCustomNode: () => undefined,
      removeCustomNode: () => undefined,
    };

    if (bridgeStore?.connector) {
      bridgeStore.connector.relaychain = {
        subNetwork: 'Kusama',
        subNetworkConnection: subConnection,
        formatAddress: (value: string) => value,
        stop: async () => undefined,
      };
      bridgeStore.connector.standalone = undefined;
    }

    web3Store?.$patch?.({
      networkType: 'Sub',
      networkSelected: 'Kusama',
    });
    web3Store?.setSelectSubNodeDialogVisibility?.(true);
  });
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('tears down bridge provider dialog on hash churn and preserves swap clickability', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  await callWeb3Store(page, 'setSelectProviderDialogVisibility', true);

  const providerDialog = page
    .getByRole('dialog')
    .filter({ hasText: /connect ethereum wallet/i })
    .first();
  await expect(providerDialog).toBeVisible();

  await goToSwap(page);
  await expect(providerDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});

test('deduplicates EIP-6963 providers across provider dialog open-close churn', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);
  await installDuplicateEip6963Announcements(page);

  const providerDialog = page
    .getByRole('dialog')
    .filter({ hasText: /connect ethereum wallet/i })
    .first();

  for (let index = 0; index < 3; index += 1) {
    await callWeb3Store(page, 'setSelectProviderDialogVisibility', true);
    await expect(providerDialog).toBeVisible();
    await expect(providerDialog).toContainText('E2E Alpha Wallet');
    await expect(providerDialog).toContainText('E2E Beta Wallet');

    await callWeb3Store(page, 'setSelectProviderDialogVisibility', false);
    await expect(providerDialog).toHaveCount(0);
  }

  await callWeb3Store(page, 'setSelectProviderDialogVisibility', true);
  await expect(providerDialog).toBeVisible();

  const state = await getEip6963DiscoveryState(page);

  expect(state.requestCount).toBe(1);
  expect(state.uuids.sort()).toEqual(['ps-e2e-provider-alpha', 'ps-e2e-provider-beta']);
  expect(new Set(state.uuids).size).toBe(state.uuids.length);
  expect(state.names.sort()).toEqual(['E2E Alpha Wallet', 'E2E Beta Wallet']);

  await page.keyboard.press('Escape');
  await expect(providerDialog).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('tears down bridge network dialog on hash churn and preserves swap clickability', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  await callWeb3Store(page, 'setSelectNetworkDialogVisibility', true);

  const networkDialog = page.getByText(/bridge sora network with:/i).first();
  await expect(networkDialog).toBeVisible();

  await goToSwap(page);
  await expect(networkDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});

test('tears down SORA account dialog on hash churn and preserves swap clickability', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  await callWeb3Store(page, 'setSoraAccountDialogVisibility', true);

  const soraAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();
  await expect(soraAccountDialog).toBeVisible();

  await goToSwap(page);
  await expect(soraAccountDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});

test('tears down bridge sub-account dialog on hash churn and preserves swap clickability', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  await callWeb3Store(page, 'setSubAccountDialogVisibility', true);

  const subAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();
  await expect(subAccountDialog).toBeVisible();

  await goToSwap(page);
  await expect(subAccountDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});

test('tears down bridge sub-node dialog on hash churn and preserves swap clickability', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  await injectSubNodeDialogContext(page);

  const subNodeDialog = page
    .getByRole('dialog')
    .filter({ hasText: /network node selection/i })
    .first();
  await expect(subNodeDialog).toBeVisible();

  await goToSwap(page);
  await expect(subNodeDialog).toHaveCount(0);
  await expectSwapSettingsClickable(page);

  expect(consoleErrors).toEqual([]);
});

test('keeps bridge asset selector visibility decoupled from sub-account dialog visibility', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  const assetTrigger = page.locator('.bridge .token-select-button').first();
  const assetDialog = page.locator('.asset-select').first();
  const subAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(subAccountDialog).toHaveCount(0);
  await expect(assetTrigger).toBeVisible();

  await assetTrigger.click();
  await expect(assetDialog).toBeVisible();
  await expect(subAccountDialog).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(assetDialog).toHaveCount(0);
  await expect(subAccountDialog).toHaveCount(0);

  await callWeb3Store(page, 'setSubAccountDialogVisibility', true);
  await expect(subAccountDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(subAccountDialog).toHaveCount(0);

  await assetTrigger.click({ trial: true, timeout: 2_000 });
  await assetTrigger.click();
  await expect(assetDialog).toBeVisible();
  await expect(subAccountDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('bridge dialogs reopen correctly after bridge-swap-bridge hash churn', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openBridge(page);

  const scenarios: Array<{
    open: () => Promise<void>;
    dialog: Locator;
  }> = [
    {
      open: async () => {
        await callWeb3Store(page, 'setSelectNetworkDialogVisibility', true);
      },
      dialog: page.getByText(/bridge sora network with:/i),
    },
    {
      open: async () => {
        await callWeb3Store(page, 'setSoraAccountDialogVisibility', true);
      },
      dialog: page.getByRole('dialog').filter({ hasText: /learn more about wallet connection/i }),
    },
    {
      open: async () => {
        await callWeb3Store(page, 'setSelectProviderDialogVisibility', true);
      },
      dialog: page.getByRole('dialog').filter({ hasText: /connect ethereum wallet/i }),
    },
    {
      open: async () => {
        await callWeb3Store(page, 'setSubAccountDialogVisibility', true);
      },
      dialog: page.getByRole('dialog').filter({ hasText: /learn more about wallet connection/i }),
    },
    {
      open: async () => {
        await injectSubNodeDialogContext(page);
      },
      dialog: page.getByRole('dialog').filter({ hasText: /network node selection/i }),
    },
  ];

  for (const scenario of scenarios) {
    const dialog = scenario.dialog.first();

    await scenario.open();
    await expect(dialog).toBeVisible();

    await goToSwap(page);
    await expect(dialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await goToBridge(page);
    await scenario.open();
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }

  expect(consoleErrors).toEqual([]);
});
