import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test as base, type Page, type Route } from '@playwright/test';

import {
  ensureAppLoaded,
  filterKnownWalletConsoleNoise,
  ipfsEntryUrl,
  preparePage,
  trackConsole,
} from './support/ipfs';
import { AUTHENTICATED_WALLET_STATE } from './support/route-matrix';

const merchantId = 'polkaswap-community-store';
const recipient = 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ';
const genesis = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const relayOrigin = 'https://community-store.example.test';
const orderId = 'order-e2e-store-0001';
const recoveryToken = 'e2e_private_recovery_capability_0000000000000000001';
const output = path.resolve('output/playwright/community-store');
const NATIVE_XOR_ASSET_ID = '0x0200000000000000000000000000000000000000000000000000000000000000';
const unitXor = '1.759225';
const shippingXor = '3.694371';
const totalXor = '5.453596';

/** Use a complete, release-matching merchant fixture, with no real relay or signing calls. */
function catalogFixture() {
  return {
    version: 'e2e-september-25',
    enabled: true,
    merchant: {
      id: merchantId,
      name: 'Polkaswap Community Store',
      operatorName: 'Community Volunteers',
      supportTelegram: 'sora_xor',
      dispatchPolicy: 'Tea is sourced after ordering.',
      customsPolicy: 'Destination import rules apply.',
      privacyPolicy: 'Private fulfillment only.',
      cancellationPolicy: 'Unfulfillable orders receive the full XOR refund.',
    },
    pricing: { kind: 'exact-xor', version: 'fixed-xor-1' },
    product: {
      id: 'sencha-100g',
      name: 'Organic sencha',
      grams: 100,
      priceXor: unitXor,
      stockAvailable: null,
      packedGrams: 120,
      packagingGrams: 80,
      fulfillmentMode: 'on-demand',
    },
    shipping: [
      { id: 'ems-zone-3-500', countries: ['AU', 'DE'], maxGrams: 500, priceXor: shippingXor, label: 'Japan Post EMS' },
    ],
    chain: { genesisHash: genesis, assetId: NATIVE_XOR_ASSET_ID, decimals: 18, denomination: '1', recipient },
  };
}

/** Mock responses include CORS headers so both Chromium and WebKit exercise the real fetch client. */
async function fulfillJson(route: Route, value: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(value),
  });
}

/** The immutable fixture request survives recovery and status changes. */
function orderFixture() {
  return {
    orderId,
    recoveryToken,
    status: 'awaiting_payment',
    notificationStatus: 'pending',
    paymentRequest: {
      version: 1,
      merchant: { id: merchantId, name: 'Polkaswap Community Store' },
      chainGenesisHash: genesis,
      assetId: NATIVE_XOR_ASSET_ID,
      payer: AUTHENTICATED_WALLET_STATE.address,
      recipient,
      amountCodec: '5453596000000000000',
      decimals: 18,
      denomination: '1',
      reference: `sp_${'a'.repeat(32)}`,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
  };
}

/** Retain the real shell and wallet state while preventing every external network operation. */
async function prepareStore(page: Page, liveCatalog: boolean, authenticated = false): Promise<void> {
  await preparePage(page, { stubRuntimeEnv: true });
  await page.addInitScript(
    ({ state, loggedIn }) => {
      for (const key of ['sora.address', 'sora.name', 'sora.source', 'sora.isExternal']) localStorage.removeItem(key);
      if (loggedIn) {
        localStorage.setItem('sora.address', state.address);
        localStorage.setItem('sora.name', state.name);
        localStorage.setItem('sora.source', state.source);
        localStorage.setItem('sora.isExternal', state.isExternal);
      }
    },
    { state: AUTHENTICATED_WALLET_STATE, loggedIn: authenticated }
  );
  await page.route('**/community-store.json', (route) =>
    fulfillJson(route, { version: 1, merchantId, recipient, relayUrl: liveCatalog ? relayOrigin : null })
  );
  if (liveCatalog) await page.route(`${relayOrigin}/v1/catalog`, (route) => fulfillJson(route, catalogFixture()));
}

/** Check complete document width, not only the page's own rounded surface. */
async function expectNoOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        document: document.documentElement.scrollWidth <= innerWidth + 1,
        body: document.body.scrollWidth <= innerWidth + 1,
      }))
    )
    .toEqual({ document: true, body: true });
}

/** Both disabled browsing and saved orders use only the approved public support group. */
async function expectCommunitySupport(page: Page): Promise<void> {
  const store = page.getByTestId('community-store');
  await expect(store).toContainText('For support, write in @sora_xor on Telegram.');
  await expect(store).not.toContainText(/takemiya@sora\.org|@mtakemiya|Makoto Takemiya/i);
  await expect(store.locator('a[href^="mailto:"], a[href="https://t.me/mtakemiya"]')).toHaveCount(0);
  await expect(store.locator('a[href="https://t.me/sora_xor"]').first()).toBeVisible();
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const test = base.extend({
    browserName: [browserName, { scope: 'worker' }],
    channel: [browserName === 'chromium' ? process.env.PS_STORE_CHROMIUM_CHANNEL : undefined, { scope: 'worker' }],
  });
  test.describe(`Community Store ${browserName}`, () => {
    test.use({
      viewport: { width: 1440, height: 960 },
      reducedMotion: 'reduce',
    });

    for (const size of [
      { name: 'desktop', width: 1440, height: 960 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      test.describe(`${size.name} prelaunch`, () => {
        test.use({
          viewport: { width: size.width, height: size.height },
          screen: { width: size.width, height: size.height },
          isMobile: size.name === 'mobile',
        });

        test('browsing, photo evidence, native surfaces, and layout', async ({ page }) => {
          await mkdir(output, { recursive: true });
          page.setDefaultTimeout(10_000);
          await prepareStore(page, false);
          const errors = trackConsole(page);
          const failed: string[] = [];
          page.on('requestfailed', (request) => failed.push(request.url()));
          await page.goto(`${ipfsEntryUrl}#/store`);
          await ensureAppLoaded(page);
          await expect(page).toHaveTitle('Store - Polkaswap');
          await expect(page.getByTestId('community-store')).toBeVisible();
          await expect(page.getByTestId('community-store')).not.toContainText(/US\$|\bUSD\b|\bJPY\b|¥|5\.37|MUFG/);
          await expect(page.getByRole('heading', { level: 1 })).toContainText('Organic sencha');
          await expect(page.getByTestId('store-checkout')).toBeDisabled();
          await expect(page.locator('.store-price__amount')).toHaveText(`${unitXor} XOR`);
          await expect(page.locator('.tea-gallery img')).toHaveAttribute('src', /sencha-showcase.*\.png/);
          await expect
            .poll(() => page.locator('.tea-gallery img').evaluate((image) => (image as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
          expect(
            await page.getByTestId('community-store').evaluate((element) => getComputedStyle(element).boxShadow)
          ).not.toBe('none');
          await expectNoOverflow(page);
          if (size.name === 'desktop') {
            const gallery = await page.locator('.tea-gallery').boundingBox();
            const copy = await page.locator('.store-product__copy').boundingBox();
            const title = await page.getByRole('heading', { level: 1 }).boundingBox();
            expect(gallery).not.toBeNull();
            expect(copy).not.toBeNull();
            expect(copy!.x).toBeGreaterThan(gallery!.x + gallery!.width);
            expect(Math.abs(copy!.y - gallery!.y)).toBeLessThan(100);
            expect(title!.y + title!.height).toBeLessThan(size.height);
            const menu = await page.locator('.app-menu').boundingBox();
            expect(gallery!.x).toBeGreaterThan(menu!.x + menu!.width);
          }
          const storeIcon = page.locator('a[href="#/store"] .sidebar-item-content__logo');
          await expect(storeIcon).toHaveCount(1);
          expect(await storeIcon.evaluate((element) => getComputedStyle(element).maskImage)).toContain('shopping-bag');
          await page.screenshot({ path: path.join(output, `${browserName}-${size.name}.png`), fullPage: true });
          await page.getByRole('button', { name: 'Label', exact: true }).click();
          await expect(page.locator('.tea-gallery img')).toHaveAttribute('src', /sencha-back.*\.jpg/);
          await expect(page.locator('.tea-gallery img')).toHaveAttribute('alt', /ingredient and brewing label/);
          await expect(page.locator('sora-pay')).toHaveCount(0);
          await expectCommunitySupport(page);
          expect(filterKnownWalletConsoleNoise(errors)).toEqual([]);
          expect(failed).toEqual([]);
        });
      });
    }

    // Use managed fixtures so browser startup and trace capture belong to Playwright.
    test('private order is saved before payment, receipt downloads, and recovery uses a header', async ({ page }) => {
      await mkdir(output, { recursive: true });
      page.setDefaultTimeout(10_000);
      await prepareStore(page, true, true);
      const errors = trackConsole(page);
      const order = orderFixture();
      let creationBody: Record<string, unknown> | null = null;
      let releaseCreation!: () => void;
      const saveBarrier = new Promise<void>((resolve) => {
        releaseCreation = resolve;
      });
      let recoveryAuthorization = '';
      await page.route(`${relayOrigin}/v1/orders`, async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await fulfillJson(route, {});
          return;
        }
        creationBody = route.request().postDataJSON();
        await saveBarrier;
        await fulfillJson(route, order);
      });
      await page.route(`${relayOrigin}/v1/orders/${orderId}`, async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await fulfillJson(route, {});
          return;
        }
        recoveryAuthorization = route.request().headers().authorization ?? '';
        await fulfillJson(route, {
          ...order,
          status: 'shipped',
          notificationStatus: 'delivered',
          tracking: 'EMS-MOCK-123',
        });
      });
      await page.goto(`${ipfsEntryUrl}#/store`);
      await ensureAppLoaded(page);
      await expect(page.getByTestId('store-checkout')).toBeEnabled();
      await expectCommunitySupport(page);
      await expect(page.locator('.store-price__amount')).toHaveText(`${unitXor} XOR`);
      await expect(page.getByTestId('community-store')).not.toContainText(
        /US\$|\bUSD\b|\bJPY\b|¥|5\.37|MUFG|Price version/
      );
      await page.getByTestId('store-checkout').click();
      await page.getByRole('combobox', { name: 'Destination country', exact: true }).selectOption('AU');
      await page.getByLabel('Recipient’s full name').fill('E2E Customer');
      await page.getByLabel('Street address', { exact: true }).fill('Private delivery street 123');
      await page.getByLabel('City', { exact: true }).fill('Sydney');
      await page.getByLabel('Postal code', { exact: true }).fill('2000');
      await page.getByLabel('Email address', { exact: true }).fill('customer@example.test');
      await page.locator('.store-consent input').check();
      await expect(page.locator('.store-totals__total')).toContainText(`${totalXor} XOR`);
      await expect(page.locator('sora-pay')).toHaveCount(0);
      await page.getByTestId('store-save-order').click();
      await expect.poll(() => creationBody).not.toBeNull();
      await expect(page.locator('sora-pay')).toHaveCount(0);
      expect(creationBody?.['address']).toEqual({
        name: 'E2E Customer',
        country: 'AU',
        line1: 'Private delivery street 123',
        city: 'Sydney',
        postalCode: '2000',
      });
      releaseCreation();
      await expect(page.getByTestId('store-receipt')).toBeVisible();
      await expectCommunitySupport(page);
      await expect(page.locator('sora-pay')).toHaveCount(1);
      await expect(page.locator('sora-pay')).toContainText(`${totalXor} XOR`);
      await expect(page.locator('sora-pay')).not.toContainText('Private delivery street');
      expect(await page.evaluate(() => sessionStorage.getItem('polkaswap:community-store:recovery:v1'))).not.toContain(
        'Private delivery street'
      );
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('store-download-receipt').click();
      const receipt = await downloadPromise;
      expect(receipt.suggestedFilename()).toBe(`polkaswap-order-${orderId}.json`);
      await receipt.saveAs(path.join(output, `${browserName}-mock-receipt.json`));
      await page.screenshot({ path: path.join(output, `${browserName}-checkout.png`), fullPage: true });
      const saved = await page.evaluate(() => sessionStorage.getItem('polkaswap:community-store:recovery:v1'));
      expect(saved).toContain(recoveryToken);
      await page.evaluate(() => sessionStorage.removeItem('polkaswap:community-store:recovery:v1'));
      await page.reload();
      await ensureAppLoaded(page);
      await expect(page.getByTestId('store-checkout')).toBeEnabled();
      await page.getByLabel('Order ID', { exact: true }).fill(orderId);
      await page.getByLabel('Private recovery code', { exact: true }).fill(recoveryToken);
      await page.getByRole('button', { name: 'Recover order', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Your tea is on its way', exact: true })).toBeVisible();
      await expect(page.getByText('EMS-MOCK-123', { exact: true })).toBeVisible();
      await expectCommunitySupport(page);
      expect(recoveryAuthorization).toBe(`Bearer ${recoveryToken}`);
      expect(page.url()).not.toContain(recoveryToken);
      await expect(page.locator('sora-pay')).toHaveCount(0);
      const repeatReceipt = page.waitForEvent('download');
      await page.getByTestId('store-new-order').click();
      expect((await repeatReceipt).suggestedFilename()).toBe(`polkaswap-order-${orderId}.json`);
      await expect(page.getByRole('heading', { name: 'Delivery details', exact: true })).toBeVisible();
      await expect(page.locator('.store-consent input')).not.toBeChecked();
      await expect(page.locator('sora-pay')).toHaveCount(0);
      await expectNoOverflow(page);
      expect(filterKnownWalletConsoleNoise(errors)).toEqual([]);
    });

    // This independent fresh-context layout check must not share the desktop flow's timeout.
    test.describe('mobile checkout', () => {
      test.use({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true });

      test('delivery form shows exact totals without horizontal overflow', async ({ page }) => {
        await mkdir(output, { recursive: true });
        page.setDefaultTimeout(10_000);
        await prepareStore(page, true, true);
        await page.goto(`${ipfsEntryUrl}#/store`);
        await ensureAppLoaded(page);
        await page.getByTestId('store-checkout').click();
        await page.getByRole('combobox', { name: 'Destination country', exact: true }).selectOption('AU');
        await page.locator('.store-consent input').check();
        await page.getByTestId('store-save-order').scrollIntoViewIfNeeded();
        await expect(page.getByTestId('store-save-order')).toBeEnabled();
        await expect(page.locator('.store-totals__total')).toContainText(`${totalXor} XOR`);
        await expectNoOverflow(page);
        await page.screenshot({ path: path.join(output, `${browserName}-mobile-delivery.png`), fullPage: true });
      });
    });
  });
}
