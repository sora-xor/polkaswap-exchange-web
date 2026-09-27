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
const refundFeeCodec = '100026012589707326';
const netRefundXor = '5.353569987410292674';

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
      cancellationPolicy:
        'If an order cannot be shipped, we refund the XOR received, including shipping, minus the SORA network fee for sending the refund. Your original payment’s network fee is non-refundable.',
    },
    refundPolicy: { version: 2, mode: 'net-network-fee' },
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
    refundPolicy: { version: 2, mode: 'net-network-fee' },
    refundFeeCorrectionCodec: '0',
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

/** Finalized synthetic evidence exercises receipt validation without any wallet or chain operation. */
function refundedOrderFixture(kind: 'net' | 'legacy' | 'fee-exempt' | 'agreed') {
  const legacy = kind === 'legacy';
  const feeExempt = kind === 'fee-exempt';
  const agreed = kind === 'agreed';
  const order = orderFixture();
  const amountCodec = agreed
    ? '5343596000000000000'
    : feeExempt
      ? refundFeeCodec
      : legacy
        ? order.paymentRequest.amountCodec
        : (BigInt(order.paymentRequest.amountCodec) - BigInt(refundFeeCodec)).toString();
  const reference = `sp_${'b'.repeat(32)}`;
  const request = {
    ...order.paymentRequest,
    payer: order.paymentRequest.recipient,
    recipient: order.paymentRequest.payer,
    amountCodec,
    reference,
  };
  const receipt = {
    status: 'finalized',
    request,
    evidence: {
      ...request,
      transactionHash: `0x${'c'.repeat(64)}`,
      blockHash: `0x${'d'.repeat(64)}`,
      blockNumber: '101',
      eventIndex: 3,
      successful: true,
      finalized: true,
      finalizedAt: new Date().toISOString(),
      networkFee: { payer: request.payer, assetId: request.assetId, amountCodec: refundFeeCodec, eventIndex: 4 },
    },
  };
  return {
    ...order,
    // Historical responses lack both a policy snapshot and the newer fee accounting fields.
    refundPolicy: legacy ? undefined : agreed ? { version: 1, mode: 'full' } : order.refundPolicy,
    refundAgreedDeductionsCodec: agreed ? '110000000000000000' : '0',
    status: 'refunded',
    notificationStatus: 'delivered',
    paymentPending: false,
    refund: {
      reference,
      recipient: request.recipient,
      amountCodec,
      status: 'finalized',
      receipt,
      ...(legacy
        ? {}
        : feeExempt || agreed
          ? {
              grossAmountCodec: agreed ? order.paymentRequest.amountCodec : amountCodec,
              feeExempt: true,
              deductedFeeCodec: '0',
              feeCorrectionCodec: '0',
              ...(agreed
                ? {
                    agreedDeduction: {
                      version: 1,
                      amountCodec: '110000000000000000',
                      consentId: '145ae310-481d-48bd-8a69-c2bbf5b6fb06',
                      recordedAt: '2026-09-27T00:00:00.000Z',
                    },
                    actualFeeCodec: refundFeeCodec,
                  }
                : {}),
            }
          : {
              grossAmountCodec: order.paymentRequest.amountCodec,
              feeExempt: false,
              feeQuote: {
                amountCodec,
                feeCodec: refundFeeCodec,
                blockHash: `0x${'e'.repeat(64)}`,
                blockNumber: '100',
                expiresAt: order.paymentRequest.expiresAt,
              },
              actualFeeCodec: refundFeeCodec,
              deductedFeeCodec: refundFeeCodec,
              feeCorrectionCodec: '0',
            }),
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

    for (const kind of ['net', 'legacy', 'fee-exempt', 'agreed'] as const) {
      const legacy = kind === 'legacy';
      const feeExempt = kind === 'fee-exempt';
      const agreed = kind === 'agreed';
      test(
        agreed
          ? 'agreed refund recovery separates the fixed deduction from the actual SORA network fee'
          : legacy
            ? 'legacy refund recovery retains full-refund terms under the current catalog'
            : feeExempt
              ? 'completed v2 correction recovery does not claim a network fee was deducted'
              : 'private refund recovery shows verified gross, SORA fee, and net XOR',
        async ({ page }) => {
          await mkdir(output, { recursive: true });
          page.setDefaultTimeout(10_000);
          await prepareStore(page, true);
          const errors = trackConsole(page);
          const recovered = refundedOrderFixture(kind);
          const recoveryRequests: Array<{ method: string; authorization: string; url: string }> = [];
          const mutations: string[] = [];
          page.on('request', (request) => {
            if (request.url().startsWith(`${relayOrigin}/v1/orders`) && request.method() === 'POST')
              mutations.push(request.url());
          });
          await page.route(`${relayOrigin}/v1/orders/${orderId}`, async (route) => {
            if (route.request().method() === 'OPTIONS') {
              await fulfillJson(route, {});
              return;
            }
            recoveryRequests.push({
              method: route.request().method(),
              authorization: route.request().headers().authorization ?? '',
              url: route.request().url(),
            });
            await fulfillJson(route, recovered);
          });
          await page.goto(`${ipfsEntryUrl}#/store`);
          await ensureAppLoaded(page);
          await expect(page.getByTestId('store-checkout')).toBeEnabled();
          await page.getByLabel('Order ID', { exact: true }).fill(orderId);
          await page.getByLabel('Private recovery code', { exact: true }).fill(recoveryToken);
          await page.getByRole('button', { name: 'Recover order', exact: true }).click();
          const receipt = page.getByTestId('store-receipt');
          await expect(receipt.getByRole('heading', { name: 'Your XOR has been refunded', exact: true })).toBeVisible();
          const breakdown = page.getByTestId('store-refund-breakdown');
          await expect(breakdown.locator('div').filter({ hasText: 'Amount before fees' }).locator('dd')).toHaveText(
            `${feeExempt ? '0.100026012589707326' : totalXor} XOR`
          );
          if (agreed) {
            await expect(breakdown.locator('div').filter({ hasText: 'Agreed deduction' }).locator('dd')).toHaveText(
              '0.11 XOR'
            );
            await expect(
              breakdown.locator('div').filter({ hasText: 'Actual SORA network fee' }).locator('dd')
            ).toHaveText('0.100026012589707326 XOR');
            await expect(breakdown).not.toContainText('SORA fee deducted');
            await expect(receipt).toContainText(
              'For this refund, you agreed to a 0.11 XOR deduction. The transfer amount below includes that deduction.'
            );
            await expect(receipt).not.toContainText('The full XOR received');
          } else {
            await expect(breakdown.locator('div').filter({ hasText: 'SORA fee deducted' }).locator('dd')).toHaveText(
              legacy || feeExempt ? '0 XOR' : '0.100026012589707326 XOR'
            );
          }
          await expect(breakdown.locator('div').filter({ hasText: 'XOR returned' }).locator('dd')).toHaveText(
            `${agreed ? '5.343596' : feeExempt ? '0.100026012589707326' : legacy ? totalXor : netRefundXor} XOR`
          );
          await expect(breakdown).not.toContainText('Refund still due');
          await expect(receipt).toContainText(
            legacy ? 'The store covered the refund transaction fee.' : 'See the refund transaction details below.'
          );
          await expect(receipt.locator('.store-receipt__intro')).not.toContainText('was deducted');
          if (!legacy)
            await expect(receipt).toContainText('Network fees paid with the original order were not refunded.');
          await expect(receipt).toContainText(recovered.refund.receipt.evidence.transactionHash);
          await expect(page.locator('sora-pay')).toHaveCount(0);
          expect(recoveryRequests.length).toBeGreaterThan(0);
          for (const request of recoveryRequests) {
            expect(request.method).toBe('GET');
            expect(request.authorization).toBe(`Bearer ${recoveryToken}`);
            expect(request.url).not.toContain(recoveryToken);
          }
          expect(page.url()).not.toContain(recoveryToken);
          expect(mutations).toEqual([]);
          await expectNoOverflow(page);
          await receipt.scrollIntoViewIfNeeded();
          await receipt.screenshot({
            path: path.join(output, `${browserName}-${kind}-refund-recovery.png`),
          });
          expect(filterKnownWalletConsoleNoise(errors)).toEqual([]);
        }
      );
    }

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
