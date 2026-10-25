import { expect, test } from '@playwright/test';

import { ensureAppLoaded, ipfsEntryUrl, preparePage } from './support/ipfs';

for (const locale of ['en', 'ar']) {
  test(`${locale}: sidebar controls stay inside the viewport across responsive and zoom widths`, async ({ page }) => {
    await preparePage(page, { stubRuntimeEnv: true });
    await page.addInitScript((language) => {
      localStorage.setItem('dexSettings.language', language);
      Object.defineProperty(screen, 'orientation', {
        configurable: true,
        value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} },
      });
    }, locale);
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(process.env.PS_RTL_TEST_URL ?? `${ipfsEntryUrl}#/swap`);
    await ensureAppLoaded(page);
    await expect(page.locator('.swap-widget')).toBeVisible();

    for (const width of [528, 720, 768, 1024, 1440, 720]) {
      await page.setViewportSize({ width, height: 600 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      const menu = await page.locator('.app-menu').boundingBox();
      const body = await page.locator('.app-body').boundingBox();
      expect(menu).not.toBeNull();
      expect(body).not.toBeNull();
      if (locale === 'ar') {
        expect(menu!.x).toBeGreaterThan(body!.x);
      } else {
        expect(menu!.x).toBeLessThan(body!.x);
      }
      const collapse = await page.locator('.collapse-button').boundingBox();
      expect(collapse).not.toBeNull();
      expect(collapse!.x).toBeGreaterThanOrEqual(0);
      expect(collapse!.x + collapse!.width).toBeLessThanOrEqual(width);
    }
  });
}
