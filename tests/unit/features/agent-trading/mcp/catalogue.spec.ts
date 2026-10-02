// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  POLKASWAP_MCP_TOOLS,
  PolkaswapMcpInvocationError,
  invokePolkaswapMcpTool,
  listPolkaswapMcpTools,
} from '@/features/agent-trading/mcp/catalogue.mjs';

const TOOL_NAMES = [
  'polkaswap_capabilities',
  'polkaswap_status',
  'polkaswap_ready',
  'polkaswap_assets',
  'polkaswap_resolve_asset',
  'polkaswap_common_assets',
  'polkaswap_quote_swap',
  'polkaswap_plan_swap',
  'polkaswap_pool_info',
];

const assetIn = { symbol: 'XOR' };
const assetOut = { address: '0x0200000000000000000000000000000000000000000000000000000000000000' };
const swapInput = { assetIn, assetOut, amount: '1.25' };

const VALID_INVOCATIONS = [
  ['polkaswap_capabilities', 'capabilities', {}, false],
  ['polkaswap_status', 'status', {}, false],
  ['polkaswap_ready', 'ready', { requireNode: true, timeoutMs: 5000 }, true],
  ['polkaswap_assets', 'assets', { query: 'xor' }, true],
  ['polkaswap_resolve_asset', 'resolveAsset', { asset: assetIn }, true],
  ['polkaswap_common_assets', 'commonAssets', { query: 'val' }, true],
  ['polkaswap_quote_swap', 'quoteSwap', swapInput, true],
  ['polkaswap_plan_swap', 'planSwap', swapInput, true],
  ['polkaswap_pool_info', 'poolInfo', { assetA: assetIn, assetB: assetOut }, true],
] as const;

/** Recursively visits JSON Schema nodes used by the catalogue assertions. */
function visitSchema(schema: Record<string, unknown>, visitor: (schema: Record<string, unknown>) => void): void {
  visitor(schema);

  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (properties) Object.values(properties).forEach((property) => visitSchema(property, visitor));

  const items = schema.items as Record<string, unknown> | undefined;
  if (items) visitSchema(items, visitor);

  for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
    const branches = schema[keyword] as Array<Record<string, unknown>> | undefined;
    if (branches) branches.forEach((branch) => visitSchema(branch, visitor));
  }
}

/** Recursively verifies that exported catalogue data cannot be mutated. */
function expectDeeplyFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(expectDeeplyFrozen);
}

describe('Polkaswap MCP tool catalogue', () => {
  it('exports only the approved public read-only swap tools', () => {
    expect(POLKASWAP_MCP_TOOLS.map((tool) => tool.name)).toEqual(TOOL_NAMES);

    const serialized = JSON.stringify(POLKASWAP_MCP_TOOLS);
    for (const forbiddenMethod of [
      'connectWallet',
      'executeSwap',
      'executeTransfer',
      'prepareSwap',
      'assessSwap',
      'prepareTransfer',
      'executeAddLiquidity',
      'executeRemoveLiquidity',
      'liquidityPositions',
      'transactionStatus',
      'lookupTransaction',
      'recentTransactions',
      'importState',
      'exportState',
      'clearState',
    ]) {
      expect(serialized).not.toContain(forbiddenMethod);
    }

    for (const tool of POLKASWAP_MCP_TOOLS) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    }
  });

  it('publishes strict schemas with bounded strings, enums, and integers', () => {
    for (const tool of POLKASWAP_MCP_TOOLS) {
      visitSchema(tool.inputSchema as Record<string, unknown>, (schema) => {
        if (schema.type === 'object') expect(schema.additionalProperties).toBe(false);
        if (schema.type === 'string') {
          expect(
            typeof schema.maxLength === 'number' || Array.isArray(schema.enum) || Object.hasOwn(schema, 'const')
          ).toBe(true);
        }
        if (schema.type === 'integer') {
          expect(typeof schema.minimum).toBe('number');
          expect(typeof schema.maximum).toBe('number');
        }
      });
    }
  });

  it('keeps the canonical catalogue deeply frozen and returns defensive list copies', () => {
    expectDeeplyFrozen(POLKASWAP_MCP_TOOLS);

    const first = listPolkaswapMcpTools();
    const second = listPolkaswapMcpTools();
    expect(first).toEqual(POLKASWAP_MCP_TOOLS);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(POLKASWAP_MCP_TOOLS[0]);

    first[0].name = 'mutated';
    expect(second[0].name).toBe('polkaswap_capabilities');
    expect(POLKASWAP_MCP_TOOLS[0].name).toBe('polkaswap_capabilities');
  });
});

describe('invokePolkaswapMcpTool', () => {
  it.each(VALID_INVOCATIONS)('maps %s only to PolkaswapAgent.%s', async (toolName, methodName, input, passInput) => {
    const method = vi.fn(function (this: { marker: string }, request?: unknown) {
      return { marker: this.marker, methodName, request, mode: 'unsigned', canExecute: false, requiresWallet: false };
    });
    const agent = { marker: 'bound-agent', [methodName]: method };

    await expect(invokePolkaswapMcpTool(agent, toolName, input)).resolves.toBeDefined();
    expect(method).toHaveBeenCalledTimes(1);
    const mappedInput =
      toolName === 'polkaswap_assets' || toolName === 'polkaswap_common_assets'
        ? { ...input, includeBalances: false }
        : toolName === 'polkaswap_resolve_asset'
          ? { ...input, includeBalance: false }
          : toolName === 'polkaswap_ready'
            ? { ...input, requireWallet: false }
            : input;
    expect(method).toHaveBeenCalledWith(...(passInput ? [mappedInput] : []));
  });

  it('preserves public quote data while removing account-derived asset fields', async () => {
    const quote = {
      quoteDigest: 'a'.repeat(64),
      amountIn: '1',
      amountOut: '2',
      route: ['XOR', 'XSTUSD', 'VAL'],
      distribution: [{ market: 'XYKPool', percent: 100 }],
      liquiditySources: ['XYKPool'],
      assetIn: { address: 'xor', balance: { transferable: 'private' } },
    };
    const agent = { quoteSwap: vi.fn().mockResolvedValue(quote) };

    await expect(invokePolkaswapMcpTool(agent, 'polkaswap_quote_swap', swapInput)).resolves.toEqual({
      ...quote,
      assetIn: { address: 'xor' },
    });
  });

  it('uses the same exact-input/output schema for autonomous plans and quotes', () => {
    const quote = POLKASWAP_MCP_TOOLS.find(({ name }) => name === 'polkaswap_quote_swap');
    const plan = POLKASWAP_MCP_TOOLS.find(({ name }) => name === 'polkaswap_plan_swap');

    expect(plan?.inputSchema).toEqual(quote?.inputSchema);
  });

  it('returns a wallet-free plan without executable or account-derived fields', async () => {
    const plan = {
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      quote: { amountIn: '1.25', assetIn: { address: 'xor', balance: { transferable: 'secret' } } },
      preview: {
        operation: 'Swap',
        sdkCall: 'api.swap.execute',
        stateChanging: true,
        args: { amount: '1.25', signer: 'secret' },
        summary: { amountOut: '2' },
        encodedCall: 'private',
      },
      fees: [{ amount: '0.01', source: 'static' }],
      warnings: [],
      plannedAt: 1000,
      expiresAt: 2000,
      network: { genesisHash: '0xgenesis', runtimeSpecVersion: 7, blockNumber: 42, endpoint: 'private' },
      wallet: { address: 'secret' },
      signer: 'secret',
      requiredBalances: [],
      intentId: 'private',
      envelope: {},
    };
    const planSwap = vi.fn().mockResolvedValue(plan);
    const prepareSwap = vi.fn();
    const executeSwap = vi.fn();
    const result = await invokePolkaswapMcpTool(
      { planSwap, prepareSwap, executeSwap },
      'polkaswap_plan_swap',
      swapInput
    );

    expect(result).toEqual({
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      quote: { amountIn: '1.25', assetIn: { address: 'xor' } },
      preview: {
        operation: 'Swap',
        sdkCall: 'api.swap.execute',
        stateChanging: true,
        args: { amount: '1.25' },
        summary: { amountOut: '2' },
      },
      fees: plan.fees,
      warnings: [],
      plannedAt: 1000,
      expiresAt: 2000,
      network: { genesisHash: '0xgenesis', runtimeSpecVersion: 7, blockNumber: 42 },
    });
    expect(planSwap).toHaveBeenCalledWith(swapInput);
    expect(prepareSwap).not.toHaveBeenCalled();
    expect(executeSwap).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/secret|private|intentId|envelope|requiredBalances|signer|wallet/);
  });

  it.each([
    { mode: 'prepared', canExecute: false, requiresWallet: false },
    { mode: 'unsigned', canExecute: true, requiresWallet: false },
    { mode: 'unsigned', canExecute: false, requiresWallet: true },
    null,
  ])('fails closed if the planner returns an incompatible result: %j', async (result) => {
    const planSwap = vi.fn().mockResolvedValue(result);
    await expect(invokePolkaswapMcpTool({ planSwap }, 'polkaswap_plan_swap', swapInput)).rejects.toMatchObject({
      code: 'MCP_RESULT_INVALID',
    });
  });

  it('forces account data off and redacts wallet identity from public results', async () => {
    const status = {
      version: 'v1',
      agent: { mode: true, disclaimerSuppressed: true, queryParam: 'polkaswap-agent' },
      node: {
        connected: true,
        endpoint: 'wss://private-node.example',
        blockNumber: 42,
        genesisHash: '0xgenesis',
        runtimeSpecVersion: 7,
      },
      wallet: { connected: true, address: 'cn-private', source: 'private-wallet', accountsCount: 2 },
      settings: { slippageTolerance: '0.5' },
    };
    const assets = vi
      .fn()
      .mockResolvedValue([{ address: 'xor', symbol: 'XOR', balance: { transferable: '10' }, available: '10' }]);
    const agent = { status: vi.fn().mockReturnValue(status), assets };

    const publicStatus = await invokePolkaswapMcpTool(agent, 'polkaswap_status');
    const publicAssets = await invokePolkaswapMcpTool(agent, 'polkaswap_assets', { query: 'xor' });

    expect(publicStatus).toEqual({
      version: 'v1',
      agent: { mode: true, queryParam: 'polkaswap-agent' },
      node: { connected: true, blockNumber: 42, genesisHash: '0xgenesis', runtimeSpecVersion: 7 },
      settings: { slippageTolerance: '0.5' },
    });
    expect(JSON.stringify(publicStatus)).not.toMatch(/wallet|cn-private|private-wallet|private-node/u);
    expect(assets).toHaveBeenCalledWith({ query: 'xor', includeBalances: false });
    expect(publicAssets).toEqual([{ address: 'xor', symbol: 'XOR' }]);
  });

  it('does not advertise private browser methods or capabilities through public MCP', async () => {
    const capabilities = {
      version: 'v1',
      runtime: 'browser',
      methods: ['quoteSwap', 'executeSwap', 'recentTransactions'],
      capabilities: ['swap-quotes', 'signer-backed-execution', 'transaction-history'],
      status: {
        version: 'v1',
        agent: { mode: true, queryParam: 'polkaswap-agent' },
        node: { connected: true, blockNumber: 42, genesisHash: '0xgenesis', runtimeSpecVersion: 7 },
        wallet: { address: 'cn-private' },
        settings: { slippageTolerance: '0.5' },
      },
    };
    const agent = { capabilities: vi.fn().mockReturnValue(capabilities) };

    const result = await invokePolkaswapMcpTool(agent, 'polkaswap_capabilities');

    expect(result).toEqual({
      version: 'v1',
      runtime: 'browser',
      status: {
        version: 'v1',
        agent: { mode: true, queryParam: 'polkaswap-agent' },
        node: { connected: true, blockNumber: 42, genesisHash: '0xgenesis', runtimeSpecVersion: 7 },
        settings: { slippageTolerance: '0.5' },
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /methods|capabilities|executeSwap|recentTransactions|signer-backed-execution|transaction-history|cn-private/u
    );
  });

  it('accepts structural class instances as agent adapters', async () => {
    class AgentAdapter {
      status(): { node: string } {
        return { node: 'connected' };
      }
    }

    await expect(invokePolkaswapMcpTool(new AgentAdapter(), 'polkaswap_status')).resolves.toEqual({
      agent: {},
      node: {},
      settings: {},
    });
  });

  it('rejects unknown and malformed tool names before accessing the agent', async () => {
    const agent = new Proxy(
      {},
      {
        get() {
          throw new Error('agent must not be accessed');
        },
      }
    );

    await expect(invokePolkaswapMcpTool(agent, 'polkaswap_execute_swap', swapInput)).rejects.toMatchObject({
      code: 'UNKNOWN_TOOL',
    });
    await expect(invokePolkaswapMcpTool(agent, 'secret=bearer-token', {})).rejects.toMatchObject({
      code: 'UNKNOWN_TOOL',
      toolName: undefined,
    });
  });

  it.each([
    ['rejects non-object input', 'polkaswap_assets', []],
    ['rejects additional top-level properties', 'polkaswap_assets', { execute: true }],
    ['rejects wallet balance requests', 'polkaswap_assets', { includeBalances: true }],
    ['rejects resolved-asset balance requests', 'polkaswap_resolve_asset', { asset: assetIn, includeBalance: true }],
    ['rejects wallet readiness requests', 'polkaswap_ready', { requireWallet: true }],
    ['rejects overlong bounded strings', 'polkaswap_assets', { query: 'a'.repeat(129) }],
    ['rejects empty asset references', 'polkaswap_resolve_asset', { asset: {} }],
    [
      'rejects additional nested properties',
      'polkaswap_quote_swap',
      { ...swapInput, assetIn: { symbol: 'XOR', privateKey: 'never-accepted' } },
    ],
    ['rejects JSON numbers for precise amounts', 'polkaswap_quote_swap', { ...swapInput, amount: 1.25 }],
    ['rejects invalid enum values', 'polkaswap_quote_swap', { ...swapInput, side: 'sell' }],
    ['rejects wallet opt-in for plans', 'polkaswap_plan_swap', { ...swapInput, includeBalances: true }],
    ['rejects intent fields for plans', 'polkaswap_plan_swap', { ...swapInput, intentId: 'not-an-input' }],
    ['rejects client order fields for plans', 'polkaswap_plan_swap', { ...swapInput, clientOrderId: 'not-an-input' }],
    ['rejects numeric plan amounts', 'polkaswap_plan_swap', { ...swapInput, amount: 1.25 }],
    ['rejects unbounded integer values', 'polkaswap_ready', { timeoutMs: 120001 }],
  ])('%s', async (_label, toolName, input) => {
    const agent = {
      assets: vi.fn(),
      resolveAsset: vi.fn(),
      quoteSwap: vi.fn(),
      planSwap: vi.fn(),
      ready: vi.fn(),
    };

    const request = invokePolkaswapMcpTool(agent, toolName, input as Record<string, unknown>);
    await expect(request).rejects.toBeInstanceOf(PolkaswapMcpInvocationError);
    await expect(request).rejects.toMatchObject({ code: 'INVALID_ARGUMENT', toolName });
    expect(Object.values(agent).every((method) => method.mock.calls.length === 0)).toBe(true);
  });

  it('reports unavailable agents and missing allowlisted methods without invoking another method', async () => {
    await expect(invokePolkaswapMcpTool(null as never, 'polkaswap_status')).rejects.toMatchObject({
      code: 'AGENT_UNAVAILABLE',
    });

    const unrelated = vi.fn();
    await expect(
      invokePolkaswapMcpTool({ executeSwap: unrelated }, 'polkaswap_quote_swap', swapInput)
    ).rejects.toMatchObject({ code: 'AGENT_METHOD_UNAVAILABLE' });
    expect(unrelated).not.toHaveBeenCalled();
  });

  it('preserves allowlisted agent codes but never serializes upstream messages, details, or causes', async () => {
    const upstream = Object.assign(new Error('mnemonic=abandon bearer=secret'), {
      code: 'NODE_NOT_READY',
      details: { privateKey: '0xsecret', authorization: 'Bearer secret' },
    });
    const agent = { status: vi.fn().mockImplementation(() => Promise.reject(upstream)) };

    let thrown: unknown;
    try {
      await invokePolkaswapMcpTool(agent, 'polkaswap_status');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PolkaswapMcpInvocationError);
    expect(thrown).toMatchObject({
      code: 'NODE_NOT_READY',
      toolName: 'polkaswap_status',
      cause: upstream,
    });
    const serialized = JSON.stringify(thrown);
    expect(serialized).not.toContain('mnemonic');
    expect(serialized).not.toContain('abandon');
    expect(serialized).not.toContain('privateKey');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('secret');
  });

  it('does not reflect arbitrary rejected property names into validation errors', async () => {
    const secretPropertyName = 'bearer-secret-value';
    let thrown: unknown;

    try {
      await invokePolkaswapMcpTool({ assets: vi.fn() }, 'polkaswap_assets', {
        [secretPropertyName]: true,
      });
    } catch (error) {
      thrown = error;
    }

    expect(JSON.stringify(thrown)).not.toContain(secretPropertyName);
    expect(thrown).toMatchObject({
      code: 'INVALID_ARGUMENT',
      details: { path: 'input.[property]', rule: 'additionalProperties' },
    });
  });

  it('normalizes errors thrown by agent method getters', async () => {
    const agent = Object.defineProperty({}, 'status', {
      get() {
        throw new Error('authorization=Bearer secret');
      },
    });

    let thrown: unknown;
    try {
      await invokePolkaswapMcpTool(agent, 'polkaswap_status');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ code: 'AGENT_CALL_FAILED' });
    expect(JSON.stringify(thrown)).not.toContain('Bearer');
    expect(JSON.stringify(thrown)).not.toContain('secret');
  });

  it('maps unrecognized provider errors to a stable generic failure', async () => {
    const agent = {
      assets: vi.fn().mockRejectedValue({ code: 'ECONNRESET', message: 'token=secret', response: 'private' }),
    };

    await expect(invokePolkaswapMcpTool(agent, 'polkaswap_assets')).rejects.toMatchObject({
      code: 'AGENT_CALL_FAILED',
      message: 'The Polkaswap agent request failed.',
      details: undefined,
    });
  });
});
