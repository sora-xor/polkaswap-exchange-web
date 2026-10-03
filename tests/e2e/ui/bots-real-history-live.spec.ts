import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { BotDefinition } from '@/features/bot-trading/types';
import { ensureAppLoaded, ipfsBasePath, trackConsole } from './support/ipfs';

test.use({ trace: 'off' });

test.skip(process.env.PS_E2E_LIVE_NETWORK !== '1', 'Explicit opt-in required: this suite reads the live SORA network.');

/** Open the advanced workspace before selecting its Backtesting tab. */
async function openBacktesting(page: Page): Promise<void> {
  const advanced = page.getByTestId('bots-advanced');
  if (await advanced.isVisible()) await advanced.click();
  await page.getByTestId('backtesting-tab').click();
}

/** Change the public replay control, preserving the actual candle-derived candidate data. */
async function seek(page: Page, value: string): Promise<void> {
  await page.getByTestId('distribution-scrub').evaluate((element, position) => {
    const input = element as HTMLInputElement;
    input.value = position;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/** Verify the visual ladder's money totals advance and rewind with all real candidates. */
async function verifyAccounting(page: Page, count: number): Promise<void> {
  const metrics = page.locator('.research-metrics');
  await seek(page, '1000');
  await expect(metrics).toHaveAttribute('data-landed-trades', String(count));
  const complete = await metrics.textContent();
  const completeCosts = await page.getByTestId('research-costs').textContent();
  await seek(page, '0');
  await expect(metrics).toHaveAttribute('data-landed-trades', '0');
  await expect(page.getByTestId('playground-return')).toHaveText('0.00%');
  for (const id of ['research-selected-profit', 'research-missed-profit', 'research-avoided-loss'])
    await expect(page.getByTestId(id)).toHaveText('0.00XOR');
  const initial = await metrics.textContent();
  const initialCosts = await page.getByTestId('research-costs').textContent();
  await seek(page, '380');
  await expect.poll(async () => Number(await metrics.getAttribute('data-landed-trades'))).toBeGreaterThan(0);
  expect(Number(await metrics.getAttribute('data-landed-trades'))).toBeLessThan(count);
  expect(await metrics.textContent()).not.toBe(complete);
  expect(await page.getByTestId('research-costs').textContent()).not.toBe(initialCosts);
  await seek(page, '0');
  await expect(metrics).toHaveText(initial!);
  await seek(page, '1000');
  await expect(metrics).toHaveText(complete!);
  await expect(page.getByTestId('research-costs')).toHaveText(completeCosts!);
}

/** Read every paginated public ledger row through its UI buttons; no private Vue state is inspected. */
async function verifyEveryCandidate(page: Page, expected: number): Promise<void> {
  await page.getByTestId('research-trade-filter').selectOption('all');
  const ids = await page.getByTestId('research-ledger').evaluate(async (element) => {
    const paint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const buttons = element.querySelectorAll<HTMLButtonElement>('.ledger-pagination button');
    const previous = buttons[0];
    const next = buttons[buttons.length - 1];
    for (let count = 0; !previous.disabled && count < 300; count++) {
      previous.click();
      await paint();
    }
    const result: string[] = [];
    for (let count = 0; count < 300; count++) {
      result.push(
        ...Array.from(element.querySelectorAll('tbody tr td:first-child button'), (row) => row.textContent ?? '')
      );
      if (next.disabled) return result;
      next.click();
      await paint();
    }
    throw new Error('The real trade ledger did not terminate within its 10,000-candidate bound.');
  });
  expect(ids).toHaveLength(expected);
  expect(new Set(ids).size).toBe(expected);
  await page.getByTestId('distribution-canvas').press('End');
  await expect(page.getByTestId('distribution-focused')).toContainText(`Trade ${expected} of ${expected}`);
  await expect(page.getByTestId('research-inspector')).toContainText(ids.at(-1)!);
}

/** Inspect only this isolated browser context's bot definitions and simulated ledger. */
async function savedState(page: Page): Promise<{ bots: BotDefinition[]; orders: unknown[] }> {
  return page.evaluate(
    () =>
      new Promise<{ bots: BotDefinition[]; orders: unknown[] }>((resolve, reject) => {
        const request = indexedDB.open('polkaswap-bots-v1', 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('ledger', 'readonly');
          const read = transaction.objectStore('ledger').get('state');
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result ?? { bots: [], orders: [] });
          transaction.oncomplete = () => db.close();
        };
      })
  );
}

for (const browserName of ['chromium', 'webkit'] as const) {
  for (const mobile of [false, true]) {
    test(`Live SORA real history ${browserName} ${mobile ? 'mobile' : 'desktop'}: March history, directional fees, animated accounting and bot creation`, async ({
      playwright,
      baseURL,
    }) => {
      test.setTimeout(300_000);
      const output = path.resolve('output/playwright/bots-real-history');
      await mkdir(output, { recursive: true });
      const browser = await playwright[browserName].launch();
      const recordReplay = browserName === 'chromium' && !mobile;
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        screen: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        isMobile: mobile,
        locale: 'en-US',
        timezoneId: 'UTC',
        reducedMotion: 'no-preference',
        ...(recordReplay
          ? { recordVideo: { dir: path.join(output, 'video'), size: { width: 1440, height: 1000 } } }
          : {}),
      });
      const page = await context.newPage();
      const recordingStarted = Date.now();
      const consoleErrors = trackConsole(page, { mode: 'live' });
      const websockets: string[] = [];
      const historyResponses: string[] = [];
      const failedAppRequests: string[] = [];
      page.on('websocket', (socket) => websockets.push(socket.url()));
      page.on('response', (response) => {
        if (/bot.*histor|histor.*bot/i.test(response.url()) && response.ok()) historyResponses.push(response.url());
        if (response.status() >= 400 && response.url().startsWith(baseURL!))
          failedAppRequests.push(`${response.status()} ${response.url()}`);
      });
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(baseURL!))
          failedAppRequests.push(`${request.failure()?.errorText} ${request.url()}`);
      });
      try {
        // The only initial state change accepts the UI disclaimer in this disposable browser context.
        // No request interception, fake clock, WebSocket replacement, API seam, or imported rows are used.
        await page.addInitScript(() => localStorage.setItem('dexSettings.disclaimerApprove', 'true'));
        await page.goto(`${baseURL}${ipfsBasePath}/#/bots`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await ensureAppLoaded(page);
        await openBacktesting(page);
        await expect(page.getByTestId('research-history-range')).toContainText('2026-03-01');
        await expect(page.getByTestId('research-token-in')).toHaveValue(`0x0200${'0'.repeat(60)}`);
        await expect(page.getByTestId('research-token-out')).toHaveValue(`0x020004${'0'.repeat(58)}`);
        await expect(page.getByTestId('distribution-canvas')).toBeVisible({ timeout: 120_000 });
        await expect(page.getByTestId('bot-playground')).toHaveAttribute('aria-busy', 'false', { timeout: 120_000 });
        await expect(page.getByTestId('playground-save')).toBeEnabled();
        await expect(page.getByTestId('playground-error')).toHaveCount(0);
        await expect(page.getByTestId('research-entry-price')).not.toContainText('0.00 ·');
        await expect(page.getByTestId('research-mark-price')).not.toContainText('0.00 ·');
        await expect(page.getByTestId('playground-data-label')).toContainText('Historical');
        const candidateCount = Number(await page.getByTestId('research-ledger').locator('h3 small').textContent());
        expect(candidateCount).toBeGreaterThan(1000);
        expect(candidateCount).toBeLessThanOrEqual(10000);
        await expect(page.getByTestId('distribution-count')).toContainText(String(candidateCount));
        for (const id of ['research-network-fee', 'research-sell-network-fee']) {
          const value = (await page.getByTestId(id).textContent())!.trim();
          expect(value).toMatch(/^0\.1\d*$/);
          expect(value).not.toBe('0.0007');
          expect(await page.getByTestId(id).evaluate((element) => element.tagName)).toBe('OUTPUT');
        }
        await expect(page.getByTestId('research-fee-provenance')).toContainText(/block/i);
        const connectedNode = await page.evaluate(
          () =>
            (
              window as unknown as {
                PolkaswapAgent: {
                  status: () => { node: { connected: boolean; endpoint: string; genesisHash: string } };
                };
              }
            ).PolkaswapAgent.status().node
        );
        expect(connectedNode.connected).toBe(true);
        expect(connectedNode.genesisHash).toBe('0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5');
        expect(['wss://ws.mof.sora.org', 'wss://mof2.sora.org']).toContain(new URL(connectedNode.endpoint).origin);
        expect(websockets.map((url) => new URL(url).origin)).toContain(new URL(connectedNode.endpoint).origin);
        await page.screenshot({
          path: path.join(output, `${browserName}-${mobile ? 'mobile' : 'desktop'}-overview.png`),
        });
        await verifyAccounting(page, candidateCount);
        console.info(
          `${browserName} ${mobile ? 'mobile' : 'desktop'}: live history, fees and replay accounting verified (${candidateCount} candidates)`
        );

        let replayStartedAtSeconds: number | undefined;
        if (recordReplay) {
          await page.getByTestId('distribution-canvas').scrollIntoViewIfNeeded();
          replayStartedAtSeconds = (Date.now() - recordingStarted) / 1000;
          await page.getByTestId('distribution-replay').click();
          await page.getByTestId('distribution-canvas').scrollIntoViewIfNeeded();
          // Frame the whole ladder below the sticky profit counters after the replay button scrolls into view.
          await page.getByTestId('distribution-canvas').evaluate((element) => {
            const metrics = document.querySelector('.research-metrics')!;
            const offset = element.getBoundingClientRect().top - metrics.getBoundingClientRect().bottom - 16;
            let container = element.parentElement;
            while (container) {
              if (
                container.scrollHeight > container.clientHeight &&
                /auto|scroll/.test(getComputedStyle(container).overflowY)
              ) {
                container.scrollBy(0, offset);
                return;
              }
              container = container.parentElement;
            }
            window.scrollBy(0, offset);
          });
          await page.screenshot({ path: path.join(output, 'replay-framing.png') });
          await expect(page.getByTestId('distribution-scrub')).toHaveValue('1000', { timeout: 100_000 });
          await expect(page.locator('.research-metrics')).toHaveAttribute('data-landed-trades', String(candidateCount));
        }
        await verifyEveryCandidate(page, candidateCount);
        console.info(`${browserName}: every candidate verified`);
        await page.getByTestId('research-trade-filter').selectOption('excluded');
        await expect(page.getByTestId('research-ledger').locator('tbody tr')).not.toHaveCount(0);
        await page.getByTestId('research-ledger').locator('tbody tr td:first-child button').first().click();
        await expect(page.getByTestId('research-inspector').locator('.constraint-list li')).toHaveCount(5);
        await expect(
          page.getByTestId('research-inspector').locator('.constraint-list li:not(.passed)')
        ).not.toHaveCount(0);
        await expect(page.getByTestId('distribution-count')).toContainText(String(candidateCount));

        await page.getByTestId('research-validation').selectOption('walk-forward');
        await page.getByTestId('research-folds').selectOption('3');
        await page.getByTestId('research-optimize').check();
        await expect(page.getByTestId('research-validation-results').locator('tbody tr')).toHaveCount(3, {
          timeout: 60_000,
        });
        await expect(page.getByTestId('research-validation-results')).toContainText('one-candle gap');
        await expect(page.getByTestId('research-apply-trained')).toBeEnabled();
        await page.getByTestId('research-apply-trained').click();
        await expect(page.getByTestId('research-validation')).toHaveValue('none');
        await expect(page.getByTestId('distribution-canvas')).toBeVisible({ timeout: 60_000 });
        await expect(page.getByTestId('playground-save')).toBeEnabled();
        await expect(page.getByTestId('research-validation-results').locator('tbody tr')).toHaveCount(0);
        await seek(page, '1000');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const metricPositions = await page.locator('.research-metrics > div').evaluateAll((elements) =>
          elements.map((element) => ({
            left: element.getBoundingClientRect().left,
            top: element.getBoundingClientRect().top,
          }))
        );
        expect(new Set(metricPositions.map(({ top }) => Math.round(top))).size).toBe(mobile ? 2 : 1);
        await page.getByTestId('distribution-canvas').scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(output, `${browserName}-${mobile ? 'mobile' : 'desktop'}-distribution.png`),
        });

        console.info(`${browserName}: validation and training verified`);
        await page.getByTestId('research-bot-name').fill('March 2026 real history');
        await page.getByTestId('playground-save').click();
        await expect(page.locator('.bots-error')).toHaveCount(0);
        await expect(page.getByTestId('your-bots-tab')).toHaveAttribute('aria-current', 'page', { timeout: 30_000 });
        await expect(page.getByTestId('mode')).toHaveValue('paper');
        const saved = await savedState(page);
        expect(saved.bots).toHaveLength(1);
        const bot = saved.bots[0];
        expect(bot.mode).toBe('paper');
        expect(bot.status).toBe('idle');
        expect(bot.portfolio.trades).toBe(0);
        expect(bot.portfolio.feesPaidCodec).toBe('0');
        expect(bot.portfolio.holdings).toEqual(bot.portfolio.initial);
        expect(bot.equity).toEqual([]);
        expect(saved.orders).toHaveLength(0);
        expect(bot.research?.source).toBe('historical');
        expect(bot.research?.startAt).toBeGreaterThanOrEqual(Date.parse('2026-03-01T00:00:00Z'));
        expect(bot.research?.startAt).toBeLessThanOrEqual(Date.parse('2026-03-01T01:00:00Z'));
        expect(bot.research?.validation).toBe('none');
        expect(bot.research?.feeObservation?.endpoint).toBe(new URL(connectedNode.endpoint).origin);
        expect(bot.research?.feeObservation?.blockNumber).toBeGreaterThan(27_000_000);
        expect(bot.research?.sellNetworkFeeXor).toMatch(/^0\.1\d*$/);
        await expect(page.getByTestId('consent-form')).toHaveCount(0);
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
        await ensureAppLoaded(page);
        await openBacktesting(page);
        await page.getByTestId('your-bots-tab').click();
        await expect(page.getByTestId('mode')).toHaveValue('paper', { timeout: 30_000 });
        expect(await savedState(page)).toEqual(saved);
        await page.getByTestId('backtest').click();
        await expect(page.getByTestId('bot-backtest-range')).toContainText('2026-03-01');
        await expect(page.getByTestId('backtest-form').locator('select')).toHaveCount(0);
        await page.getByTestId('backtest-form').locator('button[type="submit"]').click();
        await expect(page.getByTestId('backtest-form')).toHaveCount(0, { timeout: 60_000 });
        expect(await savedState(page)).toEqual(saved);
        expect(failedAppRequests).toEqual([]);
        expect(consoleErrors).toEqual([]);
        expect(historyResponses.some((url) => url.includes('/bot-history/sora-mainnet-hourly-2026-03-01.json'))).toBe(
          true
        );
        await writeFile(
          path.join(output, `${browserName}-${mobile ? 'mobile' : 'desktop'}-evidence.json`),
          JSON.stringify(
            {
              candidateCount,
              connectedNode,
              websockets,
              historyResponses,
              feeObservation: bot.research?.feeObservation,
              networkFeeXor: bot.research?.networkFeeXor,
              sellNetworkFeeXor: bot.research?.sellNetworkFeeXor,
              swapFeePercent: bot.research?.swapFeePercent,
              sellSwapFeePercent: bot.research?.sellSwapFeePercent,
              replayStartedAtSeconds,
              failedAppRequests,
              consoleErrors,
            },
            null,
            2
          )
        );
      } catch (error) {
        console.error('Visible errors', await page.locator('[role="alert"]').allTextContents());
        console.error('Browser errors', consoleErrors);
        console.error('Live browser failure', String(error));
        throw error;
      } finally {
        const video = page.video();
        await context.close();
        if (recordReplay && video) await video.saveAs(path.join(output, 'video', 'chromium-desktop.webm'));
        await browser.close();
      }
    });
  }
}

for (const browserName of ['chromium', 'webkit'] as const) {
  test(`Live SORA intermediate XOR fees ${browserName}: VAL/PSWAP backtesting`, async ({ playwright, baseURL }) => {
    test.setTimeout(180_000);
    const browser = await playwright[browserName].launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'en-US',
      timezoneId: 'UTC',
    });
    const page = await context.newPage();
    const errors = trackConsole(page, { mode: 'live' });
    try {
      await page.addInitScript(() => localStorage.setItem('dexSettings.disclaimerApprove', 'true'));
      await page.goto(`${baseURL}${ipfsBasePath}/#/bots`, { waitUntil: 'domcontentloaded' });
      await ensureAppLoaded(page);
      await openBacktesting(page);
      await page.getByTestId('research-token-out').selectOption(`0x020005${'0'.repeat(58)}`);
      await page.getByTestId('research-token-in').selectOption(`0x020004${'0'.repeat(58)}`);
      await expect(page.getByTestId('distribution-canvas')).toBeVisible({ timeout: 120_000 });
      await expect(page.getByTestId('playground-save')).toBeEnabled();
      await expect(page.getByTestId('playground-history-coverage')).toContainText('100.00%');
      await expect(page.getByTestId('research-history-range')).toContainText('2026-03-01');
      const fees: Record<string, string> = {};
      for (const id of [
        'research-network-fee',
        'research-sell-network-fee',
        'research-swap-fee',
        'research-sell-swap-fee',
      ])
        fees[id] = (await page.getByTestId(id).textContent())!.trim();
      expect(fees['research-network-fee']).toMatch(/^0\.1\d*$/);
      expect(fees['research-sell-network-fee']).toMatch(/^0\.1\d*$/);
      for (const id of ['research-swap-fee', 'research-sell-swap-fee']) {
        expect(Number(fees[id])).toBeGreaterThan(1.19);
        expect(Number(fees[id])).toBeLessThan(1.2);
      }
      await seek(page, '1000');
      await expect(page.getByTestId('research-costs')).toContainText('XOR');
      await page.getByTestId('research-bot-name').fill('Real VAL PSWAP route');
      await page.getByTestId('playground-save').click();
      await expect(page.getByTestId('your-bots-tab')).toHaveAttribute('aria-current', 'page', { timeout: 30_000 });
      const state = await savedState(page);
      expect(state.bots).toHaveLength(1);
      expect(state.bots[0].assetIn.symbol).toBe('VAL');
      expect(state.bots[0].assetOut.symbol).toBe('PSWAP');
      expect(state.bots[0].portfolio.trades).toBe(0);
      expect(state.bots[0].portfolio.holdings).toEqual(state.bots[0].portfolio.initial);
      expect(state.orders).toEqual([]);
      expect(errors).toEqual([]);
      const output = path.resolve('output/playwright/bots-real-history');
      await mkdir(output, { recursive: true });
      await writeFile(
        path.join(output, `${browserName}-intermediate-xor-fees.json`),
        JSON.stringify({ fees, research: state.bots[0].research, errors }, null, 2)
      );
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
