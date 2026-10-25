import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

import { createLocalSignerAccount, installLocalSignerProvider, LOCAL_SIGNER_SOURCE } from './support/local-signer';
import { ensureAppLoaded, filterKnownWalletConsoleNoise, ipfsBasePath, trackConsole } from './support/ipfs';

const signerSource = process.env.PS_AGENT_SIGNER_SOURCE || 'polkadot-js';
const signerAddress = process.env.PS_AGENT_SIGNER_ADDRESS || '';
const signerProfile = process.env.PS_AGENT_SIGNER_PROFILE || '';
const signerExtensionPath = process.env.PS_AGENT_SIGNER_EXTENSION_PATH || '';
const signerBrowserChannel = process.env.PS_AGENT_SIGNER_CHANNEL || 'chrome';
const shouldUseLocalKeySigner = process.env.PS_AGENT_SIGNER_USE_LOCAL_KEY === '1';
const localSignerMnemonicFile = process.env.PS_AGENT_SIGNER_MNEMONIC_FILE || '../sora-key.txt';
const localSignerExpectedAddress = process.env.PS_AGENT_SIGNER_EXPECTED_ADDRESS || '';
const localSignerMaxFee = process.env.PS_AGENT_SIGNER_MAX_FEE_XOR || '0.15';
const localSignerTransferRecipient = process.env.PS_AGENT_SIGNER_TRANSFER_RECIPIENT || '';
const liveTransferAmount = '0.000000000000000001';
const xorAssetAddress = '0x0200000000000000000000000000000000000000000000000000000000000000';
const shouldExecuteSwap = process.env.PS_AGENT_SIGNER_EXECUTE_SWAP === '1';
const assetInSymbol = process.env.PS_AGENT_SIGNER_ASSET_IN || 'XOR';
const assetOutSymbol = process.env.PS_AGENT_SIGNER_ASSET_OUT || 'VAL';
const swapAmount = process.env.PS_AGENT_SIGNER_AMOUNT || '100';
const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
const ignoreDefaultArgs = ['--disable-extensions', '--disable-component-extensions-with-background-pages'];
const liveTxTimeoutMs = Number(process.env.PS_AGENT_SIGNER_TX_TIMEOUT_MS ?? 240_000);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type AgentFeeEstimate = {
  amount?: string;
  source?: string;
};

type PreparedTransfer = {
  canExecute: boolean;
  warnings?: unknown[];
  fees?: AgentFeeEstimate[];
};

type WalletAssetSnapshot = {
  address: string;
  symbol: string;
  decimals: number;
  balance?: unknown;
};

type LiveTransferObservation = {
  id: string;
  txId?: string;
  status?: string;
  amount?: string;
  to?: string;
  blockId?: string;
  errorMessage?: unknown;
  active: boolean;
};

type LiveTransferDebugSnapshot = {
  url: string;
  sendActionText?: string;
  sendActionDisabled?: boolean;
  sendActionLoading?: boolean;
  walletLoading?: boolean;
  activeTransactions: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  walletRoute?: Record<string, unknown>;
};

function decimalToComparable(value: string): bigint {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > 18) {
    throw new Error(`Decimal value has more than 18 fractional digits: ${value}`);
  }

  return BigInt(`${whole}${fraction.padEnd(18, '0')}`);
}

function assertFeeWithinCap(fee: AgentFeeEstimate | undefined, feeCap: string): void {
  if (!fee?.amount || fee.source !== 'static') {
    throw new Error(`Transfer fee estimate is unavailable: ${JSON.stringify(fee)}`);
  }

  const amount = decimalToComparable(fee.amount);
  const cap = decimalToComparable(feeCap);

  if (amount === 0n) {
    throw new Error(`Transfer fee estimate is zero: ${JSON.stringify(fee)}`);
  }

  if (amount > cap) {
    throw new Error(`Transfer fee estimate ${fee.amount} XOR exceeds cap ${feeCap} XOR.`);
  }
}

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

async function waitForAgentReady(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.PolkaswapAgent), { timeout: 20_000 });
  await page.evaluate(async () => window.PolkaswapAgent.ready({ requireNode: true, timeoutMs: 60_000 }));
  await expect.poll(() => page.evaluate(() => window.PolkaswapAgent.status().agent.mode)).toBe(true);
}

async function connectLocalSignerWallet(page: Page, address: string): Promise<void> {
  const walletStatus = await page.evaluate(
    async ({ source, address }) => window.PolkaswapAgent.connectWallet({ source, address }),
    { source: LOCAL_SIGNER_SOURCE, address }
  );

  expect(walletStatus.connected).toBe(true);
  expect(walletStatus.address).toBe(address);

  const readyStatus = await page.evaluate(async () =>
    window.PolkaswapAgent.ready({ requireWallet: true, timeoutMs: 20_000 })
  );
  expect(readyStatus.wallet.connected).toBe(true);
}

async function waitForXorAccountAsset(page: Page): Promise<WalletAssetSnapshot> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60_000) {
    const asset = await page.evaluate((targetAssetAddress) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');
      const assets = (walletStore?.accountAssets ?? []) as WalletAssetSnapshot[];
      const asset = assets.find((item) => item.address === targetAssetAddress);

      if (!asset?.address) return null;

      return {
        address: asset.address,
        symbol: asset.symbol,
        decimals: asset.decimals,
        balance: asset.balance,
      };
    }, xorAssetAddress);

    if (asset) return asset;

    await sleep(1_000);
  }

  throw new Error(
    await page.evaluate((targetAssetAddress) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');
      const assets = (walletStore?.accountAssets ?? []) as Array<{ symbol?: string; address?: string }>;

      return `Timed out waiting for XOR account asset ${targetAssetAddress}. Loaded assets: ${JSON.stringify(
        assets.map((asset) => ({ symbol: asset.symbol, address: asset.address }))
      )}`;
    }, xorAssetAddress)
  );
}

async function openPrefilledWalletSend(page: Page, asset: WalletAssetSnapshot, address: string): Promise<void> {
  await page.evaluate(
    ({ address, amount, asset }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');

      walletStore?.setAllowFeePopup?.(false);
      walletStore?.setConfirmTxDialogDisabled?.(true);
      walletStore?.setSignTxDialogDisabled?.(true);
      walletStore?.navigate?.({
        name: 'WalletSend',
        params: {
          asset,
          address,
          amount,
        },
      });
    },
    { address, amount: liveTransferAmount, asset }
  );

  await expect(page.locator('.wallet-send')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Send' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '0.0' })).toHaveValue(liveTransferAmount);
}

async function submitPrefilledWalletSend(page: Page): Promise<void> {
  const actionButton = page.locator('.wallet-send').getByRole('button', { name: /^Send$/ }).last();
  await expect(actionButton).toBeEnabled({ timeout: 20_000 });
  await actionButton.scrollIntoViewIfNeeded();
  await actionButton.click({ force: true });

  if (!(await waitForWalletSendSubmitStart(page))) {
    const clicked = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll<HTMLElement>('.wallet-send-action')).find(
        (entry) => entry.textContent?.trim() === 'Send'
      );

      button?.click();

      return Boolean(button);
    });

    if (!clicked || !(await waitForWalletSendSubmitStart(page))) {
      throw new Error(`Wallet send action did not start: ${JSON.stringify(await readLiveTransferDebugSnapshot(page))}`);
    }
  }

  const feeWarningConfirm = page.getByRole('button', { name: 'Yes, I understand the risk' });
  if (await feeWarningConfirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await feeWarningConfirm.click();
  }

  const confirmButton = page.getByRole('button', { name: 'Confirm' }).last();
  if (await confirmButton.isVisible({ timeout: 20_000 }).catch(() => false)) {
    await expect(confirmButton).toBeEnabled({ timeout: 20_000 });
    await confirmButton.click();
    await expect(confirmButton).toBeHidden({ timeout: 20_000 });
  }
}

async function waitForWalletSendSubmitStart(page: Page): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5_000) {
    const snapshot = await readLiveTransferDebugSnapshot(page);

    if (
      snapshot.sendActionText !== 'Send' ||
      snapshot.sendActionDisabled ||
      snapshot.sendActionLoading ||
      snapshot.activeTransactions.length ||
      snapshot.history.length
    ) {
      return true;
    }

    await sleep(250);
  }

  return false;
}

async function readLiveTransferObservation(
  page: Page,
  address: string,
  submittedAfter: number
): Promise<LiveTransferObservation | null> {
  return await page.evaluate(
    ({ address, amount, submittedAfter }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');

      walletStore?.getHistory?.();

      const history = Object.values((walletStore?.history ?? {}) as Record<string, any>) as Array<Record<string, any>>;
      const matching = history
        .filter(
          (item) =>
            item.type === 'Transfer' &&
            item.to === address &&
            `${item.amount ?? ''}` === amount &&
            Number(item.startTime ?? 0) >= submittedAfter
        )
        .sort((a, b) => Number(b.startTime ?? 0) - Number(a.startTime ?? 0))[0];

      if (!matching?.id) return null;

      const activeTransactions = (walletStore?.activeTransactions ?? []) as Array<Record<string, any>>;

      return {
        id: `${matching.id}`,
        txId: matching.txId ? `${matching.txId}` : undefined,
        status: matching.status ? `${matching.status}` : undefined,
        amount: matching.amount ? `${matching.amount}` : undefined,
        to: matching.to ? `${matching.to}` : undefined,
        blockId: matching.blockId ? `${matching.blockId}` : undefined,
        errorMessage: matching.errorMessage,
        active: activeTransactions.some((item) => item.id === matching.id || item.txId === matching.txId),
      };
    },
    { address, amount: liveTransferAmount, submittedAfter }
  );
}

async function readLiveTransferDebugSnapshot(page: Page): Promise<LiveTransferDebugSnapshot> {
  return await page.evaluate(() => {
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    const walletStore = pinia?._s?.get('wallet');
    const notificationStore = pinia?._s?.get('notification');
    const actionButton = document.querySelector('.wallet-send-action') as HTMLButtonElement | null;
    const history = Object.values((walletStore?.history ?? {}) as Record<string, any>) as Array<Record<string, any>>;

    return {
      url: window.location.href,
      sendActionText: actionButton?.textContent?.trim(),
      sendActionDisabled: actionButton?.disabled,
      sendActionLoading: actionButton?.classList.contains('is-loading'),
      walletLoading: Boolean(walletStore?.loading),
      activeTransactions: ((walletStore?.activeTransactions ?? []) as Array<Record<string, unknown>>).slice(-5),
      history: history
        .sort((a, b) => Number(b.startTime ?? 0) - Number(a.startTime ?? 0))
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          txId: item.txId,
          type: item.type,
          status: item.status,
          amount: item.amount,
          to: item.to,
          errorMessage: item.errorMessage,
          startTime: item.startTime,
        })),
      notifications: Object.values((notificationStore?.notifications ?? {}) as Record<string, any>)
        .slice(-5)
        .map((item: any) => ({
          title: item.title,
          message: item.message,
          severity: item.severity,
        })),
      walletRoute: walletStore?.walletRoute,
    };
  });
}

async function waitForFinalizedLiveTransfer(
  page: Page,
  address: string,
  submittedAfter: number
): Promise<LiveTransferObservation> {
  const startedAt = Date.now();
  let lastObservation: LiveTransferObservation | null = null;

  while (Date.now() - startedAt < liveTxTimeoutMs) {
    lastObservation = await readLiveTransferObservation(page, address, submittedAfter);

    if (lastObservation?.status === 'error') {
      throw new Error(`Live transfer failed: ${JSON.stringify(lastObservation)}`);
    }

    if (lastObservation?.status === 'finalized' && (lastObservation.txId || lastObservation.id)) {
      return lastObservation;
    }

    await sleep(2_000);
  }

  const snapshot = await readLiveTransferDebugSnapshot(page);

  throw new Error(
    `Timed out waiting for finalized live transfer: ${JSON.stringify({ lastObservation, snapshot })}`
  );
}

async function waitForIndexerTransaction(page: Page, txId: string): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  let lastResult: unknown = null;

  while (Date.now() - startedAt < liveTxTimeoutMs) {
    lastResult = await page.evaluate(
      async (txId) => window.PolkaswapAgent.lookupTransaction({ txId, lookup: 'indexer' }).catch(() => null),
      txId
    );

    if (lastResult && typeof lastResult === 'object') {
      const record = lastResult as Record<string, unknown>;
      const recordId = `${record.id ?? ''}`;
      const recordTxId = `${record.txId ?? ''}`;

      if (recordId === txId || recordTxId === txId) return record;
    }

    await sleep(5_000);
  }

  throw new Error(`Timed out waiting for indexer confirmation of ${txId}: ${JSON.stringify(lastResult)}`);
}

async function waitForPreparedTransfer(page: Page, address: string, assetAddress: string): Promise<PreparedTransfer> {
  const startedAt = Date.now();
  let lastResult: unknown = null;

  while (Date.now() - startedAt < 90_000) {
    lastResult = await page.evaluate(
      async ({ address, amount, assetAddress }) =>
        window.PolkaswapAgent.prepareTransfer({
          asset: { address: assetAddress },
          to: address,
          amount,
        }).catch((error) => ({ error: error instanceof Error ? error.message : String(error) })),
      { address, amount: liveTransferAmount, assetAddress }
    );

    const prepared = lastResult as PreparedTransfer;
    const fee = prepared?.fees?.[0];

    if (fee?.source === 'static' && fee.amount && decimalToComparable(fee.amount) > 0n) {
      return prepared;
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for static transfer fee estimate: ${JSON.stringify(lastResult)}`);
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
      await page.goto(`${baseURL}${ipfsBasePath}/?polkaswap-agent=1#/swap`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean(window.PolkaswapAgent), { timeout: 20_000 });
      await page.evaluate(async () => window.PolkaswapAgent.ready({ requireNode: true, timeoutMs: 20_000 }));
      await expect.poll(() => page.evaluate(() => window.PolkaswapAgent.status().agent.mode)).toBe(true);

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

test.describe('agent trading local signer live transfer', () => {
  test.describe.configure({ timeout: liveTxTimeoutMs + 120_000 });

  test.skip(
    !process.env.PS_AGENT_SIGNER_E2E || !shouldUseLocalKeySigner,
    'Enable with PS_AGENT_SIGNER_E2E=1 and PS_AGENT_SIGNER_USE_LOCAL_KEY=1.'
  );

  test('submits a fee-capped minimum XOR transfer through the wallet send UI', async ({ page, baseURL }) => {
    test.setTimeout(liveTxTimeoutMs + 120_000);

    const account = await createLocalSignerAccount({
      mnemonicFile: localSignerMnemonicFile,
      expectedAddress: localSignerExpectedAddress || undefined,
    });
    const recipientAddress = localSignerTransferRecipient || account.address;
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.addInitScript(() => {
      localStorage.setItem('dexSettings.disclaimerApprove', 'true');
    });
    await installLocalSignerProvider(page, account);

    await page.goto(`${baseURL}${ipfsBasePath}/?polkaswap-agent=1#/swap`, { waitUntil: 'domcontentloaded' });
    await ensureAppLoaded(page);
    await waitForAgentReady(page);
    await connectLocalSignerWallet(page, account.address);
    const xorAsset = await waitForXorAccountAsset(page);

    const prepared = await waitForPreparedTransfer(page, recipientAddress, xorAsset.address);
    expect(prepared.canExecute, JSON.stringify(prepared.warnings)).toBe(true);
    assertFeeWithinCap(prepared.fees?.[0], localSignerMaxFee);

    await page.goto(`${baseURL}${ipfsBasePath}/#/wallet`, { waitUntil: 'domcontentloaded' });
    await ensureAppLoaded(page);

    await openPrefilledWalletSend(page, xorAsset, recipientAddress);

    const submittedAfter = Date.now();
    await submitPrefilledWalletSend(page);

    const finalized = await waitForFinalizedLiveTransfer(page, recipientAddress, submittedAfter);
    const txId = finalized.txId || finalized.id;
    const indexed = await waitForIndexerTransaction(page, txId);

    expect([indexed.id, indexed.txId]).toContain(txId);
    await expect(page.locator('.wallet-send-action')).toHaveCount(0);
    expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
    console.info(
      `[agent-signer-live] finalized transfer txId=${txId} to=${recipientAddress} amount=${liveTransferAmount}`
    );
  });
});
