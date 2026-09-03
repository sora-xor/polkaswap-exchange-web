// @vitest-environment node
import { readFile } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

const runnerPath = new URL('../../../../examples/agent-runner/agent-runner.mjs', import.meta.url);
// Resolve the native VM explicitly because the app's Vite aliases map vm to its browser shim.
const vm = process.getBuiltinModule('vm');

/** Runs the CLI source with a fake browser, API, environment, and fetch; nothing reaches a network or signer. */
async function runMockedRunner({ execute = false, side = 'input', canExecute = true, criticalWarning = false } = {}) {
  const source = (await readFile(runnerPath, 'utf8'))
    .replace(/^#![^\n]*\n/u, '')
    .replace(/^import \{ chromium \} from 'playwright';\n/mu, '');
  const quote = {
    amountIn: '1.5',
    amountOut: '2',
    minAmountOut: '1.99',
    priceImpact: '0.1',
    dexId: 0,
    request: { amount: '2', slippageTolerance: '0.5' },
  };
  const prepared = {
    intentId: `polkaswap:swap:sha256:${'a'.repeat(64)}`,
    canExecute,
    quote,
    warnings: criticalWarning ? [{ code: 'FEE_UNAVAILABLE', severity: 'critical' }] : [],
    requiredBalances: [],
    fees: [],
    preview: {},
  };
  const agent = {
    ready: vi.fn().mockResolvedValue({ node: { connected: true }, wallet: { connected: false }, settings: {} }),
    capabilities: vi.fn().mockReturnValue({ version: 'v1', methods: [] }),
    resolveAsset: vi.fn(async ({ asset }) => ({ address: `asset-${asset.symbol}`, symbol: asset.symbol })),
    quoteSwap: vi.fn().mockResolvedValue(quote),
    prepareSwap: vi.fn().mockResolvedValue(prepared),
    executeSwap: vi.fn().mockResolvedValue({ transaction: { txId: 'mock-transaction' } }),
  };
  const page = {
    goto: vi.fn(),
    waitForFunction: vi.fn(),
    evaluate: vi.fn(async (callback, input) => callback(input)),
  };
  const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn() };
  const chromium = { launch: vi.fn().mockResolvedValue(browser) };
  const runtime = {
    env: {
      POLKASWAP_AGENT_EXECUTE_SWAP: execute ? '1' : '0',
      POLKASWAP_AGENT_SIDE: side,
    },
    exitCode: undefined as number | undefined,
  };
  const output = { log: vi.fn(), error: vi.fn() };
  const fetch = vi.fn().mockResolvedValue({
    json: async () => ({
      version: 'v1',
      docs: './reference.md',
      schema: './schema.json',
      examples: './examples.json',
    }),
  });

  await vm.runInNewContext(`(async () => { ${source}\n })()`, {
    chromium,
    process: runtime,
    console: output,
    URL,
    Date,
    window: { PolkaswapAgent: agent },
    location: new URL('https://polkaswap.example/'),
    fetch,
  });
  return { agent, browser, chromium, prepared, runtime, output };
}

describe('legacy agent runner prepared-execution contract', () => {
  it.each(['input', 'output'])('passes only prepared identifiers for exact-%s swaps', async (side) => {
    const { agent, prepared, browser, runtime } = await runMockedRunner({ execute: true, side });

    expect(agent.executeSwap).toHaveBeenCalledExactlyOnceWith({
      intentId: prepared.intentId,
      clientOrderId: expect.stringMatching(/^example-agent-runner-\d+$/u),
    });
    expect(agent.prepareSwap).toHaveBeenCalledWith(expect.objectContaining({ side, amount: '1' }));
    expect(runtime.exitCode).toBeUndefined();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('prepares but does not invoke execution by default', async () => {
    const { agent, browser } = await runMockedRunner();
    expect(agent.prepareSwap).toHaveBeenCalledTimes(1);
    expect(agent.executeSwap).not.toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it.each([{ canExecute: false }, { criticalWarning: true }])(
    'refuses unmet preparation gates: %j',
    async (options) => {
      const { agent, runtime, browser } = await runMockedRunner({ execute: true, ...options });
      expect(agent.executeSwap).not.toHaveBeenCalled();
      expect(runtime.exitCode).toBe(1);
      expect(browser.close).toHaveBeenCalledTimes(1);
    }
  );
});
