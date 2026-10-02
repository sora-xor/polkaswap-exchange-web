// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

import { McpBridgeConfigError } from '../../../../examples/agent-mcp/config.mjs';
import {
  formatStartupDiagnostic,
  installShutdownHandlers,
  main,
  startPolkaswapMcpStdio,
} from '../../../../examples/agent-mcp/index.mjs';

class FakeMcpServer {
  closeCalls = 0;
  registrations: Array<{
    handler: (input: unknown, context?: { mcpReq: { signal: AbortSignal } }) => Promise<unknown>;
    name: string;
  }> = [];

  registerTool(
    name: string,
    _options: unknown,
    handler: (input: unknown, context?: { mcpReq: { signal: AbortSignal } }) => Promise<unknown>
  ) {
    this.registrations.push({ handler, name });
  }

  async close() {
    this.closeCalls += 1;
  }
}

const CONFIG = {
  appUrl: 'https://polkaswap.io/?polkaswap-agent=1#/swap',
  cdpUrl: null,
  headless: true,
  mode: 'persistent' as const,
  navigationTimeoutMs: 2_000,
  profileDir: '/tmp/polkaswap-mcp-index-test',
  readyTimeoutMs: 2_000,
  toolTimeoutMs: 2_000,
};

function createRuntime() {
  const processHandlers = new Map<string, () => Promise<void>>();
  const stdinHandlers = new Map<string, () => Promise<void>>();
  const runtime = {
    exitCode: undefined as number | undefined,
    once: vi.fn((event: string, handler: () => Promise<void>) => {
      processHandlers.set(event, handler);
    }),
    stdin: {
      destroyed: false,
      readableEnded: false,
      once: vi.fn((event: string, handler: () => Promise<void>) => {
        stdinHandlers.set(event, handler);
      }),
    },
  };
  return { processHandlers, runtime, stdinHandlers };
}

describe('Polkaswap MCP stdio entry point', () => {
  it('wires the mocked browser adapter to the mocked official stdio transport', () => {
    const bridge = { agent: {}, close: vi.fn(async () => undefined) };
    const browserFactory = vi.fn(() => bridge);
    const handle = { close: vi.fn(async () => undefined) };
    let createdServer: FakeMcpServer | undefined;
    const serveStdio = vi.fn((factory) => {
      createdServer = factory() as FakeMcpServer;
      return handle;
    });
    const onerror = vi.fn();
    const chromium = {};

    const session = startPolkaswapMcpStdio(CONFIG, {
      McpServer: FakeMcpServer,
      chromium,
      fromJsonSchema: vi.fn((schema) => schema),
      serveStdio,
      bridgeFactory: browserFactory,
      onerror,
    });

    expect(session.handle).toBe(handle);
    expect(session.bridge).toBe(bridge);
    expect(browserFactory).toHaveBeenCalledWith(CONFIG, { chromium });
    expect(serveStdio).toHaveBeenCalledWith(expect.any(Function), { onerror });
    expect(createdServer?.registrations).toHaveLength(9);
    expect(createdServer?.registrations.some(({ name }) => /execute|sign|submit/.test(name))).toBe(false);
  });

  it('gives every stdio factory product an independently owned browser bridge', async () => {
    const firstBridge = {
      agent: { status: vi.fn(async () => ({ era: 'modern-probe' })) },
      close: vi.fn(async () => undefined),
    };
    const secondBridge = {
      agent: {
        status: vi.fn(async () => ({
          version: 'v1',
          agent: { mode: true, disclaimerSuppressed: true, queryParam: 'polkaswap-agent' },
          node: {
            connected: true,
            endpoint: 'wss://account-private.example',
            blockNumber: 42,
            genesisHash: '0xabc',
            runtimeSpecVersion: 101,
          },
          wallet: { address: 'cnAccountPrivate', connected: true },
          settings: { slippageTolerance: '0.5' },
        })),
      },
      close: vi.fn(async () => undefined),
    };
    const bridgeFactory = vi.fn().mockReturnValueOnce(firstBridge).mockReturnValueOnce(secondBridge);
    const servers: FakeMcpServer[] = [];
    const handle = { close: vi.fn(async () => undefined) };
    const serveStdio = vi.fn((factory) => {
      servers.push(factory() as FakeMcpServer, factory() as FakeMcpServer);
      return handle;
    });

    const session = startPolkaswapMcpStdio(CONFIG, {
      McpServer: FakeMcpServer,
      chromium: {},
      fromJsonSchema: vi.fn((schema) => schema),
      serveStdio,
      bridgeFactory,
    });

    expect(bridgeFactory).toHaveBeenCalledTimes(2);
    expect(session.bridge).toBe(secondBridge);

    await servers[0].close();
    expect(firstBridge.close).toHaveBeenCalledTimes(1);
    expect(secondBridge.close).not.toHaveBeenCalled();

    const statusTool = servers[1].registrations.find(({ name }) => name === 'polkaswap_status');
    const result = await statusTool?.handler({}, { mcpReq: { signal: new AbortController().signal } });
    expect(result).toMatchObject({
      structuredContent: {
        version: 'v1',
        agent: { mode: true, queryParam: 'polkaswap-agent' },
        node: { connected: true, blockNumber: 42, genesisHash: '0xabc', runtimeSpecVersion: 101 },
        settings: { slippageTolerance: '0.5' },
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/cnAccountPrivate|account-private|wallet|disclaimerSuppressed/u);
    expect(secondBridge.agent.status).toHaveBeenCalledTimes(1);

    await servers[1].close();
    expect(secondBridge.close).toHaveBeenCalledTimes(1);
  });

  it('writes help to the injected stderr stream without loading runtime dependencies', async () => {
    const stderr = { write: vi.fn() };

    await expect(main({ argv: ['--help'], env: {}, stderr })).resolves.toBeNull();

    expect(stderr.write).toHaveBeenCalledOnce();
    expect(stderr.write.mock.calls[0][0]).toContain('Polkaswap local MCP bridge (stdio)');
    expect(stderr.write.mock.calls[0][0]).toContain('--profile-dir');
  });

  it('uses one idempotent shutdown for stdin end/close and process signals', async () => {
    const close = vi.fn(async () => undefined);
    const { processHandlers, runtime, stdinHandlers } = createRuntime();
    const stderr = { write: vi.fn() };
    const shutdown = installShutdownHandlers({ handle: { close } }, { runtime: runtime as never, stderr });

    const fromEnd = stdinHandlers.get('end')?.();
    const fromClose = stdinHandlers.get('close')?.();
    const fromSignal = processHandlers.get('SIGTERM')?.();

    expect(fromEnd).toBe(fromClose);
    expect(fromEnd).toBe(fromSignal);
    expect(fromEnd).toBe(shutdown());
    await fromEnd;
    expect(close).toHaveBeenCalledTimes(1);
    expect(stderr.write).not.toHaveBeenCalled();
  });

  it('closes immediately when stdin had already ended before handlers were installed', async () => {
    const close = vi.fn(async () => undefined);
    const { runtime } = createRuntime();
    runtime.stdin.readableEnded = true;

    const shutdown = installShutdownHandlers(
      { handle: { close } },
      { runtime: runtime as never, stderr: { write: vi.fn() } }
    );
    await shutdown();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not reflect shutdown failures to stderr', async () => {
    const secret = 'wallet process secret';
    const close = vi.fn(async () => {
      throw new Error(`${secret}\n${'x'.repeat(1_000)}`);
    });
    const { processHandlers, runtime } = createRuntime();
    const stderr = { write: vi.fn() };
    installShutdownHandlers({ handle: { close } }, { runtime: runtime as never, stderr });

    await processHandlers.get('SIGINT')?.();

    expect(stderr.write).toHaveBeenCalledWith('[polkaswap-mcp] Shutdown failed.\n');
    expect(JSON.stringify(stderr.write.mock.calls)).not.toContain(secret);
    expect(runtime.exitCode).toBe(1);
  });

  it('keeps non-configuration startup and runtime diagnostics fixed and bounded', async () => {
    const secret = `provider-secret-${'x'.repeat(1_000)}`;
    expect(formatStartupDiagnostic(new Error(secret))).toBe('Unable to start the Polkaswap MCP bridge.');

    const configDiagnostic = formatStartupDiagnostic(
      new McpBridgeConfigError(`invalid\n\u001b[31m${'y'.repeat(1_000)}`)
    );
    expect(configDiagnostic.length).toBeLessThanOrEqual(240);
    expect(configDiagnostic).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);

    const { runtime } = createRuntime();
    const stderr = { write: vi.fn() };
    const handle = { close: vi.fn(async () => undefined) };
    const startServer = vi.fn((_config, dependencies) => {
      dependencies.onerror(new Error(secret));
      return { bridge: null, handle };
    });

    await main({
      argv: ['--profile-dir', '/tmp/polkaswap-mcp-index-diagnostic-test'],
      env: {},
      loadDependencies: vi.fn(async () => ({})) as never,
      runtime: runtime as never,
      startServer: startServer as never,
      stderr,
    });

    expect(stderr.write).toHaveBeenCalledWith('[polkaswap-mcp] MCP runtime error.\n');
    expect(JSON.stringify(stderr.write.mock.calls)).not.toContain(secret);
  });
});
