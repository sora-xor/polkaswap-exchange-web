// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { JSDOM } from 'jsdom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
const playgroundHtmlPath = path.join(repoRoot, 'public/agent-playground.html');
const playgroundScriptPath = path.join(repoRoot, 'public/agent-playground.js');
const publicCataloguePath = path.join(repoRoot, 'public/.well-known/polkaswap-mcp-tools.json');

type AgentDouble = {
  assets: ReturnType<typeof vi.fn>;
  commonAssets: ReturnType<typeof vi.fn>;
  planSwap: ReturnType<typeof vi.fn>;
  prepareSwap: ReturnType<typeof vi.fn>;
  quoteSwap: ReturnType<typeof vi.fn>;
  ready: ReturnType<typeof vi.fn>;
  resolveAsset: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
};

type PlaygroundController = {
  getSnapshot(): PlaygroundSnapshot;
  plan(): Promise<PlaygroundResult>;
  prepare(): Promise<PlaygroundResult>;
  quote(): Promise<PlaygroundResult>;
  ready(): Promise<PlaygroundSnapshot>;
  setAutomaticPlanning(enabled: boolean): void;
};

type PlaygroundHistoryEntry = {
  durationMs?: number;
  kind?: string;
  source?: string;
  status?: string;
  toolName?: string;
};

type PlaygroundResult = {
  error?: { code?: string; message?: string };
  [key: string]: unknown;
};

type PlaygroundSnapshot = {
  history: PlaygroundHistoryEntry[];
  [key: string]: unknown;
};

const xor = {
  address: '0x0200000000000000000000000000000000000000000000000000000000000000',
  canonical: true,
  decimals: 18,
  name: 'SORA',
  symbol: 'XOR',
};

const pswap = {
  address: '0x0200040000000000000000000000000000000000000000000000000000000000',
  canonical: true,
  decimals: 18,
  name: 'Polkaswap',
  symbol: 'PSWAP',
};

/** Build a realistic quote payload for the static playground harness. */
function createQuote(amountOut = '2', amount = '1') {
  return {
    amountIn: amount,
    amountInMeta: { display: `${amount} XOR`, value: amount },
    amountOut,
    amountOutMeta: { display: `${amountOut} PSWAP`, value: amountOut },
    assetIn: xor,
    assetOut: pswap,
    dexId: 0,
    liquiditySources: ['XYKPool'],
    minAmountOut: '1.9',
    minAmountOutMeta: { display: '1.9 PSWAP', value: '1.9' },
    priceImpact: '-0.40',
    quoteDigest: `quote-${amountOut}`,
    request: { amount, dexId: 'best', side: 'input', slippageTolerance: '0.5' },
    route: [xor.address, pswap.address],
  };
}

/** Make a wallet-independent plan whose expiry can be exercised with fake time. */
function createPlan(amount = '1') {
  return {
    mode: 'unsigned',
    canExecute: false,
    requiresWallet: false,
    quote: createQuote('2', amount),
    preview: {
      operation: 'Swap',
      sdkCall: 'api.swap.execute',
      stateChanging: true,
      args: { amountIn: amount, amountOut: '2' },
      summary: 'Unsigned SDK call plan',
    },
    fees: [{ amount: '0', asset: xor, source: 'unavailable' }],
    warnings: [{ code: 'FEE_UNAVAILABLE', severity: 'critical', message: 'Network fee unavailable.' }],
    network: { genesisHash: '0xabcdef1234567890', runtimeSpecVersion: 42, blockNumber: 123 },
    plannedAt: Date.now(),
    expiresAt: Date.now() + 300000,
  };
}

/** Create an isolated DOM whose iframe exposes only the supplied local API double. */
async function createHarness(overrides: Partial<AgentDouble> = {}, automatic = false) {
  const dom = new JSDOM(playgroundHtml, {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'https://polkaswap.example/agent-playground.html',
  });
  const { window } = dom;
  const frame = window.document.getElementById('app-frame') as HTMLIFrameElement;
  const catalogue = JSON.parse(publicCatalogue) as Array<Record<string, unknown>>;
  const quote = createQuote();
  const agent: AgentDouble = {
    assets: vi.fn().mockResolvedValue([xor, pswap]),
    commonAssets: vi.fn().mockResolvedValue([xor, pswap]),
    planSwap: vi.fn(async ({ amount }: { amount: string }) => createPlan(amount)),
    prepareSwap: vi.fn().mockResolvedValue({
      canExecute: true,
      envelope: {
        callDigest: 'call-digest',
        expiresAt: 1_893_456_000_000,
        expiresAtBlock: 456,
        intentId: 'polkaswap:swap:prepared-intent',
        network: { genesisHash: '0xabcdef1234567890', runtimeSpecVersion: 42 },
        preparedAtBlock: 444,
        signer: { address: 'cnACCOUNT_SHOULD_NEVER_APPEAR', source: 'polkadot-js' },
      },
      fees: [{ amount: '0.1', asset: xor }],
      intentId: 'polkaswap:swap:prepared-intent',
      privateKey: 'private-value-must-never-appear',
      preview: {
        args: { amountIn: '1', amountOut: '2' },
        sdkCall: 'api.swap.execute',
        signer: { address: 'cnACCOUNT_SHOULD_NEVER_APPEAR', connected: true, source: 'polkadot-js' },
        summary: 'Unsigned preview',
      },
      quote,
      requiredBalances: [
        {
          asset: { ...xor },
          available: '12345.678',
          availableCodec: '12345678000000000000000',
          reason: 'swap-input',
          required: '1',
          requiredCodec: '1000000000000000000',
          sufficient: true,
        },
      ],
      warnings: [],
    }),
    quoteSwap: vi.fn().mockResolvedValue(quote),
    ready: vi.fn().mockResolvedValue({
      node: { blockNumber: 123, connected: true, endpoint: 'wss://private-node.example' },
      version: 'v1',
      wallet: { address: 'cnACCOUNT_SHOULD_NEVER_APPEAR', connected: true, source: 'polkadot-js' },
    }),
    resolveAsset: vi.fn(async ({ asset }: { asset: { symbol?: string } }) => (asset.symbol === 'PSWAP' ? pswap : xor)),
    status: vi.fn().mockResolvedValue({
      network: { genesisHash: '0xabcdef1234567890' },
      node: {
        blockNumber: 123,
        connected: true,
        endpoint: 'wss://private-node.example',
        genesisHash: '0xabcdef1234567890',
        runtimeSpecVersion: 42,
      },
      version: 'v1',
      wallet: { address: 'cnACCOUNT_SHOULD_NEVER_APPEAR', connected: true, source: 'polkadot-js' },
    }),
    ...overrides,
  };
  const appWindow = new window.EventTarget() as EventTarget & {
    PolkaswapAgent: AgentDouble;
    __PS_BUILD_VARIANT__: string;
  };
  appWindow.PolkaswapAgent = agent;
  appWindow.__PS_BUILD_VARIANT__ = 'production';
  let frameSrc = '';
  Object.defineProperty(frame, 'contentWindow', { configurable: true, value: appWindow });
  Object.defineProperty(frame, 'src', {
    configurable: true,
    get: () => frameSrc,
    set: (value) => {
      frameSrc = String(value);
    },
  });

  Object.defineProperty(window, 'TextEncoder', { configurable: true, value: TextEncoder });
  Object.defineProperty(window, 'Date', { configurable: true, value: Date });
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    value: vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('polkaswap-mcp-tools.json')) {
        return { json: async () => catalogue, ok: true, status: 200 };
      }
      if (url.includes('polkaswap-agent.schema.json')) {
        return { ok: true, status: 200, text: async () => '{"type":"object"}' };
      }
      if (url.includes('polkaswap-agent.json')) {
        return { json: async () => ({ version: 'v1' }), ok: true, status: 200 };
      }
      expect(init?.method).toBe('HEAD');
      return { headers: { get: () => '/ipfs/bafytestplaygroundcid' }, ok: true, status: 200 };
    }),
  });

  (window.document.getElementById('auto-plan') as HTMLInputElement).checked = automatic;
  window.eval(playgroundScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  const controller = (window as unknown as { PolkaswapAgentPlayground: PlaygroundController }).PolkaswapAgentPlayground;
  await controller.ready();

  return { agent, controller, dom, window };
}

let playgroundHtml = '';
let playgroundScript = '';
let publicCatalogue = '';
const openDoms: JSDOM[] = [];

beforeAll(async () => {
  [playgroundHtml, playgroundScript, publicCatalogue] = await Promise.all([
    readFile(playgroundHtmlPath, 'utf8'),
    readFile(playgroundScriptPath, 'utf8'),
    readFile(publicCataloguePath, 'utf8'),
  ]);
});

afterEach(() => {
  openDoms.splice(0).forEach((dom) => dom.window.close());
  vi.useRealTimers();
});

describe('static agent playground', () => {
  it('plans without a reviewed quote, wallet consent, signing, or manual asset discovery', async () => {
    const harness = await createHarness();
    openDoms.push(harness.dom);
    await harness.controller.plan();
    expect(harness.agent.planSwap).toHaveBeenCalledWith(
      expect.objectContaining({
        assetIn: { address: xor.address },
        assetOut: { address: pswap.address },
        amount: '1',
        side: 'input',
      })
    );
    expect(harness.agent.quoteSwap).not.toHaveBeenCalled();
    expect(harness.agent.prepareSwap).not.toHaveBeenCalled();
    expect(harness.agent.ready).not.toHaveBeenCalled();
    expect(harness.window.document.getElementById('summary-output')?.textContent).toContain('Agent swap plan');
    expect(harness.window.document.getElementById('summary-output')?.textContent).toContain('XOR fee unavailable');
    expect(harness.window.document.getElementById('call-output')?.textContent).toContain('PolkaswapAgent.planSwap');
    expect(harness.window.document.getElementById('raw-output')?.textContent).not.toContain('ACCOUNT_SHOULD');
    expect(harness.controller.getSnapshot().history[0].kind).toBe('plan');
    expect(harness.window.document.getElementById('review-title')?.textContent).toBe('Agent results');
    expect(harness.window.document.getElementById('status-node')?.textContent).toContain('Connected');
  });

  it('automatically plans once at startup, coalesces input edits, and refreshes on expiry', async () => {
    vi.useFakeTimers();
    const harness = await createHarness({}, true);
    openDoms.push(harness.dom);
    expect(playgroundHtml).toContain('id="auto-plan" type="checkbox" checked');
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(1);
    const amount = harness.window.document.getElementById('amount') as HTMLInputElement;
    for (const value of ['2', '3', '4']) {
      amount.value = value;
      amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(2);
    expect(harness.agent.planSwap).toHaveBeenLastCalledWith(expect.objectContaining({ amount: '4' }));
    await vi.advanceTimersByTimeAsync(299000);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(3);
    expect(harness.agent.prepareSwap).not.toHaveBeenCalled();
  });

  it('pauses automatic planning in hidden pages and ignores incomplete inputs', async () => {
    vi.useFakeTimers();
    const harness = await createHarness({}, true);
    openDoms.push(harness.dom);
    Object.defineProperty(harness.window.document, 'hidden', { configurable: true, value: true });
    harness.window.document.dispatchEvent(new harness.window.Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(harness.agent.planSwap).not.toHaveBeenCalled();
    const amount = harness.window.document.getElementById('amount') as HTMLInputElement;
    amount.value = '';
    amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    Object.defineProperty(harness.window.document, 'hidden', { configurable: true, value: false });
    harness.window.document.dispatchEvent(new harness.window.Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.agent.planSwap).not.toHaveBeenCalled();
    expect(harness.window.document.getElementById('autonomy-status')?.textContent).toContain('valid pair');
    amount.value = '2';
    amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(1);
  });

  it('expires paused results in the DOM and machine snapshot without making another call', async () => {
    vi.useFakeTimers();
    const harness = await createHarness({}, true);
    openDoms.push(harness.dom);
    await vi.advanceTimersByTimeAsync(500);
    harness.controller.setAutomaticPlanning(false);
    expect(harness.controller.getSnapshot().quoteFresh).toBe(true);
    await vi.advanceTimersByTimeAsync(300000);
    expect(harness.controller.getSnapshot().quoteFresh).toBe(false);
    expect(harness.window.document.getElementById('review-freshness')?.textContent).toContain('expired');
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(1);
  });

  it('resumes enabled automatic planning after a manual quote and waits for superseded manual calls', async () => {
    vi.useFakeTimers();
    let release!: (value: ReturnType<typeof createQuote>) => void;
    const quoteSwap = vi.fn(
      () =>
        new Promise<ReturnType<typeof createQuote>>((resolve) => {
          release = resolve;
        })
    );
    const harness = await createHarness({ quoteSwap }, true);
    openDoms.push(harness.dom);
    await vi.advanceTimersByTimeAsync(500);
    const manual = harness.controller.quote();
    await vi.advanceTimersByTimeAsync(0);
    const amount = harness.window.document.getElementById('amount') as HTMLInputElement;
    amount.value = '2';
    amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(1);
    release(createQuote());
    await manual;
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(2);
    quoteSwap.mockResolvedValue(createQuote('2', '2'));
    await harness.controller.quote();
    await vi.advanceTimersByTimeAsync(300000);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(3);
    quoteSwap.mockRejectedValue(Object.assign(new Error('Offline'), { code: 'NODE_NOT_READY' }));
    await harness.controller.quote();
    expect(harness.controller.getSnapshot().quoteFresh).toBe(false);
    expect(harness.window.document.getElementById('review-freshness')?.textContent).toContain('failed');
    await vi.advanceTimersByTimeAsync(300000);
    expect(harness.agent.planSwap).toHaveBeenCalledTimes(4);
  });

  it('serializes automatic plans and never renders a superseded plan', async () => {
    vi.useFakeTimers();
    let releaseFirst!: (value: ReturnType<typeof createPlan>) => void;
    const planSwap = vi.fn(({ amount }: { amount: string }) =>
      amount === '1'
        ? new Promise<ReturnType<typeof createPlan>>((resolve) => {
            releaseFirst = resolve;
          })
        : Promise.resolve(createPlan(amount))
    );
    const harness = await createHarness({ planSwap }, true);
    openDoms.push(harness.dom);
    await vi.advanceTimersByTimeAsync(500);
    const amount = harness.window.document.getElementById('amount') as HTMLInputElement;
    amount.value = '2';
    amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(planSwap).toHaveBeenCalledTimes(1);
    releaseFirst(createPlan('1'));
    await vi.advanceTimersByTimeAsync(500);
    expect(planSwap).toHaveBeenCalledTimes(2);
    expect(harness.controller.getSnapshot().history.map((entry) => entry.status)).toEqual(['complete', 'superseded']);
    expect(harness.window.document.getElementById('raw-output')?.textContent).toContain('"amountIn": "2"');
  });

  it('reconnects after an engine reload even when the old frame call never settles', async () => {
    vi.useFakeTimers();
    const planSwap = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockImplementation(async () => createPlan());
    const harness = await createHarness({ planSwap }, true);
    openDoms.push(harness.dom);
    await vi.advanceTimersByTimeAsync(500);
    expect(planSwap).toHaveBeenCalledTimes(1);
    harness.window.document.getElementById('app-frame')?.dispatchEvent(new harness.window.Event('load'));
    await vi.advanceTimersByTimeAsync(500);
    expect(planSwap).toHaveBeenCalledTimes(2);
    expect(harness.controller.getSnapshot().history.map((entry) => entry.status)).toEqual(['complete', 'superseded']);
    expect(harness.window.document.getElementById('autonomy-status')?.textContent).toContain('Plan complete');
  });

  it.each(['NODE_NOT_READY', 'QUOTE_TIMEOUT', 'NETWORK_CONTEXT_UNAVAILABLE'])(
    'bounds %s retries, then stops until a new request and supports session pause',
    async (code) => {
      vi.useFakeTimers();
      const planSwap = vi.fn().mockRejectedValue(Object.assign(new Error('private message'), { code }));
      const harness = await createHarness({ planSwap }, true);
      openDoms.push(harness.dom);
      await vi.advanceTimersByTimeAsync(500);
      expect(harness.window.document.getElementById('autonomy-status')?.textContent).toContain('retry automatically');
      await vi.advanceTimersByTimeAsync(600000);
      expect(planSwap).toHaveBeenCalledTimes(4);
      expect(harness.window.document.getElementById('autonomy-status')?.textContent).toContain(
        'stopped after an error'
      );
      expect(harness.window.document.getElementById('raw-output')?.textContent).not.toContain('private message');
      expect(() => harness.controller.setAutomaticPlanning('yes' as unknown as boolean)).toThrow('boolean');
      harness.controller.setAutomaticPlanning(false);
      expect(harness.controller.getSnapshot().automation).toEqual({ enabled: false, planning: false });
      const amount = harness.window.document.getElementById('amount') as HTMLInputElement;
      amount.value = '2';
      amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(1000);
      expect(planSwap).toHaveBeenCalledTimes(4);
      planSwap.mockResolvedValue(createPlan('2'));
      harness.controller.setAutomaticPlanning(true);
      await vi.advanceTimersByTimeAsync(500);
      expect(planSwap).toHaveBeenCalledTimes(5);
    }
  );

  it('drops an in-flight automatic result when paused and never automatically retries invalid input', async () => {
    vi.useFakeTimers();
    let release!: (value: ReturnType<typeof createPlan>) => void;
    const planSwap = vi.fn(
      () =>
        new Promise<ReturnType<typeof createPlan>>((resolve) => {
          release = resolve;
        })
    );
    const harness = await createHarness({ planSwap }, true);
    openDoms.push(harness.dom);
    await vi.advanceTimersByTimeAsync(500);
    harness.controller.setAutomaticPlanning(false);
    release(createPlan());
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.controller.getSnapshot().history[0].status).toBe('superseded');
    expect(harness.window.document.getElementById('raw-output')?.textContent).toBe('No response yet.');
    planSwap.mockRejectedValue(Object.assign(new Error('Invalid amount'), { code: 'INVALID_AMOUNT' }));
    harness.controller.setAutomaticPlanning(true);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(600000);
    expect(planSwap).toHaveBeenCalledTimes(2);
  });

  it('allows wallet-bound preparation after session consent without a separate quote click', async () => {
    const harness = await createHarness();
    openDoms.push(harness.dom);
    const optIn = harness.window.document.getElementById('wallet-data-opt-in') as HTMLInputElement;
    optIn.checked = true;
    optIn.dispatchEvent(new harness.window.Event('change', { bubbles: true }));
    expect((harness.window.document.getElementById('prepare') as HTMLButtonElement).disabled).toBe(false);
    await harness.controller.prepare();
    expect(harness.agent.prepareSwap).toHaveBeenCalledTimes(1);
    expect(harness.agent.quoteSwap).not.toHaveBeenCalled();
  });
  it('uses canonical address selectors and precise exact-input/output language', async () => {
    const harness = await createHarness();
    openDoms.push(harness.dom);

    expect(harness.agent.commonAssets).toHaveBeenCalledWith({ includeBalances: false });
    expect(harness.window.document.getElementById('asset-in-search')?.getAttribute('role')).toBe('combobox');
    expect((harness.window.document.getElementById('asset-in-search') as HTMLInputElement).value).toBe('XOR');
    expect((harness.window.document.getElementById('asset-out-search') as HTMLInputElement).value).toBe('PSWAP');
    expect(harness.window.document.getElementById('amount-label')?.textContent).toBe('Amount to spend exactly');

    await harness.controller.quote();
    expect(harness.agent.quoteSwap).toHaveBeenCalledWith(
      expect.objectContaining({
        assetIn: { address: xor.address },
        assetOut: { address: pswap.address },
        side: 'input',
      })
    );

    const outputMode = harness.window.document.querySelector(
      'input[name="swap-mode"][value="output"]'
    ) as HTMLInputElement;
    outputMode.checked = true;
    outputMode.dispatchEvent(new harness.window.Event('change', { bubbles: true }));
    expect(harness.window.document.getElementById('amount-label')?.textContent).toBe('Amount to receive exactly');
    expect(harness.window.document.getElementById('amount-symbol')?.textContent).toBe('PSWAP');
    expect(harness.window.document.getElementById('review-freshness')?.textContent).toContain('stale');

    await vi.waitFor(() => {
      expect(harness.window.document.querySelectorAll('#contract-output .tool-entry')).toHaveLength(
        (JSON.parse(publicCatalogue) as unknown[]).length
      );
    });
    const contractTab = harness.window.document.getElementById('tab-contract') as HTMLButtonElement;
    contractTab.click();
    expect(contractTab.getAttribute('aria-selected')).toBe('true');
    expect((harness.window.document.getElementById('panel-contract') as HTMLElement).hidden).toBe(false);
    expect(harness.window.document.getElementById('provenance-api')?.textContent).toBe('v1');
  });

  it('redacts wallet fields by default and reveals balances only after explicit opt-in', async () => {
    const harness = await createHarness();
    openDoms.push(harness.dom);

    await harness.controller.quote();
    const blocked = await harness.controller.prepare();
    expect(blocked.error?.code).toBe('UNEXPECTED_ERROR');
    expect(harness.window.document.getElementById('form-error')?.textContent).toContain('Enable connected wallet data');

    const raw = harness.window.document.getElementById('raw-output')?.textContent || '';
    expect(raw).not.toContain('cnACCOUNT_SHOULD_NEVER_APPEAR');
    expect(raw).not.toContain('private-value-must-never-appear');
    expect(raw).not.toContain('privateKey');
    expect(raw).not.toContain('12345.678');
    expect(harness.agent.prepareSwap).not.toHaveBeenCalled();
    expect(harness.window.document.getElementById('history-count')?.textContent).toBe('1');

    const optIn = harness.window.document.getElementById('wallet-data-opt-in') as HTMLInputElement;
    optIn.checked = true;
    optIn.dispatchEvent(new harness.window.Event('change', { bubbles: true }));
    await harness.controller.prepare();

    const optedInRaw = harness.window.document.getElementById('raw-output')?.textContent || '';
    const summary = harness.window.document.getElementById('summary-output')?.textContent || '';
    expect(optedInRaw).toContain('12345.678');
    expect(optedInRaw).not.toContain('cnACCOUNT_SHOULD_NEVER_APPEAR');
    expect(optedInRaw).not.toContain('private-value-must-never-appear');
    expect(summary).toContain('Unsigned only');
    expect(summary).toContain('Expires after block');
    expect(summary).toContain('456');
  });

  it('prevents a slower stale quote from overwriting a newer review', async () => {
    let releaseFirst!: (value: ReturnType<typeof createQuote>) => void;
    const quoteSwap = vi.fn(({ amount }: { amount: string }) => {
      if (amount === '1') {
        return new Promise<ReturnType<typeof createQuote>>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve(createQuote('4', amount));
    });
    const harness = await createHarness({ quoteSwap });
    openDoms.push(harness.dom);

    const first = harness.controller.quote();
    await vi.waitFor(() => expect(quoteSwap).toHaveBeenCalledTimes(1));
    const amount = harness.window.document.getElementById('amount') as HTMLInputElement;
    amount.value = '2';
    amount.dispatchEvent(new harness.window.Event('input', { bubbles: true }));
    const second = harness.controller.quote();
    await second;
    releaseFirst(createQuote('2', '1'));
    await first;

    const raw = harness.window.document.getElementById('raw-output')?.textContent || '';
    const snapshot = harness.controller.getSnapshot();
    expect(raw).toContain('"amountOut": "4"');
    expect(snapshot.history.map((entry) => entry.status)).toEqual(['superseded', 'complete']);
  });

  it('bounds sanitized history to the newest forty calls', async () => {
    const harness = await createHarness();
    openDoms.push(harness.dom);

    for (let index = 0; index < 43; index += 1) {
      await harness.controller.quote();
    }

    expect(harness.controller.getSnapshot().history).toHaveLength(40);
    expect(harness.window.document.getElementById('history-count')?.textContent).toBe('40');
  });

  it('uses fixed provider errors and records WebMCP invocation metadata without payloads', async () => {
    const quoteSwap = vi.fn().mockRejectedValue(
      Object.assign(new Error('wss://secret-rpc.example cnPRIVATE_ACCOUNT'), {
        code: 'NODE_NOT_READY',
        details: { authorization: 'Bearer secret' },
      })
    );
    const harness = await createHarness({ quoteSwap });
    openDoms.push(harness.dom);

    await harness.controller.quote();
    const raw = harness.window.document.getElementById('raw-output')?.textContent || '';
    expect(raw).toContain('The SORA node is not ready.');
    expect(raw).not.toContain('secret-rpc');
    expect(raw).not.toContain('PRIVATE_ACCOUNT');
    expect(raw).not.toContain('Bearer');

    harness.window.dispatchEvent(
      new harness.window.CustomEvent('polkaswap-webmcp-status', {
        detail: { state: 'ready', toolCount: 8 },
      })
    );
    harness.window.dispatchEvent(
      new harness.window.CustomEvent('polkaswap-webmcp-invocation', {
        detail: {
          durationMs: 17,
          privateArgs: { amount: 'do-not-record' },
          source: 'webmcp',
          status: 'complete',
          toolName: 'polkaswap_quote_swap',
        },
      })
    );

    const snapshot = harness.controller.getSnapshot();
    expect(harness.window.document.getElementById('status-webmcp')?.textContent).toBe('8 tools ready');
    expect(snapshot.history[0]).toMatchObject({
      durationMs: 17,
      kind: 'webmcp',
      source: 'webmcp',
      toolName: 'polkaswap_quote_swap',
    });
    expect(JSON.stringify(snapshot.history[0])).not.toContain('do-not-record');
  });
});
