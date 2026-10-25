// @vitest-environment node
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  APP_URL,
  SORA_GENESIS,
  PreflightError,
  assetReference,
  parseArguments,
  publicAsset,
  publicReport,
  readPublicPlan,
  runPreflight,
} from '../../../../skills/polkaswap-trade-preflight/scripts/preflight-core.mjs';
import { loadChromium, main } from '../../../../skills/polkaswap-trade-preflight/scripts/preflight.mjs';
import {
  PLAYWRIGHT_VERSION,
  main as setupMain,
  setupRuntime,
  validateRuntimeDirectory,
} from '../../../../skills/polkaswap-trade-preflight/scripts/setup.mjs';

const { setupExec } = vi.hoisted(() => ({ setupExec: vi.fn() }));
vi.mock('node:child_process', () => ({ execFileSync: setupExec }));

const XOR = `0x0200${'0'.repeat(60)}`;
const PSWAP = `0x020009${'0'.repeat(58)}`;
const NOW = 1_800_000_000_000;
const originalExitCode = process.exitCode;
const originalBrowserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
const temporaryDirectories: string[] = [];

function argumentsFor(amount = '1.000000000000000001') {
  return ['--asset-in', 'XOR', '--asset-out', 'PSWAP', '--amount', amount];
}

function fixture(side: 'input' | 'output' = 'input') {
  const assetIn = { address: XOR, symbol: 'XOR', decimals: 18, canonical: true };
  const assetOut = { address: PSWAP, symbol: 'PSWAP', decimals: 18, canonical: true };
  const amountIn = '1.000000000000000001';
  const amountOut = '2.123456789012345678';
  const amountInMeta = {
    asset: assetIn,
    value: amountIn,
    codec: '1000000000000000001',
    decimals: 18,
  };
  const amountOutMeta = { asset: assetOut, value: amountOut, codec: '2123456789012345678', decimals: 18 };
  const options = parseArguments([...argumentsFor(side === 'input' ? amountIn : amountOut), '--side', side]);
  return {
    options,
    data: {
      ok: true,
      assetIn,
      assetOut,
      plan: {
        mode: 'unsigned',
        canExecute: false,
        requiresWallet: false,
        plannedAt: NOW - 1_000,
        expiresAt: NOW + 60_000,
        network: { genesisHash: SORA_GENESIS, runtimeSpecVersion: 1_234, blockNumber: 25_867_650 },
        quote: {
          assetIn,
          assetOut,
          request: { amount: options.amount, side, slippageTolerance: options.slippageTolerance, dexId: 'best' },
          amountIn,
          amountOut,
          amountInMeta,
          amountOutMeta,
          minAmountOut: '2.1',
          minAmountOutMeta: { asset: assetOut, value: '2.1', codec: '2100000000000000000', decimals: 18 },
          maxAmountIn: '1.01',
          maxAmountInMeta: {
            asset: assetIn,
            value: '1.01',
            codec: '1010000000000000000',
            decimals: 18,
          },
          quoteDigest: 'a'.repeat(64),
          priceImpact: '0.1',
          dexId: 0,
          route: [XOR, PSWAP],
          liquiditySources: ['XYKPool'],
        },
        fees: [
          {
            asset: assetIn,
            amount: '0.0007',
            amountCodec: '700000000000000',
            source: 'finalized-runtime',
          },
        ],
        warnings: [
          { code: 'HIGH_PRICE_IMPACT', severity: 'warning', message: 'Public provider prose is not trusted.' },
        ],
      },
    },
  };
}

function agentPage(data = fixture().data) {
  const agent = {
    capabilities: vi.fn(() => ({ version: 'v1' })),
    ready: vi.fn(async () => undefined),
    resolveAsset: vi.fn(async ({ asset }: { asset: { symbol?: string; address?: string } }) =>
      asset.symbol === 'XOR' || asset.address === XOR ? data.assetIn : data.assetOut
    ),
    planSwap: vi.fn(async () => data.plan),
    connectWallet: vi.fn(),
    prepareSwap: vi.fn(),
    executeSwap: vi.fn(),
    sign: vi.fn(),
  };
  const location = { href: APP_URL };
  vi.stubGlobal('window', { location, PolkaswapAgent: agent });
  const page = {
    url: vi.fn(() => location.href),
    evaluate: vi.fn(async (callback: (args: unknown) => Promise<unknown>, args: unknown) => callback(args)),
    goto: vi.fn(async () => undefined),
    waitForFunction: vi.fn(async () => undefined),
  };
  return { agent, location, page };
}

function browserRuntime(page = agentPage().page) {
  const context = { newPage: vi.fn(async () => page) };
  const browser = { newContext: vi.fn(async () => context), close: vi.fn(async () => undefined) };
  const chromium = { launch: vi.fn(async () => browser) };
  return { chromium, browser, context, page };
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  process.exitCode = originalExitCode;
  if (originalBrowserPath === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
  else process.env.PLAYWRIGHT_BROWSERS_PATH = originalBrowserPath;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('trade-preflight input boundary', () => {
  it('preserves exact token decimals and applies explicit read-only defaults', () => {
    expect(parseArguments(argumentsFor(), { POLKASWAP_PREFLIGHT_RUNTIME_DIR: '/runtime' })).toEqual({
      assetIn: { symbol: 'XOR' },
      assetOut: { symbol: 'PSWAP' },
      amount: '1.000000000000000001',
      side: 'input',
      slippageTolerance: '0.5',
      runtimeDir: '/runtime',
      dexId: 'best',
      quoteTimeoutMs: 30_000,
    });
    expect(
      parseArguments([...argumentsFor(), '--runtime-dir', '/explicit'], { POLKASWAP_PREFLIGHT_RUNTIME_DIR: '/env' })
        .runtimeDir
    ).toBe('/explicit');
    expect(parseArguments(['--help'])).toEqual({ help: true });
  });

  it('normalizes canonical-length asset IDs but preserves symbol case', () => {
    expect(assetReference(`0x${'Ab'.repeat(32)}`)).toEqual({ address: `0x${'ab'.repeat(32)}` });
    expect(assetReference('USDT.e')).toEqual({ symbol: 'USDT.e' });
  });

  it.each(['https://example.test/XOR', 'XOR\n', 'XOR PSWAP', '', 'X'.repeat(65), undefined])(
    'rejects unsafe asset references (%j)',
    (value) => {
      expect(() => assetReference(value)).toThrowError('INVALID_INPUT');
    }
  );

  it.each(['0', '0.000', '-1', '+1', '01', '1e3', '.5', '1.', 'NaN', '9'.repeat(61), `1.${'1'.repeat(31)}`])(
    'rejects invalid or unbounded amounts (%s)',
    (amount) => {
      expect(() => parseArguments(argumentsFor(amount))).toThrowError('INVALID_INPUT');
    }
  );

  it('accepts precision limits without coercing through floating point', () => {
    const amount = `${'9'.repeat(60)}.${'1'.repeat(30)}`;
    expect(parseArguments(argumentsFor(amount)).amount).toBe(amount);
    expect(parseArguments(argumentsFor('0.000000000000000000000000000001')).amount).toBe(
      '0.000000000000000000000000000001'
    );
  });

  it.each(['0.01', '0.010000000000000000000000000001', '10', '10.000000000000000000000000000000'])(
    'accepts exact slippage bounds (%s)',
    (slippage) => {
      expect(parseArguments([...argumentsFor(), '--slippage', slippage]).slippageTolerance).toBe(slippage);
    }
  );

  it.each(['0', '0.009999999999999999999999999999', '10.000000000000000000000000000001', '11', '-0.5', '5e-1'])(
    'rejects slippage outside the exact range (%s)',
    (slippage) => {
      expect(() => parseArguments([...argumentsFor(), '--slippage', slippage])).toThrowError('INVALID_INPUT');
    }
  );

  it.each([
    ['--wallet', 'secret'],
    ['--seed', 'secret'],
    ['--execute', 'true'],
    ['--sign', 'true'],
    ['--asset-in', 'VAL'],
    ['--side', 'buy'],
    ['--slippage'],
    ['--help'],
  ])('rejects wallet/execution flags, duplicates and incomplete options (%j)', (...extra) => {
    expect(() => parseArguments([...argumentsFor(), ...extra])).toThrowError('INVALID_INPUT');
  });

  it('sanitizes unsupported errors instead of preserving provider diagnostics', () => {
    expect(new PreflightError('NODE_NOT_READY')).toMatchObject({ code: 'NODE_NOT_READY', message: 'NODE_NOT_READY' });
    expect(new PreflightError('Authorization: bearer secret')).toMatchObject({
      code: 'PREFLIGHT_FAILED',
      message: 'PREFLIGHT_FAILED',
    });
  });
});

describe('trade-preflight public quote projection', () => {
  it('reports exact quote, chain codec evidence and conservative execution constraints', () => {
    const { data, options } = fixture();
    const report = publicReport(data, options, NOW);
    expect(report).toMatchObject({
      schemaVersion: 1,
      observedAt: NOW,
      appUrl: APP_URL,
      handoffUrl: 'https://polkaswap.io/#/swap',
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      assessment: 'quoted',
      assets: { input: data.assetIn, output: data.assetOut },
      request: data.plan.quote.request,
      quote: {
        amountIn: options.amount,
        amountOut: '2.123456789012345678',
        minAmountOut: '2.1',
        amountInMeta: { value: options.amount, codec: '1000000000000000001', decimals: 18 },
        boundMeta: { value: '2.1', codec: '2100000000000000000', decimals: 18 },
      },
      network: data.plan.network,
      constraints: {
        balancesChecked: false,
        signerFeeChecked: false,
        fillGuaranteed: false,
        supportedRoutesOnly: true,
        refreshBeforeWalletReview: true,
        unitSystem: 'current-sora-native',
      },
    });
    expect(report.quote).not.toHaveProperty('maxAmountIn');
  });

  it('reports maximum input rather than minimum output for an exact-output request', () => {
    const { data, options } = fixture('output');
    const report = publicReport(data, options, NOW);
    expect(report.quote.maxAmountIn).toBe('1.01');
    expect(report.quote.boundMeta).toEqual({
      value: '1.01',
      codec: '1010000000000000000',
      decimals: 18,
    });
    expect(report.quote).not.toHaveProperty('minAmountOut');
  });

  it('allowlists every object and replaces untrusted warning text', () => {
    const { data, options } = fixture();
    const sensitive = {
      balance: 'SECRET_BALANCE',
      walletAddress: 'SECRET_WALLET',
      apiKey: 'SECRET_KEY',
      extrinsic: 'SECRET_EXTRINSIC',
    };
    Object.assign(data, sensitive);
    Object.assign(data.assetIn, sensitive);
    Object.assign(data.assetOut, sensitive);
    Object.assign(data.plan, sensitive);
    Object.assign(data.plan.quote, sensitive);
    Object.assign(data.plan.quote.request, sensitive);
    Object.assign(data.plan.quote.amountInMeta, sensitive);
    Object.assign(data.plan.quote.amountInMeta.asset, sensitive);
    Object.assign(data.plan.network, sensitive);
    Object.assign(data.plan.fees[0], sensitive);
    Object.assign(data.plan.warnings[0], sensitive, { message: 'SECRET_PROVIDER_DIAGNOSTIC' });
    const report = publicReport(data, options, NOW);
    expect(JSON.stringify(report)).not.toContain('SECRET_');
    expect(report.warnings[0]).toEqual({
      code: 'HIGH_PRICE_IMPACT',
      severity: 'warning',
      message: 'The quote reports high price impact. Review the exact percentage.',
    });
    expect(publicAsset(data.assetIn)).toEqual({ address: XOR, symbol: 'XOR', decimals: 18 });
  });

  it('allows equivalent decimal formatting but detects a difference beyond Number precision', () => {
    const { data, options } = fixture();
    data.plan.quote.request.amount += '0';
    data.plan.quote.request.slippageTolerance = '0.5000';
    data.plan.quote.amountInMeta.value += '0';
    expect(publicReport(data, options, NOW).quote.amountIn).toBe(options.amount);
    data.plan.quote.request.amount = '1.000000000000000002';
    expect(() => publicReport(data, options, NOW)).toThrowError('INVALID_PLAN');
  });

  it('flags explicit noncanonical assets and critical execution constraints', () => {
    const { data, options } = fixture();
    data.assetOut.canonical = false;
    data.plan.warnings = [{ code: 'FEE_UNAVAILABLE', severity: 'critical', message: 'Untrusted' }];
    const report = publicReport(data, options, NOW);
    expect(report.assessment).toBe('quoted-with-critical-constraints');
    expect(report.warnings.map((warning: { code: string }) => warning.code)).toEqual([
      'FEE_UNAVAILABLE',
      'NON_CANONICAL_ASSET',
    ]);
  });

  it('reports selected distribution markets and exact legs while excluding private fields', () => {
    const { data, options } = fixture();
    const leg = {
      market: 'XYKPool',
      input: XOR,
      output: PSWAP,
      income: options.amount,
      outcome: '2.123456789012345678',
      fee: '0.003',
    };
    Object.assign(data.plan.quote, {
      distribution: [
        [
          { ...leg, wallet: 'SECRET_WALLET', provider: 'SECRET_PROVIDER' },
          { ...leg, market: 'OrderBook' },
        ],
      ],
      selectedSources: ['SECRET_PROVIDER'],
    });
    const report = publicReport(data, options, NOW);
    expect(report.quote.distribution).toEqual([[leg, { ...leg, market: 'OrderBook' }]]);
    expect(report.quote.selectedSources).toEqual(['XYKPool', 'OrderBook']);
    expect(report.quote.distributionFeeAsset).toBe('unspecified-by-public-api');
    expect(JSON.stringify(report)).not.toContain('SECRET_');
  });

  it.each([{ market: 'UntrustedPool' }, { input: '0x1234' }, { outcome: 'Infinity' }, { fee: '-0.01' }])(
    'rejects invalid distribution legs (%j)',
    (corruption) => {
      const { data, options } = fixture();
      Object.assign(data.plan.quote, {
        distribution: [
          [
            {
              market: 'XYKPool',
              input: XOR,
              output: PSWAP,
              income: options.amount,
              outcome: '2.123456789012345678',
              fee: '0.003',
              ...corruption,
            },
          ],
        ],
      });
      expect(() => publicReport(data, options, NOW)).toThrowError('INVALID_PLAN');
    }
  );

  it('rejects an empty distribution path and too many distribution paths', () => {
    const { data, options } = fixture();
    Object.assign(data.plan.quote, { distribution: [[]] });
    expect(() => publicReport(data, options, NOW)).toThrowError('INVALID_PLAN');
    const leg = {
      market: 'XYKPool',
      input: XOR,
      output: PSWAP,
      income: options.amount,
      outcome: '2.123456789012345678',
      fee: '0.003',
    };
    Object.assign(data.plan.quote, { distribution: Array.from({ length: 17 }, () => [leg]) });
    expect(() => publicReport(data, options, NOW)).toThrowError('INVALID_PLAN');
  });

  const corruptions: [string, (data: ReturnType<typeof fixture>['data']) => void][] = [
    [
      'executable plan',
      (data) => {
        data.plan.canExecute = true;
      },
    ],
    [
      'wallet-required plan',
      (data) => {
        data.plan.requiresWallet = true;
      },
    ],
    [
      'wrong request side',
      (data) => {
        data.plan.quote.request.side = 'output';
      },
    ],
    [
      'wrong request amount',
      (data) => {
        data.plan.quote.request.amount = '2';
      },
    ],
    [
      'wrong slippage',
      (data) => {
        data.plan.quote.request.slippageTolerance = '1';
      },
    ],
    [
      'wrong DEX policy',
      (data) => {
        data.plan.quote.request.dexId = '0';
      },
    ],
    [
      'wrong input fill amount',
      (data) => {
        data.plan.quote.amountIn = '1.000000000000000002';
      },
    ],
    [
      'bound exceeding quoted output',
      (data) => {
        data.plan.quote.minAmountOut = '2.123456789012345679';
      },
    ],
    [
      'zero output bound',
      (data) => {
        data.plan.quote.minAmountOut = '0';
      },
    ],
    [
      'missing codec evidence',
      (data) => {
        data.plan.quote.amountInMeta.codec = '';
      },
    ],
    [
      'mismatched codec asset',
      (data) => {
        data.plan.quote.amountInMeta.asset = { ...data.assetOut };
      },
    ],
    [
      'mismatched metadata decimals',
      (data) => {
        data.plan.quote.amountOutMeta.decimals = 6;
      },
    ],
    [
      'mismatched bound metadata',
      (data) => {
        data.plan.quote.minAmountOutMeta.value = '2.0';
      },
    ],
    [
      'noncanonical field omitted',
      (data) => {
        delete (data.assetIn as Partial<typeof data.assetIn>).canonical;
      },
    ],
    [
      'non-SORA genesis',
      (data) => {
        data.plan.network.genesisHash = `0x${'0'.repeat(64)}`;
      },
    ],
    [
      'invalid runtime',
      (data) => {
        data.plan.network.runtimeSpecVersion = 0;
      },
    ],
    [
      'unsafe block number',
      (data) => {
        data.plan.network.blockNumber = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      'expired quote',
      (data) => {
        data.plan.expiresAt = NOW;
      },
    ],
    [
      'future observation',
      (data) => {
        data.plan.plannedAt = NOW + 30_001;
      },
    ],
    [
      'unbounded lifetime',
      (data) => {
        data.plan.expiresAt = data.plan.plannedAt + 300_001;
      },
    ],
    [
      'wrong route origin',
      (data) => {
        data.plan.quote.route = [PSWAP, PSWAP];
      },
    ],
    [
      'unknown liquidity source',
      (data) => {
        data.plan.quote.liquiditySources = ['ExecuteSecretCode'];
      },
    ],
    [
      'unbounded route',
      (data) => {
        data.plan.quote.route = [XOR, ...Array(16).fill(XOR), PSWAP];
      },
    ],
    [
      'invalid digest',
      (data) => {
        data.plan.quote.quoteDigest = 'invalid';
      },
    ],
    [
      'nondecimal impact',
      (data) => {
        data.plan.quote.priceImpact = 'NaN';
      },
    ],
    [
      'missing fee',
      (data) => {
        data.plan.fees = [];
      },
    ],
    [
      'unknown fee source',
      (data) => {
        data.plan.fees[0].source = 'wallet-secret';
      },
    ],
    [
      'unknown warning code',
      (data) => {
        data.plan.warnings[0].code = 'PRIVATE_DIAGNOSTIC';
      },
    ],
  ];
  it.each(corruptions)('fails closed for %s', (_name, mutate) => {
    const { data, options } = fixture();
    mutate(data);
    expect(() => publicReport(data, options, NOW)).toThrowError('INVALID_PLAN');
  });

  it('rejects an exact-output maximum below the quoted input', () => {
    const { data, options } = fixture('output');
    data.plan.quote.maxAmountIn = '1.000000000000000000';
    expect(() => publicReport(data, options, NOW)).toThrowError('INVALID_PLAN');
  });

  it.each([
    { address: '0x1234', symbol: 'XOR', decimals: 18 },
    { address: XOR, symbol: 'XOR\n', decimals: 18 },
    { address: XOR, symbol: 'XOR', decimals: 31 },
    { address: XOR, symbol: 'XOR', decimals: 1.5 },
  ])('rejects invalid public metadata (%j)', (asset) => {
    expect(() => publicAsset(asset)).toThrowError('INVALID_PLAN');
  });
});

describe('trade-preflight pinned read-only agent calls', () => {
  it('calls only public capabilities, node readiness, balance-free resolution and unsigned planning', async () => {
    const { data, options } = fixture();
    const { page, agent } = agentPage(data);
    expect(await readPublicPlan(page, options)).toEqual(data);
    expect(agent.capabilities).toHaveBeenCalledExactlyOnceWith();
    expect(agent.ready).toHaveBeenCalledExactlyOnceWith({ requireNode: true, requireWallet: false, timeoutMs: 60_000 });
    expect(agent.resolveAsset.mock.calls).toEqual([
      [{ asset: { symbol: 'XOR' }, includeBalance: false }],
      [{ asset: { symbol: 'PSWAP' }, includeBalance: false }],
    ]);
    expect(agent.planSwap).toHaveBeenCalledExactlyOnceWith({
      assetIn: { address: XOR },
      assetOut: { address: PSWAP },
      amount: options.amount,
      side: 'input',
      slippageTolerance: '0.5',
      dexId: 'best',
      quoteTimeoutMs: 30_000,
    });
    for (const method of [agent.connectWallet, agent.prepareSwap, agent.executeSwap, agent.sign])
      expect(method).not.toHaveBeenCalled();
  });

  it('rejects an untrusted page before evaluating any site code', async () => {
    const { page, location, agent } = agentPage();
    location.href = 'https://evil.example/?polkaswap-agent=1#/swap';
    await expect(readPublicPlan(page, fixture().options)).rejects.toMatchObject({ code: 'UNTRUSTED_APP_LOCATION' });
    expect(page.evaluate).not.toHaveBeenCalled();
    expect(agent.capabilities).not.toHaveBeenCalled();
  });

  it.each(['before evaluation', 'readiness', 'input resolution', 'output resolution', 'planning'])(
    'rejects redirects during %s',
    async (stage) => {
      const { page, location, agent } = agentPage();
      const redirect = () => {
        location.href = 'https://evil.example/';
      };
      if (stage === 'before evaluation')
        page.evaluate.mockImplementationOnce(async (callback, args) => {
          redirect();
          return callback(args);
        });
      if (stage === 'readiness')
        agent.ready.mockImplementationOnce(async () => {
          redirect();
        });
      if (stage === 'input resolution')
        agent.resolveAsset.mockImplementationOnce(async () => {
          redirect();
          return fixture().data.assetIn;
        });
      if (stage === 'output resolution')
        agent.resolveAsset
          .mockImplementationOnce(async () => fixture().data.assetIn)
          .mockImplementationOnce(async () => {
            redirect();
            return fixture().data.assetOut;
          });
      if (stage === 'planning')
        agent.planSwap.mockImplementationOnce(async () => {
          redirect();
          return fixture().data.plan;
        });
      await expect(readPublicPlan(page, fixture().options)).rejects.toMatchObject({ code: 'UNTRUSTED_APP_LOCATION' });
      expect(agent.planSwap).toHaveBeenCalledTimes(stage === 'planning' ? 1 : 0);
      expect(agent.executeSwap).not.toHaveBeenCalled();
    }
  );

  it('rejects missing and unsupported agent APIs before resolution', async () => {
    const { page, agent } = agentPage();
    vi.stubGlobal('window', { location: { href: APP_URL } });
    await expect(readPublicPlan(page, fixture().options)).rejects.toMatchObject({ code: 'AGENT_API_UNAVAILABLE' });
    vi.stubGlobal('window', { location: { href: APP_URL }, PolkaswapAgent: agent });
    agent.capabilities.mockReturnValue({ version: 'v2' });
    await expect(readPublicPlan(page, fixture().options)).rejects.toMatchObject({ code: 'UNSUPPORTED_AGENT_VERSION' });
    expect(agent.ready).not.toHaveBeenCalled();
    expect(agent.resolveAsset).not.toHaveBeenCalled();
  });

  it('retains safe error codes while dropping credential-bearing diagnostics', async () => {
    const { page, agent } = agentPage();
    agent.planSwap.mockRejectedValueOnce({
      code: 'PATH_UNAVAILABLE',
      message: 'Bearer SECRET_TOKEN',
      url: 'https://user:password@rpc.example',
    });
    await expect(readPublicPlan(page, fixture().options)).rejects.toMatchObject({
      code: 'PATH_UNAVAILABLE',
      message: 'PATH_UNAVAILABLE',
    });
    agent.planSwap.mockRejectedValueOnce(new Error('Bearer SECRET_TOKEN'));
    await expect(readPublicPlan(page, fixture().options)).rejects.toMatchObject({
      code: 'PREFLIGHT_FAILED',
      message: 'PREFLIGHT_FAILED',
    });
  });
});

describe('trade-preflight owned browser lifecycle', () => {
  it('uses a fresh nonpersistent headless context and closes the browser after success', async () => {
    const runtime = browserRuntime();
    const report = await runPreflight(runtime.chromium, fixture().options, { now: () => NOW });
    expect(report.quote.minAmountOut).toBe('2.1');
    expect(runtime.chromium.launch).toHaveBeenCalledExactlyOnceWith({ headless: true, timeout: 30_000 });
    expect(runtime.browser.newContext).toHaveBeenCalledExactlyOnceWith();
    expect(runtime.context.newPage).toHaveBeenCalledOnce();
    expect(runtime.page.goto).toHaveBeenCalledExactlyOnceWith(APP_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    expect(runtime.browser.close).toHaveBeenCalledOnce();
  });

  it('closes its browser if navigation fails', async () => {
    const runtime = browserRuntime();
    runtime.page.goto.mockRejectedValueOnce(new Error('navigation failed'));
    await expect(runPreflight(runtime.chromium, fixture().options)).rejects.toThrow('navigation failed');
    expect(runtime.browser.close).toHaveBeenCalledOnce();
  });

  it('closes its browser if quote validation fails', async () => {
    const { data, options } = fixture();
    data.plan.network.genesisHash = `0x${'0'.repeat(64)}`;
    const runtime = browserRuntime(agentPage(data).page);
    await expect(runPreflight(runtime.chromium, options, { now: () => NOW })).rejects.toMatchObject({
      code: 'INVALID_PLAN',
    });
    expect(runtime.browser.close).toHaveBeenCalledOnce();
  });

  it('bounds a hung page lifecycle and closes its owned browser', async () => {
    vi.useFakeTimers();
    const runtime = browserRuntime();
    runtime.page.goto.mockImplementationOnce(() => new Promise(() => undefined));
    const result = runPreflight(runtime.chromium, fixture().options, { timeoutMs: 10 });
    const rejection = expect(result).rejects.toMatchObject({ code: 'PREFLIGHT_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(runtime.browser.close).toHaveBeenCalledOnce();
  });

  it('closes a browser that finishes launching after the overall timeout', async () => {
    vi.useFakeTimers();
    const runtime = browserRuntime();
    runtime.chromium.launch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(runtime.browser), 20))
    );
    const result = runPreflight(runtime.chromium, fixture().options, { timeoutMs: 10 });
    const rejection = expect(result).rejects.toMatchObject({ code: 'PREFLIGHT_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    await vi.advanceTimersByTimeAsync(10);
    expect(runtime.browser.close).toHaveBeenCalledOnce();
    expect(runtime.browser.newContext).not.toHaveBeenCalled();
  });
});

describe('trade-preflight separate runtime and CLI output', () => {
  it.each([undefined, '', 'relative/runtime'])(
    'requires an explicitly configured absolute runtime directory (%j)',
    (runtimeDir) => {
      expect(() => loadChromium(runtimeDir)).toThrowError('RUNTIME_UNAVAILABLE');
    }
  );

  it('loads only the installed runtime and pins its browser cache inside that directory', async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), 'polkaswap-preflight-runtime-unit-'));
    temporaryDirectories.push(runtimeDir);
    const packageDirectory = join(runtimeDir, 'node_modules', 'playwright');
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(runtimeDir, 'package.json'), '{}');
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: 'playwright', version: '1.63.0', main: 'index.cjs' })
    );
    await writeFile(
      join(packageDirectory, 'index.cjs'),
      'module.exports = { chromium: { fixtureMarker: "existing-runtime" } };\n'
    );
    expect(loadChromium(runtimeDir)).toEqual({ fixtureMarker: 'existing-runtime' });
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(join(runtimeDir, 'browsers'));
  });

  it('returns a fixed error when an absolute directory has no installed runtime', () => {
    expect(() => loadChromium('/nonexistent-polkaswap-runtime-unit-test')).toThrowError('RUNTIME_UNAVAILABLE');
  });

  it('refuses an installed runtime with the wrong Playwright version', async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), 'polkaswap-preflight-runtime-unit-'));
    temporaryDirectories.push(runtimeDir);
    const packageDirectory = join(runtimeDir, 'node_modules', 'playwright');
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(runtimeDir, 'package.json'), '{}');
    await writeFile(join(packageDirectory, 'package.json'), JSON.stringify({ name: 'playwright', version: '1.62.0' }));
    expect(() => loadChromium(runtimeDir)).toThrowError('RUNTIME_UNAVAILABLE');
  });

  it('prints setup-aware help without provisioning or invoking a runtime', async () => {
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await main(['--help'], {});
    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0][0]).toContain('Node 26. Usage:');
    expect(output.mock.calls[0][0]).toContain('Read-only, no wallets or executable intents.');
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(originalBrowserPath);
  });

  it('prints only a bounded fixed-code failure and never echoes wallet input', async () => {
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await main([...argumentsFor(), '--wallet', 'SECRET_WALLET'], {});
    expect(output).toHaveBeenCalledExactlyOnceWith(
      `${JSON.stringify({ ok: false, error: { code: 'INVALID_INPUT' }, canExecute: false })}\n`
    );
    expect(process.exitCode).toBe(1);
  });
});

describe('trade-preflight explicit runtime setup', () => {
  async function temporaryRuntime() {
    const directory = await mkdtemp(join(tmpdir(), 'polkaswap-preflight-setup-unit-'));
    temporaryDirectories.push(directory);
    return directory;
  }

  it('has no provisioning, output or environment effects when imported', async () => {
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const errorOutput = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const browserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    vi.resetModules();
    const imported = await import('../../../../skills/polkaswap-trade-preflight/scripts/setup.mjs');
    expect(imported.PLAYWRIGHT_VERSION).toBe('1.63.0');
    expect(setupExec).not.toHaveBeenCalled();
    expect(output).not.toHaveBeenCalled();
    expect(errorOutput).not.toHaveBeenCalled();
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(browserPath);
  });

  it.each([undefined, '', 'relative/runtime', '/', homedir()])(
    'rejects invalid paths and personal roots (%j)',
    (directory) => {
      expect(() => validateRuntimeDirectory(directory)).toThrowError('INVALID_RUNTIME_DIRECTORY');
    }
  );

  it('rejects the skill itself and its existing scripts directory', () => {
    const skillDirectory = fileURLToPath(new URL('../../../../skills/polkaswap-trade-preflight/', import.meta.url));
    expect(() => validateRuntimeDirectory(skillDirectory)).toThrowError('INVALID_RUNTIME_DIRECTORY');
    expect(() => validateRuntimeDirectory(join(skillDirectory, 'scripts'))).toThrowError('INVALID_RUNTIME_DIRECTORY');
  });

  it('rejects a symlink to a personal root', async () => {
    const parent = await temporaryRuntime();
    const alias = join(parent, 'home-alias');
    await symlink(homedir(), alias);
    expect(() => validateRuntimeDirectory(alias)).toThrowError('INVALID_RUNTIME_DIRECTORY');
  });

  it('accepts an empty separate directory and normalizes a new child path', async () => {
    const directory = await temporaryRuntime();
    expect(validateRuntimeDirectory(directory)).toBe(resolve(directory));
    expect(validateRuntimeDirectory(join(directory, 'new', '..', 'runtime'))).toBe(join(directory, 'runtime'));
    expect(await readdir(directory)).toEqual([]);
  });

  it('refuses unrelated entries without modifying them or starting a command', async () => {
    const directory = await temporaryRuntime();
    const unrelated = join(directory, 'notes.txt');
    await writeFile(unrelated, 'keep this file');
    const run = vi.fn();
    expect(() => setupRuntime(directory, { run, env: {} })).toThrowError('UNRELATED_RUNTIME_DIRECTORY');
    expect(run).not.toHaveBeenCalled();
    expect(await readFile(unrelated, 'utf8')).toBe('keep this file');
    expect(await readdir(directory)).toEqual(['notes.txt']);
  });

  it.each([
    ['unrelated name', { name: 'another-project', private: true }],
    ['public package', { name: 'polkaswap-preflight-runtime', private: false }],
    ['missing private flag', { name: 'polkaswap-preflight-runtime' }],
    ['unrelated scripts', { name: 'polkaswap-preflight-runtime', private: true, scripts: { preinstall: 'unrelated' } }],
    ['unrelated dependency', { name: 'polkaswap-preflight-runtime', private: true, dependencies: { other: '1.0.0' } }],
    [
      'floating version',
      { name: 'polkaswap-preflight-runtime', private: true, dependencies: { playwright: '^1.63.0' } },
    ],
    [
      'wrong exact version',
      { name: 'polkaswap-preflight-runtime', private: true, dependencies: { playwright: '1.62.0' } },
    ],
  ])('refuses a mismatched runtime manifest: %s', async (_name, manifest) => {
    const directory = await temporaryRuntime();
    const content = JSON.stringify(manifest);
    await writeFile(join(directory, 'package.json'), content);
    const run = vi.fn();
    expect(() => setupRuntime(directory, { run, env: {} })).toThrowError('UNRELATED_RUNTIME_DIRECTORY');
    expect(run).not.toHaveBeenCalled();
    expect(await readFile(join(directory, 'package.json'), 'utf8')).toBe(content);
  });

  it('fails closed for malformed and missing manifests without provisioning', async () => {
    const directory = await temporaryRuntime();
    await writeFile(join(directory, 'package.json'), '{malformed');
    const run = vi.fn();
    expect(() => setupRuntime(directory, { run, env: {} })).toThrow();
    await rm(join(directory, 'package.json'));
    await mkdir(join(directory, 'browsers'));
    expect(() => setupRuntime(directory, { run, env: {} })).toThrow();
    expect(run).not.toHaveBeenCalled();
  });

  it('accepts only runtime entries with a private matching pinned manifest', async () => {
    const directory = await temporaryRuntime();
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({
        name: 'polkaswap-preflight-runtime',
        private: true,
        dependencies: { playwright: PLAYWRIGHT_VERSION },
      })
    );
    await writeFile(join(directory, 'package-lock.json'), '{}');
    await mkdir(join(directory, 'node_modules'));
    await mkdir(join(directory, 'browsers'));
    expect(validateRuntimeDirectory(directory)).toBe(directory);
  });

  it('installs exactly the pinned runtime with ignored scripts and only its matching Chromium shell', async () => {
    const parent = await temporaryRuntime();
    const directory = join(parent, 'runtime');
    const env = { PATH: '/test/bin', FIXTURE_ENV: 'kept', PLAYWRIGHT_BROWSERS_PATH: '/previous/cache' };
    const run = vi.fn();
    const result = setupRuntime(directory, { run, env });
    expect(result).toEqual({
      runtimeDir: directory,
      playwrightVersion: '1.63.0',
      browsersPath: join(directory, 'browsers'),
    });
    expect(JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))).toEqual({
      name: 'polkaswap-preflight-runtime',
      private: true,
    });
    expect(run).toHaveBeenCalledTimes(2);
    const [npmCall, browserCall] = run.mock.calls;
    expect(npmCall[0]).toBe(process.platform === 'win32' ? 'npm.cmd' : 'npm');
    expect(npmCall[1]).toEqual(
      expect.arrayContaining([
        '--prefix',
        directory,
        'install',
        '--save-exact',
        'playwright@1.63.0',
        '--registry=https://registry.npmjs.org',
        '--ignore-scripts',
      ])
    );
    expect(npmCall[1]).not.toContain('--global');
    expect(npmCall[2]).toMatchObject({ cwd: directory, env });
    expect(npmCall[2]).not.toHaveProperty('shell');
    expect(browserCall[0]).toBe(process.execPath);
    expect(browserCall[1]).toEqual([
      join(directory, 'node_modules/playwright/cli.js'),
      'install',
      'chromium',
      '--only-shell',
    ]);
    expect(browserCall[2]).toMatchObject({
      cwd: directory,
      env: { ...env, PLAYWRIGHT_BROWSERS_PATH: join(directory, 'browsers') },
    });
    expect(browserCall[2]).not.toHaveProperty('shell');
    expect(env.PLAYWRIGHT_BROWSERS_PATH).toBe('/previous/cache');
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(originalBrowserPath);
    expect(setupExec).not.toHaveBeenCalled();
  });

  it('preserves an approved existing runtime manifest', async () => {
    const directory = await temporaryRuntime();
    const content = `${JSON.stringify({ name: 'polkaswap-preflight-runtime', private: true, dependencies: { playwright: '1.63.0' } }, null, 2)}\n`;
    await writeFile(join(directory, 'package.json'), content);
    setupRuntime(directory, { run: vi.fn(), env: {} });
    expect(await readFile(join(directory, 'package.json'), 'utf8')).toBe(content);
  });

  it('does not download a browser after the runtime installation fails', async () => {
    const directory = await temporaryRuntime();
    const run = vi.fn(() => {
      throw new Error('install failed');
    });
    expect(() => setupRuntime(directory, { run, env: {} })).toThrowError('install failed');
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toBe(process.platform === 'win32' ? 'npm.cmd' : 'npm');
  });

  it('prints setup help and fixed invalid-input diagnostics without running an installer', () => {
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const errorOutput = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    setupMain(['--help']);
    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0][0]).toContain('Downloads pinned Playwright 1.63.0');
    setupMain(['--wallet', 'SECRET_WALLET']);
    expect(errorOutput).toHaveBeenCalledOnce();
    expect(errorOutput.mock.calls[0][0]).toContain('PREFLIGHT_SETUP_FAILED:');
    expect(errorOutput.mock.calls[0][0]).not.toContain('SECRET_WALLET');
    expect(process.exitCode).toBe(1);
    expect(setupExec).not.toHaveBeenCalled();
  });
});
