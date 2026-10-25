import { expect, test, type Page } from '@playwright/test';
import { ensureAppLoaded, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

/** Check disclosure removal through rendered controls, including after selecting a different strategy. */
async function expectExpandedControls(page: Page): Promise<void> {
  await expect(page.locator('.bots-page details, .bots-page summary')).toHaveCount(0);
  await expect(page.locator('.bots-page button[aria-expanded]')).toHaveCount(0);
  const choices = page.getByTestId('lab-strategy-picker').getByRole('button');
  await expect(choices).toHaveCount(12);
  for (const choice of await choices.all()) await expect(choice).toBeVisible();
  for (const id of [
    'lab-trading-settings',
    'lab-validation-settings',
    'lab-comparison-settings',
    'lab-interval-blocks',
    'lab-trade-percent',
    'lab-add-output',
    'lab-composer-section',
    'composer-prompt',
    'backtesting-tab',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId('lab-validation-settings').locator('select').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

for (const browserName of ['chromium', 'webkit'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Bots ${browserName} ${theme}: choices and settings stay expanded on desktop and mobile`, async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      try {
        await preparePage(page, { stubRuntimeEnv: true });
        await page.addInitScript((selectedTheme) => {
          localStorage.setItem('dexSettings.theme', selectedTheme);
          Object.defineProperty(screen, 'orientation', {
            configurable: true,
            value: {
              get type() {
                return innerWidth > innerHeight ? 'landscape-primary' : 'portrait-primary';
              },
              addEventListener() {},
              removeEventListener() {},
            },
          });
        }, theme);
        const errors = trackConsole(page);
        await page.goto(`${ipfsEntryUrl}#/bots`);
        await ensureAppLoaded(page);
        for (const viewport of [
          { width: 1440, height: 1000 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await expectExpandedControls(page);
          await page.getByTestId('rule-recipe-spring').click();
          await expectExpandedControls(page);
          await expect(page.getByTestId('rule-kind-entry-0')).toBeVisible();
          await expect(page.locator('.rule-method')).toBeVisible();
          await page.getByTestId('lab-quick-preset-sma').click();
          await expectExpandedControls(page);
          await expect(page.getByTestId('lab-fast-window')).toBeVisible();
          await expect(page.getByTestId('lab-slow-window')).toBeVisible();
          await page.getByTestId('lab-strategy-picker').screenshot({
            path: testInfo.outputPath(`choices-${viewport.width}.png`),
          });
        }
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });
  }
}
