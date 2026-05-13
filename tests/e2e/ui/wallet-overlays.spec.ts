import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  ensureAppLoaded,
  expectHash,
  filterKnownWalletConsoleNoise,
  ipfsEntryUrl,
  preparePage,
  trackConsole,
} from './support/ipfs';

const AUTHENTICATED_WALLET_STATE = {
  address: 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo',
  name: 'E2E Wallet',
  source: 'polkadot-js',
  isExternal: 'false',
};

const walletRouteHash = '#/wallet';
const swapRouteHash = '#/swap';

const dialogByTitle = (page: Page, title: RegExp): Locator =>
  page
    .getByRole('dialog')
    .filter({ has: page.locator('.dialog-card__title-text', { hasText: title }) })
    .first();

const openAuthenticatedWallet = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}${walletRouteHash}`);
  await ensureAppLoaded(page);
  await expectHash(page, walletRouteHash);
  await expect(page.locator('.container--wallet')).toBeVisible();
};

const openAccountActionsMenu = async (page: Page): Promise<Locator> => {
  const actionsTrigger = page.locator('.container--wallet .account-actions').first();
  const menu = page.locator('.account-actions-menu').first();

  await expect(actionsTrigger).toBeVisible();
  await actionsTrigger.click({ trial: true, timeout: 500 });
  await actionsTrigger.click();
  await expect(menu).toBeVisible();

  return menu;
};

const openQrSourceMenu = async (page: Page): Promise<Locator> => {
  const qrTrigger = page.locator('.container--wallet .wallet-account-actions .qr-code-dropdown').first();
  const menu = page
    .locator('.el-dropdown-menu')
    .filter({ hasText: /scan with camera/i })
    .first();

  await expect(qrTrigger).toBeVisible();
  await qrTrigger.click({ trial: true, timeout: 500 });
  await qrTrigger.click();
  await expect(menu).toBeVisible();

  return menu;
};

const expectSwapSettingsClickable = async (page: Page): Promise<void> => {
  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 500 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(swapSettingsDialog).toHaveCount(0);
};

const callWalletStore = async (page: Page, action: string, payload?: unknown): Promise<void> => {
  await page.evaluate(
    ({ action, payload }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');

      return walletStore?.[action]?.(payload);
    },
    { action, payload }
  );
};

test.beforeEach(async ({ page }) => {
  await preparePage(page);

  await page.addInitScript((authState) => {
    localStorage.setItem('sora.address', authState.address);
    localStorage.setItem('sora.name', authState.name);
    localStorage.setItem('sora.source', authState.source);
    localStorage.setItem('sora.isExternal', authState.isExternal);
  }, AUTHENTICATED_WALLET_STATE);
});

test('covers authenticated wallet account settings and account-action dialogs', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openAuthenticatedWallet(page);

  const accountSettingsTrigger = page
    .locator('.container--wallet .base-title_action button:has(i.s-icon-basic-settings-24)')
    .first();
  const accountSettingsDialog = dialogByTitle(page, /account settings/i);

  await expect(accountSettingsTrigger).toBeVisible();
  await accountSettingsTrigger.click({ trial: true, timeout: 500 });
  await accountSettingsTrigger.click();
  await expect(accountSettingsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(accountSettingsDialog).toHaveCount(0);

  const dialogScenarios: Array<{ label: RegExp; dialog: Locator }> = [
    {
      label: /rename account/i,
      dialog: dialogByTitle(page, /rename account/i),
    },
    {
      label: /export \.json/i,
      dialog: dialogByTitle(page, /confirm with password/i),
    },
    {
      label: /delete account/i,
      dialog: page
        .getByRole('dialog')
        .filter({ hasText: /assets at risk/i })
        .first(),
    },
  ];

  for (const scenario of dialogScenarios) {
    const menu = await openAccountActionsMenu(page);
    await menu.getByText(scenario.label).first().click();
    await expect(scenario.dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(scenario.dialog).toHaveCount(0);
  }

  expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
});

test('opens authenticated wallet QR source menu from one scanner click', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openAuthenticatedWallet(page);

  const menu = await openQrSourceMenu(page);
  await expect(menu.getByText(/import an image/i)).toBeVisible();
  await expect(menu.getByText(/scan with camera/i)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
});

test('tears down authenticated wallet overlay on hash navigation and keeps swap controls clickable', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);
  await openAuthenticatedWallet(page);

  const menu = await openAccountActionsMenu(page);
  const renameDialog = dialogByTitle(page, /rename account/i);

  await menu
    .getByText(/rename account/i)
    .first()
    .click();
  await expect(renameDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await expectHash(page, swapRouteHash);
  await ensureAppLoaded(page);
  await expect(renameDialog).toHaveCount(0);

  await expectSwapSettingsClickable(page);

  expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
});

test('covers MST onboarding with nested address-book overlays in authenticated wallet', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openAuthenticatedWallet(page);

  await callWalletStore(page, 'setIsMstAvailable', true);

  await page
    .getByRole('button', { name: /multi-sig/i })
    .first()
    .click();

  const mstAboutDialog = page
    .getByRole('dialog')
    .filter({ hasText: /create multisig wallet/i })
    .first();
  await expect(mstAboutDialog).toBeVisible();

  await mstAboutDialog.getByRole('button', { name: /create multisig wallet/i }).click();

  const multisigDialog = dialogByTitle(page, /multisig account/i);
  await expect(multisigDialog).toBeVisible();

  const addressBookTrigger = multisigDialog.locator('.book-icon-open').first();
  await expect(addressBookTrigger).toBeVisible();
  await addressBookTrigger.click();

  const addressBookDialog = dialogByTitle(page, /your contacts/i);
  await expect(addressBookDialog).toBeVisible();

  await addressBookDialog.getByRole('button', { name: /add contact/i }).click();

  const addContactDialog = dialogByTitle(page, /add contact/i);
  await expect(addContactDialog).toBeVisible();

  await addContactDialog.locator('.dialog-card__close').click();
  await expect(addContactDialog).toHaveCount(0);
  await expect(addressBookDialog).toBeVisible();

  await addressBookDialog.locator('.dialog-card__close').click();
  await expect(addressBookDialog).toHaveCount(0);
  await expect(multisigDialog).toBeVisible();

  await addressBookTrigger.click({ trial: true, timeout: 500 });
  await addressBookTrigger.click();
  await expect(addressBookDialog).toBeVisible();

  const unexpectedErrors = consoleErrors.filter((entry) => !entry.includes('"key":"polkadotjs.noExtension"'));
  expect(filterKnownWalletConsoleNoise(unexpectedErrors)).toEqual([]);
});

test('tears down MST overlays on hash navigation and keeps swap controls clickable', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openAuthenticatedWallet(page);

  await callWalletStore(page, 'setIsMstAvailable', true);

  await page
    .getByRole('button', { name: /multi-sig/i })
    .first()
    .click();

  const mstAboutDialog = page
    .getByRole('dialog')
    .filter({ hasText: /create multisig wallet/i })
    .first();
  await expect(mstAboutDialog).toBeVisible();
  await mstAboutDialog.getByRole('button', { name: /create multisig wallet/i }).click();

  const multisigDialog = dialogByTitle(page, /multisig account/i);
  await expect(multisigDialog).toBeVisible();

  const addressBookTrigger = multisigDialog.locator('.book-icon-open').first();
  await expect(addressBookTrigger).toBeVisible();
  await addressBookTrigger.click();

  const addressBookDialog = dialogByTitle(page, /your contacts/i);
  await expect(addressBookDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await expectHash(page, swapRouteHash);
  await ensureAppLoaded(page);
  await expect(addressBookDialog).toHaveCount(0);
  await expect(multisigDialog).toHaveCount(0);

  await expectSwapSettingsClickable(page);

  const unexpectedErrors = consoleErrors.filter((entry) => !entry.includes('"key":"polkadotjs.noExtension"'));
  expect(filterKnownWalletConsoleNoise(unexpectedErrors)).toEqual([]);
});
