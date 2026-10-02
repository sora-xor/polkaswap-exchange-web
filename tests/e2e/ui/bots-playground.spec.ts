import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { PolkaswapAgentApi } from '@/features/agent-trading/types';
import { ensureAppLoaded, ipfsBasePath, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

test.describe.configure({ mode: 'parallel' });

interface PlaygroundMockState {
  quotes: number;
  readyRequests: Array<{ requireNode?: boolean; requireWallet?: boolean }>;
}

/** Reuse the existing browser API seam with unsigned quotes; no production test hook is installed. */
async function mockUnsignedMarket(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as { playgroundMock: PlaygroundMockState; PolkaswapAgent: PolkaswapAgentApi };
    const state: PlaygroundMockState = { quotes: 0, readyRequests: [] };
    target.playgroundMock = state;
    const assets = [
      { address: `0x0200${'0'.repeat(60)}`, symbol: 'XOR', name: 'SORA', decimals: 18 },
      { address: `0x020004${'0'.repeat(58)}`, symbol: 'VAL', name: 'SORA Validator Token', decimals: 18 },
      { address: `0x020005${'0'.repeat(58)}`, symbol: 'PSWAP', name: 'Polkaswap', decimals: 18 },
    ];
    const status = () => ({
      version: 'v1',
      agent: { mode: false, disclaimerSuppressed: true, queryParam: '' },
      node: {
        connected: true,
        endpoint: 'wss://mock.invalid',
        genesisHash: `0x${'1'.repeat(64)}`,
        blockNumber: 100,
        runtimeSpecVersion: 1,
      },
      wallet: { loaded: true, connected: false, address: '', source: '', availableWallets: [] },
      settings: { slippageTolerance: '0.5' },
    });
    const codec = (value: string) => {
      const [whole, fraction = ''] = value.split('.');
      return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'));
    };
    const natural = (value: bigint) => {
      const digits = value.toString().padStart(19, '0');
      return `${digits.slice(0, -18)}.${digits.slice(-18)}`.replace(/\.?0+$/, '');
    };
    target.PolkaswapAgent = Object.freeze({
      version: 'v1',
      status,
      assets: async () => assets,
      ready: async (options: { requireNode?: boolean; requireWallet?: boolean }) => {
        state.readyRequests.push(options);
        return status();
      },
      quoteSwap: async (request: {
        amount: string;
        side: string;
        assetIn: { address: string };
        assetOut: { address: string };
      }) => {
        state.quotes++;
        const assetIn = assets.find((asset) => asset.address === request.assetIn.address)!;
        const assetOut = assets.find((asset) => asset.address === request.assetOut.address)!;
        // This unsigned public-API mock cannot establish actual chain state or authorize a research result.
        const output = natural(codec(request.amount) / 5n);
        const amount = (value: string, asset: (typeof assets)[number]) => ({
          asset,
          value,
          codec: codec(value).toString(),
          decimals: asset.decimals,
          display: value,
        });
        return {
          request,
          assetIn,
          assetOut,
          amountIn: request.amount,
          amountOut: output,
          amountWithoutImpact: output,
          amountInMeta: amount(request.amount, assetIn),
          amountOutMeta: amount(output, assetOut),
          amountWithoutImpactMeta: amount(output, assetOut),
          route: [assetIn.address, assetOut.address],
        };
      },
    }) as unknown as PolkaswapAgentApi;
  });
}

/** Exercise the same built application at a root URL and the static IPFS preview prefix. */
async function mountRootAssets(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname === '127.0.0.1' && !url.pathname.startsWith(ipfsBasePath),
    async (route) => {
      const url = new URL(route.request().url());
      url.pathname = `${ipfsBasePath}${url.pathname}`;
      await route.fulfill({ response: await route.fetch({ url: url.href }) });
    }
  );
}

/** Check built CSS geometry so Sass function collisions cannot silently stack the metric grid. */
async function verifyMetricColumns(page: Page, mobile: boolean): Promise<void> {
  const metrics = page.locator('.research-metrics > div');
  await expect(metrics).toHaveCount(4);
  await expect
    .poll(
      async () => {
        const boxes = await metrics.evaluateAll((elements) =>
          elements.map((element) => {
            const { top, left, width, height } = element.getBoundingClientRect();
            return { top, left, width, height };
          })
        );
        const aligned = (a: number, b: number) => Math.abs(a - b) <= 1;
        if (mobile)
          return (
            aligned(boxes[0].top, boxes[1].top) &&
            aligned(boxes[2].top, boxes[3].top) &&
            aligned(boxes[0].left, boxes[2].left) &&
            aligned(boxes[1].left, boxes[3].left) &&
            boxes[1].left >= boxes[0].left + boxes[0].width - 1 &&
            boxes[2].top >= boxes[0].top + boxes[0].height - 1
          );
        return (
          boxes.every((box) => aligned(box.top, boxes[0].top)) &&
          boxes.slice(1).every((box, index) => box.left >= boxes[index].left + boxes[index].width - 1)
        );
      },
      { message: mobile ? 'Metrics occupy two columns on mobile' : 'All four desktop metrics share one row' }
    )
    .toBe(true);
}

for (const browserName of ['chromium', 'webkit'] as const) {
  for (const hosting of ['root', 'ipfs'] as const) {
    for (const mobile of [false, true]) {
      test(`Real-only backtesting ${browserName} ${hosting} ${mobile ? 'mobile' : 'desktop'}: missing chain evidence never produces results`, async ({
        playwright,
        baseURL,
      }) => {
        const browser = await playwright[browserName].launch();
        const context = await browser.newContext({
          baseURL,
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 },
          isMobile: mobile,
        });
        const page = await context.newPage();
        try {
          if (hosting === 'root') await mountRootAssets(page);
          await preparePage(page, { stubRuntimeEnv: true });
          await mockUnsignedMarket(page);
          await page.clock.setFixedTime(new Date('2026-09-14T12:30:00Z'));
          const errors = trackConsole(page);
          await page.goto(`${hosting === 'root' ? '/?ipfs-check=1' : ipfsEntryUrl}#/bots`);
          await ensureAppLoaded(page);
          await page.getByTestId('backtesting-tab').click();
          const playground = page.getByTestId('bot-playground');
          await expect(playground).toBeVisible();
          await expect(playground).toHaveAttribute('aria-busy', 'false', { timeout: 35000 });
          await expect(page.getByTestId('backtesting-tab')).toHaveText('Backtesting');
          await expect(page.getByTestId('your-bots-tab')).toContainText('My Bots');
          await expect(playground).not.toContainText(/Quick test|Synthetic sample|Import CSV/);
          await expect(page.getByTestId('research-history-range')).toContainText('2026-03-01 00:00');
          await expect(page.getByTestId('research-history-range')).toContainText('2026-09-14 12:00');
          await expect(page.getByTestId('distribution-canvas')).toHaveCount(0);
          await expect(page.getByTestId('playground-return')).toHaveText('—%');
          await expect(page.getByTestId('playground-save')).toBeDisabled();
          await expect(page.getByTestId('research-ledger').locator('tbody tr')).toHaveCount(0);
          await expect(page.locator('input[type="file"]')).toHaveCount(0);
          await expect(page.getByTestId('research-network-fee')).toHaveJSProperty('tagName', 'OUTPUT');
          await expect(page.getByTestId('research-network-fee')).toHaveText('—');
          await expect(page.getByTestId('research-swap-fee')).toHaveJSProperty('tagName', 'OUTPUT');
          await expect(page.getByTestId('research-swap-fee')).toHaveText('—');
          await verifyMetricColumns(page, mobile);
          await page.getByTestId('research-token-out').selectOption({ label: 'PSWAP' });
          await page.getByTestId('research-token-in').selectOption({ label: 'VAL' });
          await expect(page.getByTestId('research-token-in')).toHaveValue(`0x020004${'0'.repeat(58)}`);
          await page.getByTestId('playground-preset-sma').click();
          await expect(page.getByTestId('playground-fast')).toBeVisible();
          await expect(page.getByTestId('playground-slow')).toBeVisible();
          await page.getByTestId('research-validation').selectOption('walk-forward');
          await page.getByTestId('research-folds').selectOption('3');
          await page.getByTestId('research-optimize').check();
          await expect(page.getByTestId('playground-save')).toBeDisabled();
          await expect(page.locator('input[type="password"]')).toHaveCount(0);
          await expect(page.getByTestId('consent-form')).toHaveCount(0);
          await expect
            .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
            .toBe(true);
          const output = path.resolve('output/playwright/bots-real-history');
          await mkdir(output, { recursive: true });
          await playground.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(output, `${browserName}-${hosting}-${mobile ? 'mobile' : 'desktop'}-unavailable.png`),
          });
          expect(errors).toEqual([]);
        } finally {
          await page.unrouteAll({ behavior: 'ignoreErrors' });
          await context.close();
          await browser.close();
        }
      });
    }
  }
}
