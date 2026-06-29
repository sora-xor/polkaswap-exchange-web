import { expect, test, type Page } from '@playwright/test';

import { createLocalSignerAccount, installLocalSignerProvider, LOCAL_SIGNER_SOURCE } from './support/local-signer';
import { ensureAppLoaded, filterKnownWalletConsoleNoise, ipfsBasePath, trackConsole } from './support/ipfs';

const livePolkamarktEnabled = process.env.PS_POLKAMARKT_LIVE === '1';
const liveTxTimeoutMs = Number(process.env.PS_POLKAMARKT_TX_TIMEOUT_MS ?? 240_000);
const requiredPolkamarktEnv = [
  'PS_POLKAMARKT_MARKET_ID',
  'PS_POLKAMARKT_OUTCOME',
  'PS_POLKAMARKT_AMOUNT',
  'PS_POLKAMARKT_MAX_FEE_XOR',
  'PS_POLKAMARKT_MAX_COLLATERAL_XOR',
] as const;

type RequiredPolkamarktEnv = (typeof requiredPolkamarktEnv)[number];

type PolkamarktBuyHistory = {
  id: string;
  txId?: string;
  status?: string;
  type?: string;
  payload?: {
    marketId?: number;
    outcome?: string;
  };
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function readRequiredPolkamarktEnv(): Record<RequiredPolkamarktEnv, string> {
  return requiredPolkamarktEnv.reduce(
    (acc, key) => {
      const value = process.env[key]?.trim();

      if (!value) {
        throw new Error(`${key} is required when PS_POLKAMARKT_LIVE=1.`);
      }

      acc[key] = value;
      return acc;
    },
    {} as Record<RequiredPolkamarktEnv, string>
  );
}

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

function assertAmountWithinCap(amount: string, cap: string, label: string): void {
  if (decimalToComparable(amount) > decimalToComparable(cap)) {
    throw new Error(`${label} ${amount} exceeds cap ${cap}.`);
  }
}

function normalizeOutcome(value: string): 'YES' | 'NO' {
  const normalized = value.trim().toUpperCase();

  if (normalized === 'YES' || normalized === 'NO') return normalized;

  throw new Error('PS_POLKAMARKT_OUTCOME must be YES or NO.');
}

function parseFeeAmount(text: string): string {
  const match = text.replaceAll(',', '').match(/([0-9]+(?:\.[0-9]+)?)/);

  if (!match?.[1]) {
    throw new Error(`Unable to parse Polkamarkt network fee from: ${text}`);
  }

  return match[1];
}

async function waitForAgentAndConnect(page: Page, address: string): Promise<void> {
  await page.waitForFunction(() => Boolean(window.PolkaswapAgent), { timeout: 20_000 });
  await page.evaluate(async () => window.PolkaswapAgent.ready({ requireNode: true, timeoutMs: 60_000 }));

  const walletStatus = await page.evaluate(
    async ({ source, address }) => window.PolkaswapAgent.connectWallet({ source, address }),
    { source: LOCAL_SIGNER_SOURCE, address }
  );

  expect(walletStatus.connected).toBe(true);
  expect(walletStatus.address).toBe(address);
}

async function readTicketNetworkFee(page: Page): Promise<string> {
  const rowText = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.trade-ticket__quote > div'));
    const row = rows.find((element) => /network fee/i.test(element.textContent ?? ''));

    return row?.textContent ?? '';
  });

  return parseFeeAmount(rowText);
}

async function readPolkamarktBuyHistory(
  page: Page,
  marketId: number,
  outcome: 'YES' | 'NO'
): Promise<PolkamarktBuyHistory | null> {
  return page.evaluate(
    ({ marketId, outcome }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');

      walletStore?.getHistory?.();

      const history = Object.values((walletStore?.history ?? {}) as Record<string, any>) as PolkamarktBuyHistory[];
      const matching = history
        .filter((item) => {
          const payload = item.payload ?? {};
          return (
            item.type === 'PolkamarktBuy' &&
            Number(payload.marketId) === marketId &&
            String(payload.outcome ?? '').toUpperCase() === (outcome === 'YES' ? 'YES' : 'NO')
          );
        })
        .sort(
          (a, b) =>
            Number((b as Record<string, unknown>).startTime ?? 0) -
            Number((a as Record<string, unknown>).startTime ?? 0)
        )[0];

      return matching ?? null;
    },
    { marketId, outcome }
  );
}

async function waitForPolkamarktBuyHistory(
  page: Page,
  marketId: number,
  outcome: 'YES' | 'NO'
): Promise<PolkamarktBuyHistory> {
  const startedAt = Date.now();
  let lastHistory: PolkamarktBuyHistory | null = null;

  while (Date.now() - startedAt < liveTxTimeoutMs) {
    lastHistory = await readPolkamarktBuyHistory(page, marketId, outcome);

    if (lastHistory?.status === 'error') {
      throw new Error(`Polkamarkt buy failed: ${JSON.stringify(lastHistory)}`);
    }

    if (lastHistory?.status === 'finalized' && (lastHistory.txId || lastHistory.id)) {
      return lastHistory;
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for Polkamarkt buy history: ${JSON.stringify(lastHistory)}`);
}

test.describe('Polkamarkt live guarded buy', () => {
  test.describe.configure({ timeout: liveTxTimeoutMs + 120_000 });

  test.skip(!livePolkamarktEnabled, 'Enable with PS_POLKAMARKT_LIVE=1 and all PS_POLKAMARKT_* caps.');

  test('submits an explicitly capped buy through the Polkamarkt ticket', async ({ page, baseURL }) => {
    const env = readRequiredPolkamarktEnv();
    const marketId = Number(env.PS_POLKAMARKT_MARKET_ID);
    const outcome = normalizeOutcome(env.PS_POLKAMARKT_OUTCOME);
    const amount = env.PS_POLKAMARKT_AMOUNT;
    const maxFee = env.PS_POLKAMARKT_MAX_FEE_XOR;
    const maxCollateral = env.PS_POLKAMARKT_MAX_COLLATERAL_XOR;

    if (!Number.isSafeInteger(marketId) || marketId < 0) {
      throw new Error('PS_POLKAMARKT_MARKET_ID must be a non-negative integer.');
    }

    assertAmountWithinCap(amount, maxCollateral, 'Polkamarkt amount');

    const account = await createLocalSignerAccount({
      mnemonicFile: process.env.PS_AGENT_SIGNER_MNEMONIC_FILE || '../sora-key.txt',
      expectedAddress: process.env.PS_AGENT_SIGNER_EXPECTED_ADDRESS || undefined,
    });
    const consoleErrors = trackConsole(page, { mode: 'live' });

    await page.addInitScript(() => {
      localStorage.setItem('dexSettings.disclaimerApprove', 'true');
    });
    await installLocalSignerProvider(page, account);

    await page.goto(`${baseURL}${ipfsBasePath}/?polkaswap-agent=1#/polkamarkt/${marketId}`, {
      waitUntil: 'domcontentloaded',
    });
    await ensureAppLoaded(page);
    await waitForAgentAndConnect(page, account.address);
    await expect(page.locator('.trade-ticket')).toBeVisible({ timeout: 60_000 });

    await page.getByTestId(`trade-ticket-outcome-${outcome.toLowerCase()}`).click();
    await page.locator('.trade-ticket .trade-field input').first().fill(amount);

    const submitButton = page.locator('.trade-ticket__submit').first();
    await expect(submitButton).toBeEnabled({ timeout: 60_000 });

    const feeAmount = await readTicketNetworkFee(page);
    assertAmountWithinCap(feeAmount, maxFee, 'Polkamarkt network fee');

    await submitButton.click();
    await expect(page.getByTestId('polkamarkt-ticket-receipt')).toBeVisible({ timeout: 20_000 });

    const history = await waitForPolkamarktBuyHistory(page, marketId, outcome);

    expect(history.type).toBe('PolkamarktBuy');
    expect(history.payload).toMatchObject({ marketId, outcome: outcome === 'YES' ? 'Yes' : 'No' });
    expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
  });
});
