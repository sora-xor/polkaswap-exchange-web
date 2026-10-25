// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { listPolkaswapMcpTools } from '@/features/agent-trading/mcp/catalogue.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');
const publicCataloguePath = path.join(repoRoot, 'public/.well-known/polkaswap-mcp-tools.json');
const playgroundScriptPath = path.join(repoRoot, 'public/agent-playground-webmcp.js');

type RegisteredTool = {
  name: string;
  execute(input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
};

type PlaygroundWindow = {
  CustomEvent: new (type: string, init?: { detail?: unknown }) => { type: string; detail?: unknown };
  PolkaswapPlaygroundWebMcp?: { register(): Promise<() => Promise<void>> };
  clearTimeout: typeof clearTimeout;
  document: Record<string, unknown>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  fetch: ReturnType<typeof vi.fn>;
  location: URL;
  setTimeout: typeof setTimeout;
  top: unknown;
};

/** Evaluates the shipped classic script against a fully local browser double. */
async function loadPlaygroundWebMcp(
  options: {
    nested?: boolean;
    agent?: Record<string, unknown>;
    catalogue?: Array<Record<string, unknown>>;
    fetch?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const source = await readFile(playgroundScriptPath, 'utf8');
  const tools = options.catalogue ?? listPolkaswapMcpTools();
  const registered: RegisteredTool[] = [];
  const events: Array<{ type: string; detail?: unknown }> = [];
  const unregisterTool = vi.fn().mockResolvedValue(undefined);
  const modelContext = {
    registerTool: vi.fn(async (tool: RegisteredTool) => {
      registered.push(tool);
    }),
    unregisterTool,
  };
  const appWindow = {
    PolkaswapAgent: options.agent ?? {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const frame = {
    tagName: 'IFRAME',
    src: 'https://polkaswap.example/?polkaswap-agent=1#/swap',
    contentWindow: appWindow,
  };
  const targetDocument = {
    getElementById: vi.fn((id: string) => (id === 'app-frame' ? frame : null)),
    modelContext,
  };
  const fakeWindow = {
    CustomEvent: class {
      detail?: unknown;
      type: string;

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    clearTimeout,
    document: targetDocument,
    dispatchEvent: vi.fn((event: { type: string; detail?: unknown }) => {
      events.push(event);
      return true;
    }),
    fetch: options.fetch ?? vi.fn().mockResolvedValue({ ok: true, json: async () => tools }),
    location: new URL('https://polkaswap.example/agent-playground.html'),
    setTimeout,
    top: null,
  } as PlaygroundWindow;
  fakeWindow.top = options.nested ? {} : fakeWindow;

  new Function('window', source)(fakeWindow);
  let cleanup: (() => Promise<void>) | undefined;
  let registrationError: unknown;
  try {
    cleanup = await fakeWindow.PolkaswapPlaygroundWebMcp?.register();
  } catch (error) {
    registrationError = error;
  }

  return { cleanup, events, fakeWindow, modelContext, registered, registrationError, tools, unregisterTool };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('agent playground WebMCP parent adapter', () => {
  it('publishes an exact static mirror of the environment-neutral catalogue', async () => {
    const published = JSON.parse(await readFile(publicCataloguePath, 'utf8'));

    expect(published).toEqual(listPolkaswapMcpTools());
  });

  it('registers the nine public read-only tools once and forwards a quote into the iframe', async () => {
    const quote = { amountIn: '1', amountOut: '2', route: ['XOR', 'PSWAP'] };
    const quoteSwap = vi.fn().mockResolvedValue(quote);
    const { cleanup, fakeWindow, modelContext, registered, tools, unregisterTool } = await loadPlaygroundWebMcp({
      agent: { quoteSwap },
    });

    expect(fakeWindow.fetch).toHaveBeenCalledTimes(1);
    expect(modelContext.registerTool).toHaveBeenCalledTimes(tools.length);
    expect(tools).toHaveLength(9);
    expect(registered.map(({ name }) => name)).toEqual(tools.map(({ name }) => name));
    expect(registered.some(({ name }) => /execute|transfer|add_liquidity|remove_liquidity/u.test(name))).toBe(false);
    expect(registered.some(({ name }) => /prepare|assess|position|transaction/u.test(name))).toBe(false);

    const quoteTool = registered.find(({ name }) => name === 'polkaswap_quote_swap');
    const input = { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' };
    await expect(quoteTool?.execute(input)).resolves.toEqual(quote);
    expect(quoteSwap).toHaveBeenCalledWith(input);

    await fakeWindow.PolkaswapPlaygroundWebMcp?.register();
    expect(modelContext.registerTool).toHaveBeenCalledTimes(tools.length);

    await cleanup?.();
    await cleanup?.();
    expect(unregisterTool).toHaveBeenCalledTimes(tools.length);
  });

  it('autonomously plans through the iframe without a wallet or preparation call', async () => {
    const plan = {
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      quote: { amountIn: '1', amountOut: '2', assetIn: { address: 'xor', balance: 'private' } },
      preview: {
        operation: 'Swap',
        sdkCall: 'api.swap.execute',
        stateChanging: true,
        args: { amount: '1', signer: 'private' },
        summary: { amountOut: '2' },
      },
      fees: [],
      warnings: [],
      plannedAt: 1000,
      expiresAt: 2000,
      network: { genesisHash: '0xgenesis', runtimeSpecVersion: 7, blockNumber: 42, endpoint: 'private' },
      wallet: 'private',
      intentId: 'private',
      envelope: { signer: 'private' },
    };
    const planSwap = vi.fn().mockResolvedValue(plan);
    const prepareSwap = vi.fn();
    const executeSwap = vi.fn();
    const { registered } = await loadPlaygroundWebMcp({ agent: { planSwap, prepareSwap, executeSwap } });
    const tool = registered.find(({ name }) => name === 'polkaswap_plan_swap');
    const input = { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1', side: 'output' };

    const result = await tool?.execute(input);
    expect(result).toMatchObject({
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      quote: { amountIn: '1', amountOut: '2', assetIn: { address: 'xor' } },
      preview: { args: { amount: '1' } },
      network: { genesisHash: '0xgenesis', runtimeSpecVersion: 7, blockNumber: 42 },
    });
    expect(JSON.stringify(result)).not.toMatch(/private|wallet|intentId|envelope|signer|balance|endpoint/);
    expect(planSwap).toHaveBeenCalledWith(input);
    expect(prepareSwap).not.toHaveBeenCalled();
    expect(executeSwap).not.toHaveBeenCalled();
  });

  it('rejects wallet arguments and executable planner responses', async () => {
    const planSwap = vi.fn().mockResolvedValue({ mode: 'unsigned', canExecute: true, requiresWallet: false });
    const { registered } = await loadPlaygroundWebMcp({ agent: { planSwap } });
    const tool = registered.find(({ name }) => name === 'polkaswap_plan_swap');
    const input = { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' };

    await expect(tool?.execute({ ...input, requireWallet: true })).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(planSwap).not.toHaveBeenCalled();
    await expect(tool?.execute(input)).rejects.toMatchObject({ code: 'MCP_RESULT_INVALID' });
  });

  it('rejects provider failures with a bounded error and does not leak details', async () => {
    const quoteSwap = vi.fn().mockRejectedValue(
      Object.assign(new Error('Bearer secret'), {
        code: 'NODE_NOT_READY',
        details: { privateKey: 'secret' },
      })
    );
    const { registered } = await loadPlaygroundWebMcp({ agent: { quoteSwap } });
    const quoteTool = registered.find(({ name }) => name === 'polkaswap_quote_swap');

    let thrown: unknown;
    try {
      await quoteTool?.execute({
        assetIn: { symbol: 'XOR' },
        assetOut: { symbol: 'PSWAP' },
        amount: '1',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: 'NODE_NOT_READY',
      message: 'The Polkaswap agent rejected the request (NODE_NOT_READY).',
    });
    expect(JSON.stringify(thrown)).not.toContain('secret');
    expect(JSON.stringify(thrown)).not.toContain('privateKey');
    expect(JSON.stringify(thrown)).not.toContain('Bearer');
  });

  it('forces account data off and projects status/capabilities before returning them', async () => {
    const status = vi.fn().mockReturnValue({
      version: 'v1',
      agent: { mode: true, disclaimerSuppressed: true, queryParam: 'polkaswap-agent' },
      node: {
        connected: true,
        endpoint: 'wss://private-node.example',
        blockNumber: 42,
        genesisHash: '0xgenesis',
        runtimeSpecVersion: 7,
      },
      wallet: { connected: true, address: 'cn-private', source: 'private-wallet' },
      settings: { slippageTolerance: '0.5' },
    });
    const capabilities = vi.fn().mockReturnValue({
      version: 'v1',
      methods: ['status', 'quoteSwap', 'executeSwap', 'connectWallet'],
      capabilities: ['status', 'swap-quote', 'swap-execute', 'wallet-connect'],
      status: status(),
    });
    const assets = vi
      .fn()
      .mockResolvedValue([{ address: 'xor', symbol: 'XOR', balance: { transferable: '10' }, available: '10' }]);
    const { registered } = await loadPlaygroundWebMcp({ agent: { assets, capabilities, status } });

    const publicStatus = await registered.find(({ name }) => name === 'polkaswap_status')?.execute();
    const publicCapabilities = await registered.find(({ name }) => name === 'polkaswap_capabilities')?.execute();
    const publicAssets = await registered.find(({ name }) => name === 'polkaswap_assets')?.execute({ query: 'xor' });

    expect(publicStatus).toEqual({
      version: 'v1',
      agent: { mode: true, queryParam: 'polkaswap-agent' },
      node: { connected: true, blockNumber: 42, genesisHash: '0xgenesis', runtimeSpecVersion: 7 },
      settings: { slippageTolerance: '0.5' },
    });
    expect(publicCapabilities).toMatchObject({
      methods: ['status', 'quoteSwap'],
      capabilities: ['status', 'swap-quote'],
      status: publicStatus,
    });
    expect(JSON.stringify(publicCapabilities)).not.toMatch(/executeSwap|connectWallet|private-node|cn-private/u);
    expect(assets).toHaveBeenCalledWith({ query: 'xor', includeBalances: false });
    expect(publicAssets).toEqual([{ address: 'xor', symbol: 'XOR' }]);
  });

  it('enforces the published strict schemas before calling the iframe agent', async () => {
    const quoteSwap = vi.fn().mockResolvedValue({ amountOut: '2' });
    const ready = vi.fn().mockResolvedValue({});
    const { registered } = await loadPlaygroundWebMcp({ agent: { quoteSwap, ready } });
    const quoteTool = registered.find(({ name }) => name === 'polkaswap_quote_swap');
    const readyTool = registered.find(({ name }) => name === 'polkaswap_ready');

    await expect(
      quoteTool?.execute({
        assetIn: { symbol: 'XOR' },
        assetOut: { symbol: 'PSWAP' },
        amount: 1,
        privateKey: 'must-not-pass',
      })
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'The Polkaswap tool input is invalid.',
    });
    await expect(readyTool?.execute({ requireWallet: true })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });

    expect(quoteSwap).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
  });

  it('emits bounded registration and invocation telemetry without arguments or results', async () => {
    const quoteSwap = vi.fn().mockResolvedValue({ amountOut: '2', wallet: { address: 'cn-private' } });
    const { events, registered } = await loadPlaygroundWebMcp({ agent: { quoteSwap } });
    const quoteTool = registered.find(({ name }) => name === 'polkaswap_quote_swap');

    await quoteTool?.execute({ assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' });

    const statusDetails = events.filter(({ type }) => type === 'polkaswap-webmcp-status').map(({ detail }) => detail);
    const invocation = events.find(({ type }) => type === 'polkaswap-webmcp-invocation')?.detail;
    expect(statusDetails).toContainEqual({ state: 'ready', toolCount: 9 });
    expect(invocation).toEqual({
      source: 'webmcp',
      toolName: 'polkaswap_quote_swap',
      status: 'success',
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(invocation)).not.toMatch(/assetIn|amountOut|cn-private/u);
  });

  it('cancels an in-flight read without leaking the abort reason', async () => {
    let release!: (value: unknown) => void;
    const quoteSwap = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const { registered } = await loadPlaygroundWebMcp({ agent: { quoteSwap } });
    const quoteTool = registered.find(({ name }) => name === 'polkaswap_quote_swap');
    const controller = new AbortController();
    const invocation = quoteTool?.execute(
      { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' },
      { signal: controller.signal }
    );

    await vi.waitFor(() => expect(quoteSwap).toHaveBeenCalledTimes(1));
    controller.abort(new Error('private cancellation reason'));
    await expect(invocation).rejects.toMatchObject({
      code: 'MCP_INVOCATION_CANCELLED',
      message: 'The Polkaswap tool invocation was cancelled.',
    });

    release({ amountOut: '2' });
  });

  it('sanitizes hostile error getters and rejects inherited allowlist names', async () => {
    const hostileError = Object.defineProperty({}, 'code', {
      get() {
        throw new Error('private provider getter');
      },
    });
    const quoteSwap = vi.fn().mockRejectedValue(hostileError);
    const { registered } = await loadPlaygroundWebMcp({ agent: { quoteSwap } });
    const quoteTool = registered.find(({ name }) => name === 'polkaswap_quote_swap');

    const invocation = quoteTool?.execute({
      assetIn: { symbol: 'XOR' },
      assetOut: { symbol: 'PSWAP' },
      amount: '1',
    });
    await expect(invocation).rejects.toMatchObject({ code: 'MCP_INVOCATION_FAILED' });
    await expect(invocation).rejects.not.toThrow(/private provider getter/u);

    const inheritedNameCatalogue = listPolkaswapMcpTools();
    inheritedNameCatalogue[0] = { ...inheritedNameCatalogue[0], name: 'constructor' };
    const { registrationError } = await loadPlaygroundWebMcp({ catalogue: inheritedNameCatalogue });
    expect(registrationError).toMatchObject({
      message: 'The Polkaswap MCP tool catalogue contains an unsafe definition.',
    });
  });

  it('retries one transient catalogue fetch failure', async () => {
    const tools = listPolkaswapMcpTools();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary gateway failure'))
      .mockResolvedValue({ ok: true, json: async () => tools });

    const { registered, registrationError } = await loadPlaygroundWebMcp({ catalogue: tools, fetch });

    expect(registrationError).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(registered).toHaveLength(tools.length);
  });

  it.each([
    [
      'malformed JSON',
      {
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError('truncated catalogue response')),
      },
    ],
    [
      'an invalid catalogue shape',
      {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      },
    ],
  ])('retries a transient 200 response containing %s', async (_label, transientResponse) => {
    const tools = listPolkaswapMcpTools();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(transientResponse)
      .mockResolvedValue({ ok: true, json: async () => tools });

    const { registered, registrationError } = await loadPlaygroundWebMcp({ catalogue: tools, fetch });

    expect(registrationError).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(registered).toHaveLength(tools.length);
  });

  it('does nothing when loaded below the top-level document', async () => {
    const { fakeWindow, modelContext, registered } = await loadPlaygroundWebMcp({ nested: true });

    expect(fakeWindow.fetch).not.toHaveBeenCalled();
    expect(modelContext.registerTool).not.toHaveBeenCalled();
    expect(registered).toEqual([]);
  });
});
