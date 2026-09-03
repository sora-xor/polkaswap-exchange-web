import { describe, expect, it, vi } from 'vitest';

import { POLKASWAP_MCP_TOOLS } from '@/features/agent-trading/mcp/catalogue.mjs';
import { registerPolkaswapWebMcpTools } from '@/features/agent-trading/webmcp';

import type { PolkaswapAgentApi } from '@/features/agent-trading/types';

type RegisteredTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: unknown;
  annotations?: Record<string, unknown>;
  execute(input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
};

type RegisterOptions = {
  signal: AbortSignal;
};

type ModelContextHarness = {
  registerTool: ReturnType<typeof vi.fn<(tool: RegisteredTool, options?: RegisterOptions) => Promise<void>>>;
  unregisterTool?: ReturnType<typeof vi.fn<(name: string) => Promise<void>>>;
  tools: RegisteredTool[];
};

/** Creates a minimal WebMCP implementation without augmenting DOM globals. */
function createModelContext(withUnregister = true): ModelContextHarness {
  const tools: RegisteredTool[] = [];
  const registerTool = vi.fn(async (tool: RegisteredTool) => {
    tools.push(tool);
  });
  const unregisterTool = vi.fn(async (name: string) => {
    const index = tools.findIndex((tool) => tool.name === name);
    if (index >= 0) tools.splice(index, 1);
  });

  return {
    registerTool,
    ...(withUnregister ? { unregisterTool } : {}),
    tools,
  };
}

/** Casts a local structural document double without declaring modelContext globally. */
function createDocument(modelContext?: Partial<ModelContextHarness>, defaultView?: Window | null): Document {
  return {
    ...(defaultView === undefined ? {} : { defaultView }),
    ...(modelContext === undefined ? {} : { modelContext }),
  } as unknown as Document;
}

/** Captures a rejected WebMCP execution for field-level assertions. */
async function captureError(request: Promise<unknown>): Promise<Error & { code?: string; details?: unknown }> {
  try {
    await request;
    throw new Error('Expected WebMCP execution to reject.');
  } catch (error) {
    return error as Error & { code?: string; details?: unknown };
  }
}

describe('registerPolkaswapWebMcpTools', () => {
  it('degrades to a no-op when WebMCP is unavailable', async () => {
    const agent = {} as PolkaswapAgentApi;

    const missingContextCleanup = await registerPolkaswapWebMcpTools(agent, createDocument());
    const missingRegistrarCleanup = await registerPolkaswapWebMcpTools(agent, createDocument({}));

    await expect(missingContextCleanup()).resolves.toBeUndefined();
    await expect(missingRegistrarCleanup()).resolves.toBeUndefined();
  });

  it('does not register tools from an iframe document', async () => {
    const context = createModelContext();
    const frameView = { top: {} } as unknown as Window;

    const cleanup = await registerPolkaswapWebMcpTools({} as PolkaswapAgentApi, createDocument(context, frameView));

    expect(context.registerTool).not.toHaveBeenCalled();
    await expect(cleanup()).resolves.toBeUndefined();
  });

  it('registers every public catalogue tool and returns account-redacted results', async () => {
    const result = {
      assets: [{ address: '0x01', symbol: 'XOR', balance: { transferable: '10' } }],
    };
    const assets = vi.fn().mockResolvedValue(result);
    const agent = { assets } as unknown as PolkaswapAgentApi;
    const context = createModelContext();
    const cleanup = await registerPolkaswapWebMcpTools(agent, createDocument(context));

    expect(context.registerTool).toHaveBeenCalledTimes(POLKASWAP_MCP_TOOLS.length);
    expect(context.tools.map((tool) => tool.name)).toEqual(POLKASWAP_MCP_TOOLS.map((tool) => tool.name));
    expect(context.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect(context.tools.map((tool) => tool.name).join(' ')).not.toMatch(
      /connect|execute|sign|(?:clear|import)_state/u
    );

    const registeredAssets = context.tools.find((tool) => tool.name === 'polkaswap_assets');
    expect(registeredAssets).toMatchObject({
      title: 'Search Polkaswap assets',
      inputSchema: POLKASWAP_MCP_TOOLS.find((tool) => tool.name === 'polkaswap_assets')?.inputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false },
    });

    const output = await registeredAssets?.execute({ query: 'xor' });
    expect(output).toEqual({ assets: [{ address: '0x01', symbol: 'XOR' }] });
    expect(output).not.toHaveProperty('content');
    expect(output).not.toHaveProperty('structuredContent');
    expect(assets).toHaveBeenCalledWith({ query: 'xor', includeBalances: false });

    await cleanup();
  });

  it('plans autonomously through the main-page tool without touching a wallet', async () => {
    const plan = {
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      quote: { amountIn: '1', amountOut: '2' },
      preview: { operation: 'Swap', sdkCall: 'api.swap.execute', stateChanging: true, args: {}, summary: {} },
      fees: [],
      warnings: [],
      plannedAt: 1000,
      expiresAt: 2000,
      network: { genesisHash: '0xgenesis', runtimeSpecVersion: 7, blockNumber: 42 },
    };
    const planSwap = vi.fn().mockResolvedValue(plan);
    const connectWallet = vi.fn();
    const context = createModelContext();
    const cleanup = await registerPolkaswapWebMcpTools(
      { planSwap, connectWallet } as unknown as PolkaswapAgentApi,
      createDocument(context)
    );
    const tool = context.tools.find(({ name }) => name === 'polkaswap_plan_swap');
    const input = { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' };

    await expect(tool?.execute(input)).resolves.toEqual(plan);
    expect(planSwap).toHaveBeenCalledWith(input);
    expect(connectWallet).not.toHaveBeenCalled();
    await cleanup();
  });

  it('rejects with sanitized, stable errors for invalid and failed invocations', async () => {
    const assets = vi.fn().mockRejectedValueOnce({ code: 'PROVIDER_FAILURE', message: 'authorization=Bearer secret' });
    const context = createModelContext();
    const cleanup = await registerPolkaswapWebMcpTools(
      { assets } as unknown as PolkaswapAgentApi,
      createDocument(context)
    );
    const registeredAssets = context.tools.find((tool) => tool.name === 'polkaswap_assets');

    if (!registeredAssets) throw new Error('polkaswap_assets was not registered.');

    const invalidInput = await captureError(registeredAssets.execute({ query: 'x'.repeat(129) }));
    expect(invalidInput).toBeInstanceOf(Error);
    expect(invalidInput).toMatchObject({
      name: 'PolkaswapWebMcpInvocationError',
      code: 'INVALID_ARGUMENT',
      message: 'Invalid input at input.query.',
      toolName: 'polkaswap_assets',
      details: { path: 'input.query', rule: 'maxLength' },
    });
    expect(assets).not.toHaveBeenCalled();

    const hostileInput = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('authorization=Bearer secret');
        },
      }
    );
    const unexpectedFailure = await captureError(registeredAssets.execute(hostileInput));
    expect(unexpectedFailure).toMatchObject({
      name: 'PolkaswapWebMcpInvocationError',
      code: 'MCP_INVOCATION_FAILED',
      message: 'Polkaswap tool invocation failed.',
    });
    expect(unexpectedFailure.message).not.toContain('secret');
    expect(unexpectedFailure).not.toHaveProperty('cause');
    expect(unexpectedFailure).not.toHaveProperty('details');
    expect(unexpectedFailure).not.toHaveProperty('toolName');
    expect(assets).not.toHaveBeenCalled();

    const failedCall = await captureError(registeredAssets.execute({ query: 'xor' }));
    expect(failedCall).toMatchObject({
      name: 'PolkaswapWebMcpInvocationError',
      code: 'AGENT_CALL_FAILED',
      message: 'The Polkaswap agent request failed.',
      toolName: 'polkaswap_assets',
    });
    expect(failedCall.message).not.toContain('secret');
    expect(failedCall).not.toHaveProperty('cause');
    expect(failedCall).not.toHaveProperty('details');

    await cleanup();
  });

  it('honors caller cancellation without invoking after a pre-abort or leaking abort reasons', async () => {
    let release!: (value: unknown) => void;
    const assets = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const context = createModelContext();
    const cleanup = await registerPolkaswapWebMcpTools(
      { assets } as unknown as PolkaswapAgentApi,
      createDocument(context)
    );
    const registeredAssets = context.tools.find((tool) => tool.name === 'polkaswap_assets');
    if (!registeredAssets) throw new Error('polkaswap_assets was not registered.');

    const preAborted = new AbortController();
    preAborted.abort(new Error('private pre-abort reason'));
    await expect(registeredAssets.execute({}, { signal: preAborted.signal })).rejects.toMatchObject({
      code: 'MCP_INVOCATION_CANCELLED',
      message: 'The Polkaswap tool invocation was cancelled.',
    });
    expect(assets).not.toHaveBeenCalled();

    const active = new AbortController();
    const invocation = registeredAssets.execute({}, { signal: active.signal });
    await vi.waitFor(() => expect(assets).toHaveBeenCalledTimes(1));
    active.abort(new Error('private active-abort reason'));
    const error = await captureError(invocation);
    expect(error).toMatchObject({
      code: 'MCP_INVOCATION_CANCELLED',
      message: 'The Polkaswap tool invocation was cancelled.',
    });
    expect(JSON.stringify(error)).not.toContain('private');

    release({ assets: [] });
    await cleanup();
  });

  it('deduplicates concurrent registration and cleans up idempotently', async () => {
    const context = createModelContext();
    let releaseFirstRegistration: (() => void) | undefined;
    const firstRegistration = new Promise<void>((resolve) => {
      releaseFirstRegistration = resolve;
    });
    context.registerTool.mockImplementationOnce(async (tool: RegisteredTool) => {
      context.tools.push(tool);
      await firstRegistration;
    });
    const targetDocument = createDocument(context);
    const agent = {} as PolkaswapAgentApi;

    const first = registerPolkaswapWebMcpTools(agent, targetDocument);
    const second = registerPolkaswapWebMcpTools(agent, targetDocument);

    expect(context.registerTool).toHaveBeenCalledTimes(1);
    releaseFirstRegistration?.();
    const [firstCleanup, secondCleanup] = await Promise.all([first, second]);

    expect(firstCleanup).toBe(secondCleanup);
    expect(context.registerTool).toHaveBeenCalledTimes(POLKASWAP_MCP_TOOLS.length);
    const signals = context.registerTool.mock.calls.map(([, options]) => options?.signal);
    expect(signals.every((signal) => signal === signals[0])).toBe(true);
    expect(signals[0]?.aborted).toBe(false);

    await firstCleanup();
    expect(signals[0]?.aborted).toBe(true);
    expect(context.unregisterTool).toHaveBeenCalledTimes(POLKASWAP_MCP_TOOLS.length);
    expect(context.tools).toEqual([]);

    await secondCleanup();
    expect(context.unregisterTool).toHaveBeenCalledTimes(POLKASWAP_MCP_TOOLS.length);

    const nextCleanup = await registerPolkaswapWebMcpTools(agent, targetDocument);
    expect(context.registerTool).toHaveBeenCalledTimes(POLKASWAP_MCP_TOOLS.length * 2);
    await nextCleanup();
  });
});
