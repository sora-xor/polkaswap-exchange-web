import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, filterKnownWalletConsoleNoise, ipfsBasePath, trackConsole } from './support/ipfs';
import { assertRouteRendering } from './support/render-assertions';
import {
  protectedAuthRouteAuditCases,
  protectedRedirectRouteAuditCases,
  publicRouteAuditCases,
} from './support/route-matrix';

const AUTHENTICATED_WALLET_STATE = {
  address: 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo',
  name: 'E2E Wallet',
  source: 'polkadot-js',
  isExternal: 'false',
};

const corruptionPatterns = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];

const injectSubNodeDialogContext = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const store = (window as Record<string, any>).__PS_APP_STORE__;
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    const bridgeStore = pinia?._s?.get('bridge');

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
      bridgeStore.connector.standalone = {
        subNetwork: 'Kusama',
        subNetworkConnection: subConnection,
        formatAddress: (value: string) => value,
      };
    }

    store?.commit?.web3?.setNetworkType?.('Sub');
    store?.commit?.web3?.setSelectedNetwork?.('Kusama');
    store?.commit?.web3?.setSelectSubNodeDialogVisibility?.(true);
  });
};

const footerStatusItemAt = (page: Page, index: number) => page.locator('.app-status .app-status__item').nth(index);

const dialogByTitle = (page: Page, title: RegExp) =>
  page
    .getByRole('dialog')
    .filter({ has: page.locator('.dialog-card__title-text', { hasText: title }) })
    .first();

const openFooterActionDialog = async (
  page: Page,
  options: {
    statusIndex: number;
    actionName: RegExp;
    dialogText: RegExp;
  }
) => {
  const popover = page.locator('.app-status__tooltip').first();
  const item = footerStatusItemAt(page, options.statusIndex);
  const dialog = page.getByRole('dialog').filter({ hasText: options.dialogText }).first();

  await item.click();
  await expect(popover).toHaveCount(1);
  await popover.getByRole('button', { name: options.actionName }).click();
  await expect(dialog).toBeVisible();

  return dialog;
};

const expectSwapSettingsClickable = async (page: Page): Promise<void> => {
  const settingsButton = page.locator('.el-button--settings').first();
  const settingsDialog = page.locator('.market-algorithm');

  await settingsButton.click();
  await expect(settingsDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);
};

const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of corruptionPatterns) {
    expect(bodyText).not.toMatch(pattern);
  }
};

const seedAuthenticatedWalletState = async (page: Page): Promise<void> => {
  await page.addInitScript((authState) => {
    localStorage.setItem('sora.address', authState.address);
    localStorage.setItem('sora.name', authState.name);
    localStorage.setItem('sora.source', authState.source);
    localStorage.setItem('sora.isExternal', authState.isExternal);
  }, AUTHENTICATED_WALLET_STATE);
};

const clearAuthenticatedWalletState = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.removeItem('sora.address');
    localStorage.removeItem('sora.name');
    localStorage.removeItem('sora.source');
    localStorage.removeItem('sora.isExternal');
  });
};

const openAuthenticatedWallet = async (page: Page): Promise<void> => {
  await seedAuthenticatedWalletState(page);
  await page.goto(`${ipfsBasePath}/#/wallet`);
  await ensureAppLoaded(page);
  await page.waitForTimeout(1_500);
  await expect(page.locator('.container--wallet')).toBeVisible();
};

test.describe('live runtime smoke', () => {
  test.skip(!process.env.PS_E2E_LIVE_NETWORK, 'Enable with PS_E2E_LIVE_NETWORK=1');

  test('keeps core shell interactions functional without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

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
    const consoleErrors = trackConsole(page, { mode: 'live' });

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

  test('keeps swap wallet-connect overlay functional across escape/hash churn without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/swap`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    const connectButton = page.locator('.swap-form .action-button', { hasText: /connect account/i });
    const connectDialog = page
      .getByRole('dialog')
      .filter({ hasText: /learn more about wallet connection/i })
      .first();

    await expect(connectButton).toBeVisible();
    await connectButton.click();
    await expect(connectDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(connectDialog).toHaveCount(0);

    await connectButton.click();
    await expect(connectDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/wallet';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/wallet' || window.location.hash.startsWith('#/wallet/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(connectDialog).toHaveCount(0);

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await expect(connectButton).toBeVisible();
    await connectButton.click();
    await expect(connectDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(connectDialog).toHaveCount(0);

    await expectSwapSettingsClickable(page);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps authenticated wallet account overlays functional without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await openAuthenticatedWallet(page);
    await expectNoCorruptedUiText(page);

    const accountSettingsTrigger = page.locator('.container--wallet button.el-button--action').first();
    const accountSettingsDialog = dialogByTitle(page, /account settings/i);

    await expect(accountSettingsTrigger).toBeVisible();
    await accountSettingsTrigger.click();
    await expect(accountSettingsDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(accountSettingsDialog).toHaveCount(0);

    const actionsTrigger = page.locator('.container--wallet .account-actions').first();
    const menu = page.locator('.account-actions-menu').first();
    const renameDialog = dialogByTitle(page, /rename account/i);
    const exportDialog = dialogByTitle(page, /confirm with password/i);

    await expect(actionsTrigger).toBeVisible();
    await actionsTrigger.click();
    await expect(menu).toBeVisible();
    await menu
      .getByText(/rename account/i)
      .first()
      .click();
    await expect(renameDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(renameDialog).toHaveCount(0);

    await actionsTrigger.click();
    await expect(menu).toBeVisible();
    await menu
      .getByText(/export \.json/i)
      .first()
      .click();
    await expect(exportDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(exportDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
  });

  test('tears down authenticated wallet rename dialog on hash churn and keeps swap controls clickable without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await openAuthenticatedWallet(page);
    await expectNoCorruptedUiText(page);

    const actionsTrigger = page.locator('.container--wallet .account-actions').first();
    const menu = page.locator('.account-actions-menu').first();
    const renameDialog = dialogByTitle(page, /rename account/i);

    await expect(actionsTrigger).toBeVisible();
    await actionsTrigger.click();
    await expect(menu).toBeVisible();
    await menu
      .getByText(/rename account/i)
      .first()
      .click();
    await expect(renameDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(renameDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await page.evaluate(() => {
      window.location.hash = '#/wallet';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/wallet' || window.location.hash.startsWith('#/wallet/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await expect(actionsTrigger).toBeVisible();
    await actionsTrigger.click();
    await expect(menu).toBeVisible();
    await menu
      .getByText(/rename account/i)
      .first()
      .click();
    await expect(renameDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(renameDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
  });

  test('tears down bridge network dialog on hash churn and keeps swap controls clickable without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/bridge`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSelectNetworkDialogVisibility?.(true);
    });

    const networkDialog = page.getByText(/bridge sora network with:/i).first();
    await expect(networkDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(networkDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSelectNetworkDialogVisibility?.(true);
    });
    await expect(networkDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(networkDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('tears down SORA account dialog on hash churn and keeps swap controls clickable without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/bridge`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSoraAccountDialogVisibility?.(true);
    });

    const soraAccountDialog = page
      .getByRole('dialog')
      .filter({ hasText: /learn more about wallet connection/i })
      .first();
    await expect(soraAccountDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(soraAccountDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSoraAccountDialogVisibility?.(true);
    });
    await expect(soraAccountDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(soraAccountDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
  });

  test('keeps footer node dialog functional across escape/hash churn without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/swap`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    let nodeDialog = await openFooterActionDialog(page, {
      statusIndex: 0,
      actionName: /select network node/i,
      dialogText: /network node selection/i,
    });

    await page.keyboard.press('Escape');
    await expect(nodeDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    nodeDialog = await openFooterActionDialog(page, {
      statusIndex: 0,
      actionName: /select network node/i,
      dialogText: /network node selection/i,
    });
    await page.mouse.click(10, 10);
    await expect(nodeDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    nodeDialog = await openFooterActionDialog(page, {
      statusIndex: 0,
      actionName: /select network node/i,
      dialogText: /network node selection/i,
    });

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await expect(nodeDialog).toHaveCount(0);

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expectSwapSettingsClickable(page);

    nodeDialog = await openFooterActionDialog(page, {
      statusIndex: 0,
      actionName: /select network node/i,
      dialogText: /network node selection/i,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(nodeDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    nodeDialog = await openFooterActionDialog(page, {
      statusIndex: 0,
      actionName: /select network node/i,
      dialogText: /network node selection/i,
    });
    await page.keyboard.press('Escape');
    await expect(nodeDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps footer indexer dialog functional across escape/hash churn without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/swap`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    let indexerDialog = await openFooterActionDialog(page, {
      statusIndex: 2,
      actionName: /select services/i,
      dialogText: /network service selection/i,
    });

    await page.keyboard.press('Escape');
    await expect(indexerDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    indexerDialog = await openFooterActionDialog(page, {
      statusIndex: 2,
      actionName: /select services/i,
      dialogText: /network service selection/i,
    });
    await page.mouse.click(10, 10);
    await expect(indexerDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    indexerDialog = await openFooterActionDialog(page, {
      statusIndex: 2,
      actionName: /select services/i,
      dialogText: /network service selection/i,
    });

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await expect(indexerDialog).toHaveCount(0);

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expectSwapSettingsClickable(page);

    indexerDialog = await openFooterActionDialog(page, {
      statusIndex: 2,
      actionName: /select services/i,
      dialogText: /network service selection/i,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(indexerDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    indexerDialog = await openFooterActionDialog(page, {
      statusIndex: 2,
      actionName: /select services/i,
      dialogText: /network service selection/i,
    });
    await page.keyboard.press('Escape');
    await expect(indexerDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('tears down bridge provider dialog on hash churn and keeps swap controls clickable without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/bridge`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSelectProviderDialogVisibility?.(true);
    });

    const providerDialog = page
      .getByRole('dialog')
      .filter({ hasText: /connect ethereum wallet/i })
      .first();
    await expect(providerDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(providerDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSelectProviderDialogVisibility?.(true);
    });
    await expect(providerDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(providerDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('tears down bridge sub-account dialog on hash churn and keeps swap controls clickable without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/bridge`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSubAccountDialogVisibility?.(true);
    });

    const subAccountDialog = page
      .getByRole('dialog')
      .filter({ hasText: /learn more about wallet connection/i })
      .first();
    await expect(subAccountDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(subAccountDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSubAccountDialogVisibility?.(true);
    });
    await expect(subAccountDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(subAccountDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('tears down bridge sub-node dialog on hash churn and keeps swap controls clickable without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/bridge`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    await injectSubNodeDialogContext(page);

    const subNodeDialog = page
      .getByRole('dialog')
      .filter({ hasText: /network node selection/i })
      .first();
    await expect(subNodeDialog).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/swap';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/swap' || window.location.hash.startsWith('#/swap/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);
    await expect(subNodeDialog).toHaveCount(0);
    await expectSwapSettingsClickable(page);

    await page.evaluate(() => {
      window.location.hash = '#/bridge';
    });
    await page.waitForFunction(
      () => window.location.hash === '#/bridge' || window.location.hash.startsWith('#/bridge/'),
      undefined,
      { timeout: 15_000 }
    );
    await ensureAppLoaded(page);

    await injectSubNodeDialogContext(page);
    await expect(subNodeDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(subNodeDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps bridge asset selector visibility decoupled from sub-account dialog visibility without network stubbing', async ({
    page,
  }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.goto(`${ipfsBasePath}/#/bridge`);
    await ensureAppLoaded(page);
    await page.waitForTimeout(1_500);
    await expectNoCorruptedUiText(page);

    const assetTrigger = page.locator('.bridge .token-select-button').first();
    const assetDialog = page.locator('.asset-select').first();
    const subAccountDialog = page
      .getByRole('dialog')
      .filter({ hasText: /learn more about wallet connection/i })
      .first();

    await expect(assetTrigger).toBeVisible();
    await expect(subAccountDialog).toHaveCount(0);

    await assetTrigger.click();
    await expect(assetDialog).toBeVisible();
    await expect(subAccountDialog).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(assetDialog).toHaveCount(0);
    await expect(subAccountDialog).toHaveCount(0);

    await page.evaluate(() => {
      const store = (window as Record<string, any>).__PS_APP_STORE__;
      store?.commit?.web3?.setSubAccountDialogVisibility?.(true);
    });
    await expect(subAccountDialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(subAccountDialog).toHaveCount(0);

    await assetTrigger.click();
    await expect(assetDialog).toBeVisible();
    await expect(subAccountDialog).toHaveCount(0);

    await expectNoCorruptedUiText(page);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps route rendering matrix stable on desktop without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, {
      mode: 'live',
      extraAllowedPatterns: [/status of 404 \(Not Found\)/i, /you should connect wallet/i],
    });
    const routeCases = [...publicRouteAuditCases, ...protectedRedirectRouteAuditCases];

    await page.setViewportSize({ width: 1366, height: 900 });
    await clearAuthenticatedWalletState(page);

    for (const route of routeCases) {
      await page.goto(`${ipfsBasePath}/${route.hash}`);
      await ensureAppLoaded(page);
      await assertRouteRendering(page, route);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('keeps route rendering matrix stable on mobile without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, {
      mode: 'live',
      extraAllowedPatterns: [/status of 404 \(Not Found\)/i, /you should connect wallet/i],
    });
    const routeCases = [...publicRouteAuditCases, ...protectedRedirectRouteAuditCases];

    await page.setViewportSize({ width: 390, height: 844 });
    await clearAuthenticatedWalletState(page);

    for (const route of routeCases) {
      await page.goto(`${ipfsBasePath}/${route.hash}`);
      await ensureAppLoaded(page);
      await assertRouteRendering(page, route);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('keeps protected route rendering stable with authenticated state without network stubbing', async ({ page }) => {
    const consoleErrors = trackConsole(page, {
      mode: 'live',
      extraAllowedPatterns: [/status of 404 \(Not Found\)/i],
    });

    await page.setViewportSize({ width: 1366, height: 900 });
    await seedAuthenticatedWalletState(page);

    for (const route of protectedAuthRouteAuditCases) {
      await page.goto(`${ipfsBasePath}/${route.hash}`);
      await ensureAppLoaded(page);
      await assertRouteRendering(page, route);
    }

    expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
  });
});
