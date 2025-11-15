import { expect, test } from '@playwright/test';

import { ensureAppLoaded, expectHash, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('renders the bridge form shell and CTA', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/bridge`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/bridge');

  const asyncTranslations = await page.evaluate(() => (window as any).__ASYNC_TRANSLATIONS__);
  console.log('async translations (bridge)', asyncTranslations);
  const bodyText = await page.innerText('body');
  console.log('bridge body text', bodyText);
  const bridgeHtml = await page.content();
  console.log('bridge html', bridgeHtml);
  const bridgeContent = await page.evaluate(() => {
    const el = document.querySelector('.app-content');
    return el ? el.innerHTML : null;
  });
  console.log('bridge content', bridgeContent);

  await expect(page.locator('.bridge')).toBeVisible();
  await expect(page.getByRole('heading', { name: /hashi bridge/i })).toBeVisible();
  await expect(page.locator('[data-test-name="nextButton"]')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('shows MoonPay purchase option on the deposit page', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/deposit`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/deposit');

  const asyncTranslationsBefore = await page.evaluate(() => (window as any).__ASYNC_TRANSLATIONS__);
  console.log('async translations (deposit before)', asyncTranslationsBefore);
  const depositBodyText = await page.innerText('body');
  console.log('deposit body text', depositBodyText);
  const depositHtml = await page.content();
  console.log('deposit html', depositHtml);
  const depositContent = await page.evaluate(() => {
    const el = document.querySelector('.app-content');
    return el ? el.innerHTML : null;
  });
  console.log('deposit content', depositContent);

  const moonpayCard = page.locator('.pay-options-moonpay');
  console.log('console errors deposit', consoleErrors);
  await expect(moonpayCard).toBeVisible();
  await expect(moonpayCard.getByRole('heading', { name: /moonpay/i })).toBeVisible();
  await expect(moonpayCard.getByRole('button')).toBeVisible();

  const asyncTranslationsAfter = await page.evaluate(() => (window as any).__ASYNC_TRANSLATIONS__);
  console.log('async translations (deposit after)', asyncTranslationsAfter);

  expect(consoleErrors).toEqual([]);
});
