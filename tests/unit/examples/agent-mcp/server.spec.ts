// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PolkaswapMcpInvocationError,
  invokePolkaswapMcpTool,
  listPolkaswapMcpTools,
} from '../../../../src/features/agent-trading/mcp/catalogue.mjs';
import {
  createPolkaswapMcpServer,
  importedPolkaswapMcpTools,
  normalizeInvocationError,
} from '../../../../examples/agent-mcp/server.mjs';

const TEST_TOOLS = [
  {
    name: 'polkaswap_test_one',
    title: 'Test one',
    description: 'First test tool.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: { value: { type: 'string' } },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'polkaswap_test_two',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
];

class FakeMcpServer {
  closeCalls = 0;
  info: unknown;
  registrations: Array<{
    handler: (input: unknown, context?: ReturnType<typeof requestContext>) => Promise<unknown>;
    name: string;
    options: Record<string, unknown>;
  }> = [];

  constructor(info: unknown) {
    this.info = info;
  }

  registerTool(
    name: string,
    options: Record<string, unknown>,
    handler: (input: unknown, context?: ReturnType<typeof requestContext>) => Promise<unknown>
  ) {
    this.registrations.push({ handler, name, options });
  }

  async close() {
    this.closeCalls += 1;
  }
}

function createHarness(options: Record<string, unknown> = {}) {
  const bridge = {
    agent: {},
    close: vi.fn(async () => undefined),
  };
  const fromJsonSchema = vi.fn((schema) => ({ wrappedSchema: schema }));
  const invoke = vi.fn(async (_agent, name, input) => ({ input, name }));
  const server = createPolkaswapMcpServer({
    McpServer: FakeMcpServer,
    bridge,
    fromJsonSchema,
    invoke,
    toolTimeoutMs: 1_000,
    tools: TEST_TOOLS,
    ...options,
  }) as FakeMcpServer;
  return { bridge, fromJsonSchema, invoke, server };
}

function parsedError(result: unknown) {
  const response = result as { content: Array<{ text: string }> };
  return JSON.parse(response.content[0].text).error;
}

function requestContext(signal = new AbortController().signal) {
  return { mcpReq: { signal } };
}

describe('Polkaswap stdio MCP server construction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers exactly the supplied catalogue descriptors with wrapped JSON Schema', () => {
    const { fromJsonSchema, server } = createHarness();

    expect(server.info).toEqual({ name: 'polkaswap-local-agent', version: '0.1.0' });
    expect(server.registrations.map(({ name }) => name)).toEqual(TEST_TOOLS.map(({ name }) => name));
    expect(server.registrations[0].options).toEqual({
      title: TEST_TOOLS[0].title,
      description: TEST_TOOLS[0].description,
      inputSchema: { wrappedSchema: TEST_TOOLS[0].inputSchema },
      annotations: TEST_TOOLS[0].annotations,
    });
    expect(fromJsonSchema).toHaveBeenCalledTimes(TEST_TOOLS.length);
  });

  it('forwards tool input to the shared invocation adapter and returns MCP content', async () => {
    const { bridge, invoke, server } = createHarness();
    const input = { value: 'safe' };

    const result = await server.registrations[0].handler(input);

    expect(invoke).toHaveBeenCalledWith(bridge.agent, 'polkaswap_test_one', input);
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ input, name: 'polkaswap_test_one' }, null, 2),
        },
      ],
      structuredContent: { input, name: 'polkaswap_test_one' },
    });
  });

  it('wraps non-object results for structured MCP content', async () => {
    const { server } = createHarness({ invoke: vi.fn(async () => ['XOR', 'VAL']) });

    await expect(server.registrations[0].handler({})).resolves.toMatchObject({
      structuredContent: { result: ['XOR', 'VAL'] },
    });
  });

  it('runs unsigned planning through the real shared adapter without wallet calls', async () => {
    const planSwap = vi.fn().mockResolvedValue({
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
      signer: 'private',
      intentId: 'private',
      envelope: {},
    });
    const connectWallet = vi.fn();
    const bridge = { agent: { planSwap, connectWallet }, close: vi.fn() };
    const { server } = createHarness({ bridge, invoke: invokePolkaswapMcpTool, tools: listPolkaswapMcpTools() });
    const tool = server.registrations.find(({ name }) => name === 'polkaswap_plan_swap');
    const input = { assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' };

    const result = await tool?.handler(input);
    expect(result).toMatchObject({ structuredContent: { mode: 'unsigned', canExecute: false, requiresWallet: false } });
    expect(planSwap).toHaveBeenCalledWith(input);
    expect(connectWallet).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/private|signer|intentId|envelope/);
  });

  it('rejects oversized successful results with a fixed secret-free error', async () => {
    const secret = `private-result-${'x'.repeat(1_000)}`;
    const { server } = createHarness({
      invoke: vi.fn(async () => ({ secret })),
      maxResultBytes: 256,
    });

    const result = await server.registrations[0].handler({});

    expect(parsedError(result)).toEqual({
      code: 'MCP_RESULT_TOO_LARGE',
      message: 'The Polkaswap tool result exceeds the response size limit.',
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it('preserves only the catalogue error safe serialization', () => {
    const error = new PolkaswapMcpInvocationError('INVALID_ARGUMENT', 'Invalid input at input.amount.', {
      toolName: 'polkaswap_quote_swap',
      details: { path: 'input.amount', rule: 'pattern' },
      cause: new Error('secret upstream data'),
    });

    expect(normalizeInvocationError(error)).toEqual({
      code: 'INVALID_ARGUMENT',
      message: 'Invalid input at input.amount.',
      toolName: 'polkaswap_quote_swap',
      details: { path: 'input.amount', rule: 'pattern' },
    });
  });

  it('denies arbitrary error fields and details by default', async () => {
    const unsafeError = Object.assign(new Error('seed phrase: alpha beta gamma'), {
      code: 'PROVIDER_SECRET',
      details: { authorization: 'Bearer private-token' },
    });
    const { server } = createHarness({
      invoke: vi.fn(async () => {
        throw unsafeError;
      }),
    });

    const result = await server.registrations[0].handler({});
    const serialized = JSON.stringify(result);

    expect(parsedError(result)).toEqual({
      code: 'MCP_INVOCATION_FAILED',
      message: 'The Polkaswap tool invocation failed.',
    });
    expect(serialized).not.toContain('alpha beta gamma');
    expect(serialized).not.toContain('private-token');
    expect(serialized).not.toContain('PROVIDER_SECRET');
  });

  it('uses the catalogue to strip raw browser-provider messages and details', async () => {
    const rawSecret = 'wallet extension secret diagnostic';
    const status = vi.fn(async () => {
      throw Object.assign(new Error(rawSecret), {
        code: 'UNTRUSTED_PROVIDER_CODE',
        details: { token: 'private-extension-token' },
      });
    });
    const tool = listPolkaswapMcpTools().find(({ name }) => name === 'polkaswap_status');
    const { server } = createHarness({
      bridge: { agent: { status }, close: vi.fn(async () => undefined) },
      invoke: undefined,
      tools: [tool],
    });

    const result = await server.registrations[0].handler({});
    const serialized = JSON.stringify(result);

    expect(parsedError(result)).toEqual({
      code: 'AGENT_CALL_FAILED',
      message: 'The Polkaswap agent request failed.',
      toolName: 'polkaswap_status',
    });
    expect(serialized).not.toContain(rawSecret);
    expect(serialized).not.toContain('private-extension-token');
    expect(serialized).not.toContain('UNTRUSTED_PROVIDER_CODE');
  });

  it('serializes browser work so two tool handlers cannot overlap', async () => {
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const invoke = vi.fn(async () => {
      const order = invoke.mock.calls.length;
      if (order === 1) await firstPending;
      return { order };
    });
    const { server } = createHarness({ invoke });

    const first = server.registrations[0].handler({ value: 'first' });
    const second = server.registrations[1].handler({});
    await Promise.resolve();
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledTimes(1);
    releaseFirst();
    await expect(first).resolves.toMatchObject({ structuredContent: { order: 1 } });
    await expect(second).resolves.toMatchObject({ structuredContent: { order: 2 } });
  });

  it('bounds active and queued work with a fixed queue-full error', async () => {
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const invoke = vi.fn(async () => {
      const order = invoke.mock.calls.length;
      if (order === 1) await firstPending;
      return { order };
    });
    const { server } = createHarness({ invoke, maxPendingToolCalls: 2 });

    const first = server.registrations[0].handler({}, requestContext());
    const second = server.registrations[1].handler({}, requestContext());
    const rejected = await server.registrations[0].handler({}, requestContext());

    expect(parsedError(rejected)).toEqual({
      code: 'MCP_QUEUE_FULL',
      message: 'The Polkaswap MCP request queue is full.',
    });
    expect(invoke).toHaveBeenCalledTimes(1);

    releaseFirst();
    await expect(first).resolves.toMatchObject({ structuredContent: { order: 1 } });
    await expect(second).resolves.toMatchObject({ structuredContent: { order: 2 } });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('returns a fixed error when a tool exceeds the server timeout', async () => {
    vi.useFakeTimers();
    const { server } = createHarness({
      invoke: vi.fn(() => new Promise(() => undefined)),
      toolTimeoutMs: 10,
    });

    const invocation = server.registrations[0].handler({});
    await vi.advanceTimersByTimeAsync(10);
    const result = await invocation;

    expect(parsedError(result)).toEqual({
      code: 'MCP_TOOL_TIMEOUT',
      message: 'The Polkaswap tool invocation timed out.',
    });
  });

  it('keeps the queue blocked on underlying work after returning a timeout', async () => {
    vi.useFakeTimers();
    let active = 0;
    let maximumActive = 0;
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const invoke = vi.fn(async () => {
      const order = invoke.mock.calls.length;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        if (order === 1) await firstPending;
        return { order };
      } finally {
        active -= 1;
      }
    });
    const { server } = createHarness({ invoke, toolTimeoutMs: 10 });

    const first = server.registrations[0].handler({}, requestContext());
    await vi.advanceTimersByTimeAsync(10);
    await expect(first).resolves.toSatisfy((result) => parsedError(result).code === 'MCP_TOOL_TIMEOUT');

    const second = server.registrations[1].handler({}, requestContext());
    await Promise.resolve();
    await Promise.resolve();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(maximumActive).toBe(1);

    releaseFirst();
    await expect(second).resolves.toMatchObject({ structuredContent: { order: 2 } });
    expect(maximumActive).toBe(1);
  });

  it('keeps the queue blocked on underlying work after active client cancellation', async () => {
    let active = 0;
    let maximumActive = 0;
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const invoke = vi.fn(async () => {
      const order = invoke.mock.calls.length;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        if (order === 1) await firstPending;
        return { order };
      } finally {
        active -= 1;
      }
    });
    const { server } = createHarness({ invoke, toolTimeoutMs: 1_000 });
    const firstController = new AbortController();

    const first = server.registrations[0].handler({}, requestContext(firstController.signal));
    await Promise.resolve();
    await Promise.resolve();
    firstController.abort(new Error('client cancellation secret'));
    await expect(first).resolves.toSatisfy((result) => parsedError(result).code === 'MCP_REQUEST_CANCELLED');

    const second = server.registrations[1].handler({}, requestContext());
    await Promise.resolve();
    await Promise.resolve();
    expect(invoke).toHaveBeenCalledTimes(1);

    releaseFirst();
    await expect(second).resolves.toMatchObject({ structuredContent: { order: 2 } });
    expect(maximumActive).toBe(1);
    expect(JSON.stringify(await first)).not.toContain('client cancellation secret');
  });

  it('never invokes a queued request cancelled before it starts', async () => {
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const invoke = vi
      .fn()
      .mockImplementationOnce(async () => {
        await firstPending;
        return { order: 1 };
      })
      .mockResolvedValueOnce({ order: 2 });
    const { server } = createHarness({ invoke, toolTimeoutMs: 1_000 });
    const queuedController = new AbortController();
    const first = server.registrations[0].handler({}, requestContext());
    const queued = server.registrations[1].handler({}, requestContext(queuedController.signal));
    await Promise.resolve();
    await Promise.resolve();

    queuedController.abort();
    const queuedResult = await queued;
    expect(parsedError(queuedResult)).toEqual({
      code: 'MCP_REQUEST_CANCELLED',
      message: 'The Polkaswap tool invocation was cancelled.',
    });
    expect(invoke).toHaveBeenCalledTimes(1);

    const afterCancelled = server.registrations[0].handler({}, requestContext());
    releaseFirst();
    await first;
    await expect(afterCancelled).resolves.toMatchObject({ structuredContent: { order: 2 } });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('never invokes a queued request whose original deadline expires', async () => {
    vi.useFakeTimers();
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const invoke = vi.fn(async () => {
      const order = invoke.mock.calls.length;
      if (order === 1) await firstPending;
      return { order };
    });
    const { server } = createHarness({ invoke, toolTimeoutMs: 10 });
    const first = server.registrations[0].handler({}, requestContext());
    const queued = server.registrations[1].handler({}, requestContext());
    await vi.advanceTimersByTimeAsync(10);

    expect(parsedError(await queued)).toEqual({
      code: 'MCP_TOOL_TIMEOUT',
      message: 'The Polkaswap tool invocation timed out.',
    });
    expect(invoke).toHaveBeenCalledTimes(1);

    const afterTimeout = server.registrations[0].handler({}, requestContext());
    releaseFirst();
    await first;
    await expect(afterTimeout).resolves.toMatchObject({ structuredContent: { order: 2 } });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('closes the SDK and browser bridge exactly once', async () => {
    const { bridge, server } = createHarness();

    await server.close();
    await server.close();

    expect(server.closeCalls).toBe(1);
    expect(bridge.close).toHaveBeenCalledTimes(1);
  });

  it('exposes the immutable shared catalogue without adding execution tools', () => {
    const tools = importedPolkaswapMcpTools();

    expect(tools.map(({ name }) => name)).toEqual([
      'polkaswap_capabilities',
      'polkaswap_status',
      'polkaswap_ready',
      'polkaswap_assets',
      'polkaswap_resolve_asset',
      'polkaswap_common_assets',
      'polkaswap_quote_swap',
      'polkaswap_plan_swap',
      'polkaswap_pool_info',
    ]);
    expect(tools.every(({ annotations }) => annotations.readOnlyHint === true)).toBe(true);
    expect(tools.some(({ name }) => /prepare|execute|sign|submit|transaction|position/.test(name))).toBe(false);
  });

  it('rejects empty, duplicate, or schema-less catalogues at construction', () => {
    expect(() => createHarness({ tools: [] })).toThrow(/at least one tool/);
    expect(() => createHarness({ tools: [TEST_TOOLS[0], TEST_TOOLS[0]] })).toThrow(/Duplicate/);
    expect(() => createHarness({ tools: [{ name: 'polkaswap_invalid' }] })).toThrow(/no JSON input schema/);
  });

  it('rejects invalid queue and result bounds at construction', () => {
    expect(() => createHarness({ maxPendingToolCalls: 0 })).toThrow(/maximum pending/);
    expect(() => createHarness({ maxResultBytes: 0 })).toThrow(/maximum result/);
  });
});
