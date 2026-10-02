import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, ipfsBasePath, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

/** Mount the same production bundle at / as well as the preview server's IPFS prefix. */
async function mountRootAssets(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname === '127.0.0.1' && !url.pathname.startsWith(ipfsBasePath),
    async (route) => {
      const url = new URL(route.request().url());
      url.pathname = `${ipfsBasePath}${url.pathname}`;
      const response = await route.fetch({ url: url.href });
      await route.fulfill({ response });
    }
  );
}

/** Inspect the real IndexedDB ledger; optionally simulate a prior browser session that ended abruptly. */
async function ledger(page: Page, persistRunning = false) {
  return page.evaluate(async (running) => {
    return new Promise<{ mode: string; status: string; orders: number; persisted: string }>((resolve, reject) => {
      const request = indexedDB.open('polkaswap-bots-v1', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('ledger', running ? 'readwrite' : 'readonly');
        const store = tx.objectStore('ledger');
        const read = store.get('state');
        let result: { mode: string; status: string; orders: number; persisted: string };
        read.onsuccess = () => {
          const value = read.result;
          if (running) {
            value.bots[0].mode = 'live';
            value.bots[0].status = 'running';
            value.bots[0].sessionExpiresAt = Date.now() + 3600000;
            store.put(value, 'state');
          }
          result = {
            mode: value.bots[0].mode,
            status: value.bots[0].status,
            orders: value.orders.length,
            persisted: JSON.stringify(value),
          };
        };
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }, persistRunning);
}

for (const browserName of ['chromium', 'webkit'] as const) {
  test.describe(`Bots ${browserName}`, () => {
    for (const hosting of ['root', 'ipfs'] as const) {
      test(`${hosting}: paper creation, consent, reload and responsive workspace`, async ({ playwright, baseURL }) => {
        test.setTimeout(120_000);
        const browser = await playwright[browserName].launch();
        const context = await browser.newContext({ baseURL });
        const page = await context.newPage();
        try {
          if (hosting === 'root') await mountRootAssets(page);
          await preparePage(page, { stubRuntimeEnv: true });
          const errors = trackConsole(page);
          const failures: string[] = [];
          page.on('requestfailed', (request) => failures.push(request.url()));
          await page.setViewportSize({ width: 1440, height: 960 });
          await page.goto(`${hosting === 'root' ? '/?ipfs-check=1' : ipfsEntryUrl}#/bots/lab`);
          await ensureAppLoaded(page);
          await expect(page.locator('.bots-page h1')).toHaveText('Bots');
          await expect(page).toHaveTitle('Bots - Polkaswap');
          await expect(page.getByTestId('strategy-lab')).toBeVisible();
          await expect(page.getByTestId('your-bots-tab')).toBeVisible();
          await page.getByTestId('your-bots-tab').click();
          await expect(page.getByTestId('new-bot')).toBeVisible();
          await page.getByTestId('new-bot').click();
          await expect(page.getByTestId('bot-name')).toBeVisible();
          await page.getByTestId('bot-name').fill('XOR strategy');
          await page.getByTestId('allocation').fill('12.000000000000000001');
          await page.getByRole('button', { name: 'Create bot', exact: true }).click();
          await expect(page.locator('.bot-toolbar h2')).toHaveText('XOR strategy');
          await expect(page.getByTestId('mode')).toHaveValue('paper');
          await expect(page.locator('input[type="password"]')).toHaveCount(0);
          expect((await ledger(page)).orders).toBe(0);
          await expect(page.locator('.bot-inspector')).toBeVisible();
          const columns = await page.evaluate(() => {
            const navigation = document.querySelector('.bot-navigation')!.getBoundingClientRect();
            const main = document.querySelector('.bot-main')!.getBoundingClientRect();
            const inspector = document.querySelector('.bot-inspector')!.getBoundingClientRect();
            return {
              navigationWidth: navigation.width,
              navigationRight: navigation.right,
              mainLeft: main.left,
              mainRight: main.right,
              inspectorLeft: inspector.left,
            };
          });
          expect(columns.navigationWidth).toBeLessThan(250);
          expect(columns.mainLeft).toBeGreaterThanOrEqual(columns.navigationRight - 1);
          expect(columns.inspectorLeft).toBeGreaterThanOrEqual(columns.mainRight - 1);
          const output = path.resolve('output/playwright/bots');
          await mkdir(output, { recursive: true });
          await page.screenshot({ path: path.join(output, `${browserName}-${hosting}-desktop.png`), fullPage: true });
          // Open a portrait browser context instead of resizing desktop WebKit's landscape screen.
          const mobileContext = await browser.newContext({
            baseURL,
            viewport: { width: 390, height: 844 },
            screen: { width: 390, height: 844 },
            isMobile: true,
            storageState: await context.storageState({ indexedDB: true }),
          });
          const mobilePage = await mobileContext.newPage();
          if (hosting === 'root') await mountRootAssets(mobilePage);
          await preparePage(mobilePage, { stubRuntimeEnv: true });
          const mobileErrors = trackConsole(mobilePage);
          await mobilePage.goto(page.url());
          await ensureAppLoaded(mobilePage);
          await mobilePage.getByTestId('your-bots-tab').click();
          await expect(mobilePage.getByTestId('start')).toBeVisible();
          await expect
            .poll(() => mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
            .toBe(true);
          await mobilePage.screenshot({
            path: path.join(output, `${browserName}-${hosting}-mobile.png`),
            fullPage: true,
          });
          await mobilePage.getByTestId('mode').scrollIntoViewIfNeeded();
          await mobilePage.getByTestId('mode').selectOption('live');
          await mobilePage.getByTestId('save-settings').click();
          await mobilePage.getByTestId('start').scrollIntoViewIfNeeded();
          await mobilePage.getByTestId('start').click();
          await expect(mobilePage.getByTestId('consent-form')).toBeVisible();
          const mobileDialog = await mobilePage.getByRole('dialog').boundingBox();
          expect(mobileDialog!.x).toBeGreaterThanOrEqual(0);
          expect(mobileDialog!.x + mobileDialog!.width).toBeLessThanOrEqual(390);
          expect(mobileDialog!.height).toBeLessThanOrEqual(844);
          expect(mobileErrors).toEqual([]);
          await page.getByTestId('mode').selectOption('live');
          await page.getByTestId('save-settings').click();
          await expect(page.locator('.mode-tag')).toHaveText('Live');
          await page.getByTestId('start').click();
          await expect(page.getByTestId('consent-form')).toBeVisible();
          await expect(page.getByRole('dialog')).toContainText('Allowed trading pair');
          await expect(page.getByRole('dialog')).toContainText('Network fee budget');
          await expect(
            page.getByTestId('consent-form').getByRole('button', { name: 'Connect your wallet first' })
          ).toBeDisabled();
          await page.getByTestId('wallet-password').fill('not-a-real-wallet-secret');
          await page.getByRole('dialog').press('Escape');
          expect((await ledger(page)).persisted).not.toContain('not-a-real-wallet-secret');
          await ledger(page, true);
          await page.reload();
          await page.getByTestId('your-bots-tab').click();
          await expect(page.getByTestId('start')).toHaveText('Resume');
          await expect(page.getByTestId('pause')).toHaveCount(0);
          await expect(page.locator('fieldset')).toHaveAttribute('disabled', '');
          expect((await ledger(page)).orders).toBe(0);
          await page.getByTestId('start').click();
          await expect(page.getByTestId('consent-form')).toBeVisible();
          await expect(page.getByTestId('wallet-password')).toHaveValue('');
          const secondPage = await context.newPage();
          if (hosting === 'root') await mountRootAssets(secondPage);
          await preparePage(secondPage, { stubRuntimeEnv: true });
          const secondErrors = trackConsole(secondPage);
          await secondPage.goto(page.url());
          await secondPage.getByTestId('your-bots-tab').click();
          await expect(secondPage.getByTestId('start')).toHaveText('Resume');
          await expect(secondPage.getByTestId('pause')).toHaveCount(0);
          expect((await ledger(secondPage)).orders).toBe(0);
          expect(secondErrors).toEqual([]);
          expect(errors).toEqual([]);
          expect(failures).toEqual([]);
        } finally {
          await Promise.all(
            browser
              .contexts()
              .flatMap((item) => item.pages())
              .map((item) => item.unrouteAll({ behavior: 'ignoreErrors' }))
          );
          await browser.close();
        }
      });
    }
  });
}
