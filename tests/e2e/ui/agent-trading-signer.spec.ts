import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

import { ipfsBasePath } from './support/ipfs';

const signerSource = process.env.PS_AGENT_SIGNER_SOURCE || 'polkadot-js';
const signerAddress = process.env.PS_AGENT_SIGNER_ADDRESS || '';
const signerProfile = process.env.PS_AGENT_SIGNER_PROFILE || '';
const signerExtensionPath = process.env.PS_AGENT_SIGNER_EXTENSION_PATH || '';
const signerBrowserChannel = process.env.PS_AGENT_SIGNER_CHANNEL || 'chrome';
const shouldExecuteSwap = process.env.PS_AGENT_SIGNER_EXECUTE_SWAP === '1';
const assetInSymbol = process.env.PS_AGENT_SIGNER_ASSET_IN || 'XOR';
const assetOutSymbol = process.env.PS_AGENT_SIGNER_ASSET_OUT || 'VAL';
const swapAmount = process.env.PS_AGENT_SIGNER_AMOUNT || '100';
const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
const ignoreDefaultArgs = ['--disable-extensions', '--disable-component-extensions-with-background-pages'];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function cleanProfileLocks(profilePath: string): Promise<void> {
  for (const file of lockFiles) {
    await fs.rm(path.join(profilePath, file), { force: true }).catch(() => {});
  }
}

async function clickIfVisible(page: Page, pattern: RegExp): Promise<void> {
  const button = page.getByRole('button', { name: pattern }).first();
  if (!(await button.count().catch(() => 0))) return;
  if (!(await button.isVisible().catch(() => false))) return;
  if (await button.isDisabled().catch(() => true)) return;

  await button.click({ force: true }).catch(() => {});
  await sleep(150);
}

async function handleWalletPopups(context: BrowserContext): Promise<void> {
  const pages = context.pages().filter((page) => page.url().startsWith('chrome-extension://'));

  for (const page of pages) {
    await clickIfVisible(page, /select all/i);
    await clickIfVisible(page, /yes, allow this application access/i);
    await clickIfVisible(page, /allow/i);
    await clickIfVisible(page, /approve/i);
    await clickIfVisible(page, /authorize/i);
    await clickIfVisible(page, /connect/i);
    await clickIfVisible(page, /^sign$/i);
    await clickIfVisible(page, /sign the message/i);
    await clickIfVisible(page, /^confirm$/i);
    await clickIfVisible(page, /^submit$/i);
  }
}

async function runWithWalletPopupHandling<T>(context: BrowserContext, action: Promise<T>): Promise<T> {
  let settled = false;
  const wrapped = action.finally(() => {
    settled = true;
  });

  while (!settled) {
    await handleWalletPopups(context);
    await sleep(250);
  }

  return wrapped;
}

test.describe('agent trading signer profile', () => {
  test.skip(
    !process.env.PS_AGENT_SIGNER_E2E || !signerProfile || !signerExtensionPath,
    'Enable with PS_AGENT_SIGNER_E2E=1 plus PS_AGENT_SIGNER_PROFILE and PS_AGENT_SIGNER_EXTENSION_PATH.'
  );

  test('connects an injected signer and optionally submits a signed swap', async ({ baseURL }) => {
    await fs.mkdir(signerProfile, { recursive: true });
    await cleanProfileLocks(signerProfile);

    const context = await chromium.launchPersistentContext(signerProfile, {
      channel: signerBrowserChannel,
      headless: false,
      viewport: { width: 1440, height: 1000 },
      ignoreDefaultArgs,
      args: [
        '--disable-crashpad',
        `--disable-extensions-except=${signerExtensionPath}`,
        `--load-extension=${signerExtensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('dexSettings.disclaimerApprove', 'true');
      });
      await page.goto(`${baseURL}${ipfsBasePath}/#/swap`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.PolkaswapAgent), { timeout: 20_000 });
      await page.evaluate(async () => window.PolkaswapAgent.ready({ requireNode: true, timeoutMs: 20_000 }));

      const walletStatus = await runWithWalletPopupHandling(
        context,
        page.evaluate(
          async ({ source, address }) => window.PolkaswapAgent.connectWallet({ source, address: address || undefined }),
          { source: signerSource, address: signerAddress }
        )
      );

      expect(walletStatus.connected).toBe(true);
      expect(walletStatus.source).toBeTruthy();

      const readyStatus = await page.evaluate(async () =>
        window.PolkaswapAgent.ready({ requireWallet: true, timeoutMs: 10_000 })
      );
      expect(readyStatus.wallet.connected).toBe(true);

      const quote = await page.evaluate(
        async ({ assetInSymbol, assetOutSymbol, amount }) =>
          window.PolkaswapAgent.quoteSwap({
            assetIn: { symbol: assetInSymbol },
            assetOut: { symbol: assetOutSymbol },
            amount,
            quoteTimeoutMs: 20_000,
          }),
        { assetInSymbol, assetOutSymbol, amount: swapAmount }
      );
      expect(quote.amountOut).not.toBe('0');

      if (!shouldExecuteSwap) return;

      const execution = await runWithWalletPopupHandling(
        context,
        page.evaluate(
          async ({ assetIn, assetOut, amount }) =>
            window.PolkaswapAgent.executeSwap({
              assetIn: { address: assetIn.address },
              assetOut: { address: assetOut.address },
              amount,
              quoteTimeoutMs: 20_000,
            }),
          { assetIn: quote.assetIn, assetOut: quote.assetOut, amount: quote.amountIn }
        )
      );

      expect(execution.quote.amountOut).not.toBe('0');
    } finally {
      await context.close().catch(() => {});
    }
  });
});
