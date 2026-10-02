import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, ipfsBasePath, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const artifactDirectory = path.resolve('output/playwright/ux-implementation');
const layoutKey = `layouts.${ipfsBasePath ? `${ipfsBasePath.split('/').pop()}::` : ''}swapGrid:v3`;

/** Starts each scenario without a live wallet, RPC, indexer, or orientation emulation warning. */
async function openSwap(page: Page, options: { theme?: 'light' | 'dark'; disclaimer?: boolean; locale?: string } = {}) {
  await preparePage(page, { stubRuntimeEnv: true });
  await page.addInitScript(({ theme, disclaimer, locale }) => {
    localStorage.setItem('dexSettings.theme', theme ?? 'light');
    localStorage.setItem('dexSettings.language', locale ?? 'en');
    if (disclaimer) localStorage.removeItem('dexSettings.disclaimerApprove');
    Object.defineProperty(screen, 'orientation', {
      configurable: true,
      value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} },
    });
  }, options);
  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureAppLoaded(page);
  await expect(page.locator('.swap-widget')).toBeVisible();
}

/** Compares the rendered page width with its viewport, including long input and translated content. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => {
  await mkdir(artifactDirectory, { recursive: true });
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: responsive form, chart disclosure, preserved desktop layout, and keyboard focus`, async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openSwap(page, { theme });
    await expect(page.locator('html')).toHaveAttribute('design-system-theme', theme);
    await expect(page.locator('.menu-section-title')).toHaveText(['Account & tools', 'Earn & borrow', 'Explore']);
    await expect(page.locator('.app-menu .menu-item a').first()).toHaveAttribute('href', '#/swap');
    const originalLayout = await page.evaluate((key) => localStorage.getItem(key), layoutKey);
    const form = page.locator('[data-widget-id="swapForm"]');
    const chart = page.locator('[data-widget-id="swapChart"]');
    const tradeDetails = form.locator('.swap-details');
    await expect(tradeDetails.getByText('Network Fee', { exact: true })).toBeVisible();
    await expect(tradeDetails.getByText('Liquidity Provider Fee', { exact: true })).toBeVisible();
    await expect(tradeDetails.getByText('Route', { exact: true })).toBeVisible();
    await expect(tradeDetails.locator('[aria-expanded]')).toHaveCount(0);
    await expect(form.getByRole('heading', { name: 'Fees and trade details' })).toBeVisible();
    await expect(form.locator('.swap-details-title')).toHaveCSS('text-transform', 'uppercase');
    await expect(form.locator('.swap-details-title')).toHaveCSS('font-weight', '400');
    const detailsShadow = await tradeDetails.evaluate((element) => getComputedStyle(element).boxShadow);
    expect(detailsShadow).not.toBe('none');
    await expect(tradeDetails).toHaveCSS('border-top-width', '0px');
    for (const input of await form.locator('.s-input.token-input').all()) {
      const style = await input.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          boxShadow: computed.boxShadow,
          hasPaintedBorder: ['top', 'right', 'bottom', 'left'].some(
            (side) =>
              parseFloat(computed.getPropertyValue(`border-${side}-width`)) > 0 &&
              computed.getPropertyValue(`border-${side}-style`) !== 'none' &&
              computed.getPropertyValue(`border-${side}-color`) !== 'rgba(0, 0, 0, 0)'
          ),
        };
      });
      expect(style.hasPaintedBorder).toBe(false);
      expect(style.boxShadow).toContain('inset');
    }
    for (const selector of await form.locator('.token-select-button').all()) {
      await expect(selector).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
      expect(await selector.evaluate((element) => getComputedStyle(element).boxShadow)).toContain('inset');
    }
    const customize = form.getByRole('button', { name: 'Customize page', exact: true });
    await expect(customize).toBeVisible();
    await expect(customize).toHaveText('');
    await expect(customize).toHaveAttribute('title', 'Customize page');
    for (const control of [customize, form.locator('.el-button--settings')]) {
      await expect(control).toHaveCSS('width', '44px');
      await expect(control).toHaveCSS('height', '44px');
    }
    await expect(form.locator('.action-button')).toHaveCSS('transition-duration', '0.125s');
    await expect
      .poll(async () => {
        const [a, b] = await Promise.all([form.boundingBox(), chart.boundingBox()]);
        return a && b ? Math.abs(a.width - b.width) : 1000;
      })
      .toBeLessThan(2);
    await page.screenshot({
      path: path.join(artifactDirectory, `after-${theme}-1440-${ipfsBasePath ? 'ipfs' : 'root'}.png`),
      fullPage: true,
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 1025, height: 1000 });
    await expect(tradeDetails.getByText('Network Fee', { exact: true })).toBeVisible();
    await expect(tradeDetails.locator('[aria-expanded]')).toHaveCount(0);
    await expect
      .poll(async () => {
        const [formBox, detailsBox] = await Promise.all([form.boundingBox(), tradeDetails.boundingBox()]);
        return formBox && detailsBox ? detailsBox.y + detailsBox.height - (formBox.y + formBox.height) : 1000;
      })
      .toBeLessThanOrEqual(1);

    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const feesDisclosure = tradeDetails.getByRole('button', { name: 'Fees and trade details' });
      await expect(feesDisclosure).toBeVisible();
      await expect(feesDisclosure).toHaveAttribute('aria-expanded', 'false');
      await expect(tradeDetails.getByText('Network Fee', { exact: true })).toHaveCount(0);
      await feesDisclosure.focus();
      await page.keyboard.press('Enter');
      await expect(feesDisclosure).toHaveAttribute('aria-expanded', 'true');
      await expect(tradeDetails.getByText('Network Fee', { exact: true })).toBeVisible();
      await expect(tradeDetails.locator('.transaction-details-inline-content')).toHaveCSS('box-shadow', detailsShadow);
      await page.keyboard.press('Enter');
      await expect(feesDisclosure).toHaveAttribute('aria-expanded', 'false');
      await feesDisclosure.blur();
      const disclosure = page.locator('.swap-chart-disclosure');
      await expect(disclosure).toBeVisible();
      await expect(disclosure).toHaveCSS('border-top-width', '0px');
      expect(await disclosure.evaluate((element) => getComputedStyle(element).boxShadow)).toContain('inset');
      await expect(disclosure).not.toHaveAttribute('open');
      await expect(page.locator('.swap-chart-disclosure__body')).toHaveCount(0);
      await expect(page.locator('.widgets-grid')).not.toHaveClass(/widgets-grid--editing/);
      await expectNoHorizontalOverflow(page);
      if (width <= 390) await expect(form.locator('.action-button .s-button__text')).toHaveCSS('font-size', '16px');
      const [formBox, chartBox] = await Promise.all([form.boundingBox(), chart.boundingBox()]);
      expect(chartBox!.y).toBeGreaterThanOrEqual(formBox!.y + formBox!.height);
      expect(chartBox!.y - (formBox!.y + formBox!.height)).toBeLessThan(25);
      await page.screenshot({
        path: path.join(artifactDirectory, `after-${theme}-${width}-${ipfsBasePath ? 'ipfs' : 'root'}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      const summary = disclosure.locator('summary');
      await summary.focus();
      await expect(summary).toBeFocused();
      await expect(summary).toHaveCSS('outline-width', '2px');
      await expect(summary).toHaveCSS('outline-offset', '2px');
      await page.keyboard.press('Enter');
      await expect(page.locator('.swap-chart-disclosure__body')).toHaveCSS('height', '360px');
      await page.keyboard.press('Enter');
      await expect(page.locator('.swap-chart-disclosure__body')).toHaveCount(0);
      expect(await page.evaluate((key) => localStorage.getItem(key), layoutKey)).toBe(originalLayout);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(tradeDetails.getByText('Network Fee', { exact: true })).toBeVisible();
    await expect(tradeDetails.locator('[aria-expanded]')).toHaveCount(0);
    await expect(page.locator('.swap-chart-disclosure')).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), layoutKey)).toBe(originalLayout);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await form.locator('.action-button').evaluate((button) => parseFloat(getComputedStyle(button).transitionDuration))
    ).toBeLessThanOrEqual(0.00001);
    expect(errors).toEqual([]);
  });
}

test('native amount inputs retain exact digits on blur/focus and use distinct decimal labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await openSwap(page);
  const input = page.getByRole('textbox', { name: 'Amount to sell, XOR', exact: true });
  const amountPanel = page.locator('.token-input').first();
  await expect(input).toHaveAttribute('aria-label', 'Amount to sell, XOR');
  await expect(input).toHaveAttribute('inputmode', 'decimal');
  for (const amount of ['123456789012345678.123456789012345678', '0.000000000000000001', '1234.500000000000000000']) {
    await input.fill(amount);
    await input.blur();
    await expect(input).toHaveValue(
      amount
        .split('.')
        .map((part, index) => (index ? part : part.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',')))
        .join('.')
    );
    if (amount.startsWith('123456789012345678.')) {
      expect(await input.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await expect(page.locator('.token-input__exact-amount').first()).toContainText(amount.split('.')[1]);
    }
    await input.focus();
    await expect(input).toHaveValue(amount);
    await expect(input).toHaveCSS('outline-style', 'none');
    await expect(amountPanel).toHaveCSS('outline-style', 'none');
    await expect(amountPanel).toHaveCSS('border-radius', '24px');
    await expect(amountPanel).toHaveCSS('box-shadow', /0px 0px 0px 2px inset/);
    await expectNoHorizontalOverflow(page);
  }
  await page.evaluate(() => {
    const pinia = (
      window as typeof window & {
        __PS_ACTIVE_PINIA__: {
          _s: Map<string, { accountState: { fiatPriceObject: Readonly<Record<string, string>> } }>;
        };
      }
    ).__PS_ACTIVE_PINIA__;
    pinia._s.get('wallet')!.accountState.fiatPriceObject = Object.freeze({
      '0x0200000000000000000000000000000000000000000000000000000000000000': '1000000000000000000',
    });
  });
  const fiat = page.getByRole('textbox', { name: /^From amount in / });
  await expect(fiat).toHaveAttribute('inputmode', 'decimal');
  expect(await fiat.getAttribute('aria-label')).not.toBe(await input.getAttribute('aria-label'));
  const exactFiat = '123456789012345678.123456789012345678';
  await fiat.focus();
  await expect(amountPanel).toHaveCSS('box-shadow', /0px 0px 0px 2px inset/);
  await expect(fiat).toHaveValue('1234.5');
  await fiat.fill(exactFiat);
  await fiat.blur();
  await expect(fiat).toHaveValue('123,456,789,012,345,678.12');
  await input.focus();
  await expect(input).toHaveValue(exactFiat);
  await fiat.focus();
  await expect(fiat).toHaveValue(exactFiat);
  await fiat.blur();
  await input.focus();
  await expect(input).toHaveValue(exactFiat);
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 768, height: 1000 });
  await input.fill('4.715196682671751621');
  await input.blur();
  expect(await input.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(page.locator('.token-input__exact-amount')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 1000 });
  await expect
    .poll(async () => {
      const clipped = await input.evaluate((element) => element.scrollWidth > element.clientWidth);
      const fallbackVisible = await page.locator('.token-input__exact-amount').first().isVisible();
      return fallbackVisible === clipped;
    })
    .toBe(true);
  await page.screenshot({
    path: path.join(artifactDirectory, 'after-exact-amount.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('header customization preserves hidden widgets and resets layout at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSwap(page);
  const customize = page.getByRole('button', { name: 'Customize page', exact: true });
  await customize.focus();
  await expect(customize).toHaveCSS('outline-width', '2px');
  await page.keyboard.press('Enter');
  await expect(customize).toHaveAttribute('aria-expanded', 'true');
  const popover = page.locator('.customise-widget-popper');
  await expect(popover).toBeVisible();
  await popover.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.locator('.widgets-grid')).toHaveClass(/widgets-grid--editing/);
  await popover.getByRole('button', { name: 'Price chart (Token pair)', exact: true }).click();
  await expect(page.locator('[data-widget-id="swapChart"]')).toHaveCount(0);
  const hiddenLayout = await page.evaluate((key) => localStorage.getItem(key), layoutKey);
  expect(hiddenLayout).not.toBeNull();
  await page.reload();
  await ensureAppLoaded(page);
  await expect(page.locator('.swap-widget')).toBeVisible();
  await expect(page.locator('[data-widget-id="swapChart"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(page.locator('.widgets-grid')).not.toHaveClass(/widgets-grid--editing/);
  expect(await page.evaluate((key) => localStorage.getItem(key), layoutKey)).toBe(hiddenLayout);
  await customize.click();
  await expect(popover.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await popover.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.swap-chart-disclosure')).toBeVisible();
  await expect(page.locator('.swap-chart-disclosure')).not.toHaveAttribute('open');
  await expect(page.locator('.swap-chart-disclosure__body')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('disclaimer requires explicit acknowledgement and keeps its footer inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openSwap(page, { disclaimer: true });
  const dialog = page.locator('.disclaimer');
  const checkbox = dialog.getByRole('checkbox');
  const accept = dialog.getByRole('button', { name: 'Accept & Hide' });
  await expect(checkbox).not.toBeChecked();
  await expect(accept).toBeDisabled();
  await expect(dialog.locator('.disclaimer__text')).toHaveCSS('font-size', '16px');
  await expect(dialog.locator('.disclaimer__text')).toHaveCSS('line-height', '25.6px');
  const footer = await dialog.locator('.disclaimer__footer').boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(740);
  await expect(dialog.locator('a[href*="/polkaswap/terms"]').first()).toBeAttached();
  await page.screenshot({
    path: path.join(artifactDirectory, 'after-disclaimer-320.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(640);
  await page.screenshot({
    path: path.join(artifactDirectory, 'after-disclaimer-desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('dexSettings.disclaimerApprove'))).toBe('true');
});

test('wallet guidance wraps and settings dialog restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await openSwap(page);
  const settings = page.locator('.swap-widget .el-button--settings');
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.market-algorithm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
  await page.locator('.swap-widget .action-button').click();
  await expect(page.getByText('Built-in wallets', { exact: true })).toBeVisible();
  await expect(page.getByText('Browser and mobile wallets', { exact: true })).toBeVisible();
  await expect(page.getByText('Create or import a SORA account directly in Polkaswap.', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: path.join(artifactDirectory, 'after-wallet-390.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

for (const locale of ['de', 'ar']) {
  test(`${locale}: long labels and RTL remain usable at narrow widths and 200% zoom equivalent viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await openSwap(page, { locale });
    if (locale === 'ar') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(artifactDirectory, `after-${locale}-390.png`),
      fullPage: true,
      animations: 'disabled',
    });
    // Browser zoom halves the CSS viewport; CSS zoom alone would not change media-query breakpoints.
    await page.setViewportSize({ width: 720, height: 600 });
    await expectNoHorizontalOverflow(page);
    const primary = page.locator('.swap-widget .action-button');
    await primary.scrollIntoViewIfNeeded();
    await expect(primary).toBeInViewport();
  });
}

test('Bridge connection labels follow selected networks and reversed direction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await openSwap(page);
  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  const panels = page.locator('.bridge .account-panel-button');
  await expect(panels).toHaveCount(2);
  // Runtime fixtures have no default networks; select Ethereum before checking direction labels.
  await page.evaluate(() => {
    const pinia = (
      window as typeof window & { __PS_ACTIVE_PINIA__: { _s: Map<string, { $patch: (state: object) => void }> } }
    ).__PS_ACTIVE_PINIA__;
    (pinia._s.get('web3-legacy') ?? pinia._s.get('web3'))!.$patch({ networkType: 'EVMLegacy', networkSelected: 1 });
  });
  await expect(page.getByRole('button', { name: 'Connect Ethereum Mainnet wallet', exact: true })).toBeVisible();
  const initial = await panels.allTextContents();
  expect(initial.join(' ')).toContain('SORA');
  expect(initial.join(' ')).toContain('Ethereum');
  await page.getByRole('button', { name: 'Reverse token direction', exact: true }).click();
  await expect(panels.nth(0)).toHaveText(initial[1]);
  await expect(panels.nth(1)).toHaveText(initial[0]);
  // Seeding a selected network isolates label reactivity from a live bridge RPC connection.
  await page.evaluate(() => {
    const pinia = (
      window as typeof window & { __PS_ACTIVE_PINIA__: { _s: Map<string, { $patch: (state: object) => void }> } }
    ).__PS_ACTIVE_PINIA__;
    (pinia._s.get('web3-legacy') ?? pinia._s.get('web3'))!.$patch({ networkType: 'Sub', networkSelected: 'Liberland' });
  });
  await expect(page.getByRole('button', { name: 'Connect Liberland wallet', exact: true })).toBeVisible();
  for (const panel of await panels.all()) {
    const label = panel.locator('.s-button__text');
    await expect(label).toHaveCSS('white-space', 'normal');
    const [buttonBox, labelBox] = await Promise.all([panel.boundingBox(), label.boundingBox()]);
    expect(labelBox!.width).toBeLessThanOrEqual(buttonBox!.width - 20);
    expect(buttonBox!.height).toBeGreaterThanOrEqual(labelBox!.height + 10);
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: path.join(artifactDirectory, 'after-bridge-390.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
