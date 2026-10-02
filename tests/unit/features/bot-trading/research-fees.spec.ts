import { afterEach, describe, expect, it, vi } from 'vitest';
import { createResearchFeeLoader } from '@/features/bot-trading/research-fees';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import mainnetObservation from '../../../fixtures/bot-trading/mainnetFees20260914.json';
import mainnetCrossPairObservation from '../../../fixtures/bot-trading/mainnetCrossPairFees20260914.json';
import type { BotDefinition } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

const runtime = vi.hoisted(() => ({
  api: { connection: null as unknown, dex: { publicDexes: [] as Array<{ dexId: number }> } },
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: runtime.api }));

/** Network-free finalized fee observations with exact values deliberately different from old defaults. */
function harness() {
  const bot = botFixture();
  bot.assetIn = { ...XOR };
  bot.policy.feeAsset = { ...XOR };
  bot.strategy.amount = '10';
  const quote = vi.fn(async (currentBot: BotDefinition, _amountCodec?: string, _dexId?: number) =>
    currentBot.assetIn.address === XOR.address
      ? {
          dexId: 0,
          amountOutCodec: '200000',
          amountWithoutImpactCodec: '250000',
          fees: [{ assetAddress: XOR.address, amountCodec: '60000000000000000' }],
          route: [XOR.address, 'out'],
        }
      : {
          dexId: 1,
          amountOutCodec: '9800000000000000000',
          amountWithoutImpactCodec: '10000000000000000000',
          fees: [{ assetAddress: XOR.address, amountCodec: '200000000000000000' }],
          route: ['out', XOR.address],
        }
  );
  const context = {
    blockNumber: 27_642_519,
    blockHash: 'finalized-block',
    genesisHash: 'sora-genesis',
    endpoint: 'wss://ws.mof.sora.org',
    denominator: '100000000000000000000000000000000000000',
    assertCurrent: vi.fn(),
    quote,
    networkFee: vi.fn(async (currentBot: BotDefinition) =>
      currentBot.assetIn.address === XOR.address ? '100020612589707326' : '200000000000000000'
    ),
  };
  const loader = createResearchFeeLoader({ context: vi.fn(async () => context), now: () => 123_456 });
  return { bot, context, loader, settings: { slippagePercent: '0.5' } };
}

/** Deliberately fabricated provider responses for exact route-reconstruction edge cases; never production data. */
function intermediateHarness() {
  const h = harness();
  h.bot.assetIn = { ...h.bot.assetIn, address: 'test-val' };
  h.bot.assetOut = { ...h.bot.assetOut, address: 'test-pswap', decimals: 18 };
  h.context.quote.mockImplementation(async (bot: BotDefinition) => {
    const firstLeg = bot.assetOut.address === XOR.address;
    const secondLeg = bot.assetIn.address === XOR.address;
    const output = bot.assetOut.address === 'test-pswap' ? '1000' : '9.5';
    return {
      dexId: 0,
      amountOutCodec: toCodec(firstLeg ? '99.4' : output, 18),
      amountWithoutImpactCodec: toCodec(firstLeg ? '100' : output, 18),
      fees: [
        { assetAddress: XOR.address, amountCodec: toCodec(firstLeg ? '0.6' : secondLeg ? '0.5964' : '1.1964', 18) },
      ],
      route:
        firstLeg || secondLeg
          ? [bot.assetIn.address, bot.assetOut.address]
          : [bot.assetIn.address, XOR.address, bot.assetOut.address],
    };
  });
  return h;
}

/** Mock the real finalized-state adapter, including pinning and unsigned fee estimation. */
function finalizedRuntime(finalizedAt: () => number = Date.now) {
  const h = harness();
  const fakeEnvelope = {
    signFake: vi.fn(),
    toU8a: vi.fn(() => new Uint8Array([1, 2, 3])),
    signAndSend: vi.fn(),
  };
  const queryInfo = vi.fn(async () => ({ partialFee: { toString: () => '100020612589707326' } }));
  const chain = {
    isConnected: true,
    isReady: Promise.resolve(),
    genesisHash: { toString: () => 'genesis' },
    runtimeVersion: { specVersion: { toString: () => '486' } },
    rpc: {
      chain: {
        getFinalizedHead: vi.fn(async () => 'pinned-hash'),
        getHeader: vi.fn(async () => ({ number: { toNumber: () => 27_642_519 } })),
      },
      liquidityProxy: {
        quote: vi.fn(async (_dexId: number, assetIn: string, _assetOut?: string, _amount?: string) => ({
          isNone: false,
          unwrap: () => ({
            amount: { toString: () => (assetIn === XOR.address ? '200000' : '9800000000000000000') },
            amountWithoutImpact: { toString: () => (assetIn === XOR.address ? '250000' : '10000000000000000000') },
            fee: new Map([[XOR.address, assetIn === XOR.address ? '60000000000000000' : '200000000000000000']]),
            route: assetIn === XOR.address ? [XOR.address, 'out'] : ['out', XOR.address],
          }),
        })),
      },
    },
    at: vi.fn(async () => ({
      query: {
        denomination: { denominator: vi.fn(async () => h.context.denominator) },
        timestamp: { now: vi.fn(async () => finalizedAt().toString()) },
      },
      call: { transactionPaymentApi: { queryInfo } },
    })),
    tx: { liquidityProxy: { swap: vi.fn(() => fakeEnvelope) } },
  };
  runtime.api.connection = { api: chain, endpoint: 'wss://ws.mof.sora.org' };
  return { ...h, chain, fakeEnvelope, queryInfo };
}

afterEach(() => {
  vi.useRealTimers();
  runtime.api.connection = null;
  runtime.api.dex.publicDexes = [];
});

describe('live research fee loading', () => {
  it('uses the exact current network fee and route fee, including full finalized provenance', async () => {
    const h = harness();
    const fees = await h.loader.load(h.bot, h.settings);
    expect(fees).toMatchObject({
      networkFeeXor: '0.100020612589707326',
      networkFeeCodec: '100020612589707326',
      swapFeePercent: '0.600000000000000000',
      priceImpactPercent: '20.000000000000000000',
      sellNetworkFeeXor: '0.2',
      sellNetworkFeeCodec: '200000000000000000',
      sellSwapFeePercent: '2.000000000000000000',
      sellPriceImpactPercent: '2.000000000000000000',
      sellAmountIn: '2000',
      sellAmountOut: '9.8',
      sellDexId: 1,
      sellRoute: ['out', XOR.address],
      denominator: h.context.denominator,
      blockNumber: 27_642_519,
      amountIn: '10',
      amountOut: '2000',
      queriedAt: 123_456,
      expiresAt: 423_456,
      routeFees: [{ assetAddress: XOR.address, amount: '0.06', decimals: 18 }],
    });
    expect(h.context.quote).toHaveBeenCalledWith(h.bot, '10000000000000000000');
    expect(h.context.networkFee).toHaveBeenCalledWith(h.bot, expect.any(Object), '10000000000000000000', '199000');
    expect(h.context.quote).toHaveBeenCalledWith(
      expect.objectContaining({ assetIn: h.bot.assetOut, assetOut: h.bot.assetIn }),
      '200000'
    );
  });

  it('normalizes output fees against gross output, without mixing price impact into the fee', async () => {
    const h = harness();
    h.context.quote.mockResolvedValueOnce({
      dexId: 0,
      amountOutCodec: '99400',
      amountWithoutImpactCodec: '142000',
      fees: [{ assetAddress: 'out', amountCodec: '600' }],
      route: [XOR.address, 'out'],
    });
    const fees = await h.loader.load(h.bot, h.settings);
    expect(fees.swapFeePercent).toBe('0.600000000000000000');
    expect(fees.priceImpactPercent).toBe('30.000000000000000000');
    expect(fees.amountOut).toBe('994');
  });

  it.each([
    ['9007199254740992', '9007199254740993', '0.000000000000011103'],
    ['2', '3', '33.333333333333333334'],
    [(10n ** 60n - 1n).toString(), (10n ** 60n).toString(), '0.000000000000000001'],
    ['3', '2', '0.000000000000000000'],
    ['3', '3', '0.000000000000000000'],
  ])(
    'keeps exact conservative impact for output %s and impact-free output %s',
    async (output, impactFree, expected) => {
      const h = harness();
      const original = h.context.quote.getMockImplementation()!;
      h.context.quote.mockImplementation(async (bot, amount, dex) => ({
        ...(await original(bot, amount, dex)),
        amountOutCodec: output,
        amountWithoutImpactCodec: impactFree,
        fees: [],
      }));
      const fees = await h.loader.load(h.bot, h.settings);
      expect(fees.priceImpactPercent).toBe(expected);
      expect(fees.sellPriceImpactPercent).toBe(expected);
    }
  );

  it('keeps different directional impacts from fixed public collector quote numbers', async () => {
    const h = harness();
    const original = h.context.quote.getMockImplementation()!;
    h.bot.assetOut.decimals = 18;
    h.context.quote.mockImplementation(async (bot, amount, dex) => ({
      ...(await original(bot, amount, dex)),
      amountOutCodec: bot.assetIn.address === XOR.address ? '661161597342272927' : '4782946999499812607',
      amountWithoutImpactCodec: bot.assetIn.address === XOR.address ? '670399841453348146' : '4847742813323314754',
      fees: [],
    }));
    // Only the two output pairs are retained public observations; this harness's route, asset direction and fees are synthetic.
    const fees = await h.loader.load(h.bot, h.settings);
    expect(fees.priceImpactPercent).toBe('1.378020032201647067');
    expect(fees.sellPriceImpactPercent).toBe('1.336618222514203810');
    expect(fees.sellAmountIn).toBe('0.661161597342272927');
    expect(h.context.quote).toHaveBeenLastCalledWith(expect.any(Object), '661161597342272927');
  });

  it.each(['buy', 'sell'])(
    'rejects missing and malformed %s impact evidence rather than treating it as zero',
    async (direction) => {
      for (const field of ['amountOutCodec', 'amountWithoutImpactCodec'] as const) {
        for (const invalid of [undefined, '0', '-1', '01', '1.5', '1e18', 'NaN', '9'.repeat(121)]) {
          const h = harness();
          const original = h.context.quote.getMockImplementation()!;
          h.context.quote.mockImplementation(async (bot, amount, dex) => {
            const quote = await original(bot, amount, dex);
            if ((bot.assetIn.address === XOR.address) === (direction === 'buy')) {
              if (invalid === undefined) Reflect.deleteProperty(quote, field);
              else quote[field] = invalid;
            }
            return quote;
          });
          await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.quote');
          expect(h.context.networkFee).toHaveBeenCalledTimes(direction === 'buy' ? 0 : 1);
        }
      }
    }
  );

  it('retains price-impact data from the real adapter and refuses an omitted RPC impact-free amount', async () => {
    const h = finalizedRuntime();
    const fees = await createResearchFeeLoader().load(h.bot, h.settings);
    expect(fees.priceImpactPercent).toBe('20.000000000000000000');
    expect(fees.sellPriceImpactPercent).toBe('2.000000000000000000');
    const original = h.chain.rpc.liquidityProxy.quote.getMockImplementation()!;
    h.chain.rpc.liquidityProxy.quote.mockImplementation(async (...args) => {
      const response = await original(...args);
      const quote = response.unwrap();
      Reflect.deleteProperty(quote, 'amountWithoutImpact');
      return { ...response, unwrap: () => quote };
    });
    await expect(createResearchFeeLoader().load(h.bot, h.settings)).rejects.toThrow('bots.errors.quote');
    expect(h.fakeEnvelope.signAndSend).not.toHaveBeenCalled();
  });

  it('preserves the observed sub-wei ratio when normalizing a real SORA reverse quote', async () => {
    const h = harness();
    h.bot.assetOut.decimals = 18;
    h.context.quote.mockResolvedValueOnce({
      dexId: 0,
      amountOutCodec: toCodec(mainnetObservation.amountOut, 18),
      // This older fee fixture has no impact-free quote; the harness supplies an explicit synthetic value.
      amountWithoutImpactCodec: toCodec(mainnetObservation.amountOut, 18),
      fees: mainnetObservation.routeFees.map((fee) => ({ ...fee, assetAddress: XOR.address })),
      route: [XOR.address, 'out'],
    });
    h.context.quote.mockResolvedValueOnce({
      dexId: 0,
      amountOutCodec: toCodec(mainnetObservation.sellAmountOut, 18),
      amountWithoutImpactCodec: toCodec(mainnetObservation.sellAmountOut, 18),
      fees: mainnetObservation.sellRouteFees.map((fee) => ({ ...fee, assetAddress: XOR.address })),
      route: ['out', XOR.address],
    });
    const fees = await h.loader.load(h.bot, h.settings);
    expect(fees.swapFeePercent).toBe(mainnetObservation.swapFeePercent);
    expect(fees.sellSwapFeePercent).toBe(mainnetObservation.sellSwapFeePercent);
  });

  it('reconstructs intermediary XOR fees on both directions without an extra conversion swap', async () => {
    const h = intermediateHarness();
    const fees = await h.loader.load(h.bot, h.settings);
    expect(fees.swapFeePercent).toBe('1.196400000000000000');
    expect(fees.sellSwapFeePercent).toBe('1.196400000000000000');
    expect(fees.routeFees).toEqual([
      {
        assetAddress: XOR.address,
        amountCodec: '1196400000000000000',
        amount: '1.1964',
        decimals: 18,
        conversion: {
          method: 'route-intermediate-ratio',
          capitalAssetAddress: 'test-val',
          convertedAmount: '0.119640000000000000',
          blockNumber: h.context.blockNumber,
          blockHash: h.context.blockHash,
          grossIntermediateXorCodec: '100000000000000000000',
          netIntermediateAfterFeesXorCodec: '98803600000000000000',
          firstLegFeeCodec: '600000000000000000',
          secondLegFeeCodec: '596400000000000000',
        },
      },
    ]);
    expect(fees.sellRouteFees[0].conversion).toMatchObject({
      capitalAssetAddress: 'test-pswap',
      convertedAmount: '11.964000000000000000',
      blockHash: fees.blockHash,
    });
    expect(
      h.context.quote.mock.calls.map(([bot, amount, dex]) => [bot.assetIn.address, bot.assetOut.address, amount, dex])
    ).toEqual([
      ['test-val', 'test-pswap', toCodec('10', 18), undefined],
      ['test-val', XOR.address, toCodec('10', 18), 0],
      [XOR.address, 'test-pswap', toCodec('99.4', 18), 0],
      ['test-pswap', 'test-val', toCodec('1000', 18), undefined],
      ['test-pswap', XOR.address, toCodec('1000', 18), 0],
      [XOR.address, 'test-val', toCodec('99.4', 18), 0],
    ]);
    expect(h.context.networkFee).toHaveBeenCalledTimes(2);
  });

  it('reproduces actual finalized VAL/PSWAP route fees and the exact forward-output reverse notional', async () => {
    const h = harness();
    const [buy, sell] = mainnetCrossPairObservation.rows;
    const recordedXor = buy.full.route[1];
    const address = (value: string) => (value === recordedXor ? XOR.address : value);
    h.bot.assetIn = { ...h.bot.assetIn, address: buy.full.route[0] };
    h.bot.assetOut = { ...h.bot.assetOut, address: buy.full.route[2], decimals: 18 };
    h.context.blockHash = mainnetCrossPairObservation.blockHash;
    h.context.blockNumber = mainnetCrossPairObservation.blockNumber;
    // Only these route observations are real captured data; the harness supplies separate mock network fees.
    for (const row of [buy, sell]) {
      for (const quote of [row.full, row.first, row.second]) {
        h.context.quote.mockResolvedValueOnce({
          dexId: 0,
          amountOutCodec: quote.amount,
          amountWithoutImpactCodec: quote.amount_without_impact,
          fees: Object.entries(quote.fee).map(([asset, amountCodec]) => ({
            assetAddress: address(asset),
            amountCodec,
          })),
          route: quote.route.map(address),
        });
      }
    }
    const fees = await h.loader.load(h.bot, h.settings);
    // The captured diagnostic truncated its derived ratio; the loader rounds the raw integer ratio upward.
    expect(fees.swapFeePercent).toBe('1.196400000000002407');
    expect(fees.sellSwapFeePercent).toBe('1.196400000000008178');
    expect(toCodec(fees.sellAmountIn, 18)).toBe(sell.amountIn);
    expect(toCodec(fees.sellAmountOut, 18)).toBe(sell.full.amount);
    for (const [fee, row] of [
      [fees.routeFees[0], buy],
      [fees.sellRouteFees[0], sell],
    ] as const) {
      expect(fee.amountCodec).toBe(row.full.fee[recordedXor as keyof typeof row.full.fee]);
      expect(fee.conversion).toMatchObject({
        blockHash: mainnetCrossPairObservation.blockHash,
        blockNumber: mainnetCrossPairObservation.blockNumber,
        grossIntermediateXorCodec: row.grossIntermediateXorCodec,
        netIntermediateAfterFeesXorCodec: row.netIntermediateAfterFeesXorCodec,
      });
    }
    expect(h.context.quote.mock.calls.map(([, amount]) => amount)).toEqual([
      buy.amountIn,
      buy.amountIn,
      buy.first.amount,
      sell.amountIn,
      sell.amountIn,
      sell.first.amount,
    ]);
  });

  it('rounds tiny intermediate fee ratios up once instead of truncating them to a free swap', async () => {
    const h = intermediateHarness();
    const validQuote = h.context.quote.getMockImplementation()!;
    h.context.quote.mockImplementation(async (bot, amount, dex) => {
      const quote = await validQuote(bot, amount, dex);
      if (bot.assetIn.address === 'test-val') {
        quote.fees[0].amountCodec = '1';
        if (bot.assetOut.address === XOR.address) quote.amountOutCodec = (10n ** 60n).toString();
      } else if (bot.assetIn.address === XOR.address && bot.assetOut.address === 'test-pswap') {
        quote.fees[0].amountCodec = '0';
      }
      return quote;
    });
    const fees = await h.loader.load(h.bot, h.settings);
    expect(fees.swapFeePercent).toBe('0.000000000000000001');
    expect(fees.routeFees[0].conversion?.convertedAmount).toBe('0.000000000000000001');
  });

  it.each([
    'full route',
    'first route',
    'first dex',
    'second output',
    'fee sum',
    'fee asset',
    'zero intermediate',
    'excess fee',
  ])('refuses unverified intermediary normalization: %s', async (failure) => {
    const h = intermediateHarness();
    const validQuote = h.context.quote.getMockImplementation()!;
    h.context.quote.mockImplementation(async (bot, amount, dex) => {
      const quote = await validQuote(bot, amount, dex);
      const first = bot.assetIn.address === 'test-val' && bot.assetOut.address === XOR.address;
      const second = bot.assetIn.address === XOR.address && bot.assetOut.address === 'test-pswap';
      if (failure === 'full route' && bot === h.bot) quote.route = ['test-val', 'test-pswap'];
      if (failure === 'first route' && first) quote.route = ['test-val', 'test-other', XOR.address];
      if (failure === 'first dex' && first) quote.dexId = 1;
      if (failure === 'second output' && second) quote.amountOutCodec = (BigInt(quote.amountOutCodec) + 1n).toString();
      if (failure === 'fee sum' && second)
        quote.fees[0].amountCodec = (BigInt(quote.fees[0].amountCodec) + 1n).toString();
      if (failure === 'fee asset' && second) quote.fees[0].assetAddress = 'test-unknown-fee';
      if (failure === 'zero intermediate' && first) quote.amountOutCodec = '0';
      if (failure === 'excess fee' && first) quote.amountOutCodec = '1';
      return quote;
    });
    await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.quote');
  });

  it('refuses unsupported third-asset conversions and unavailable or malformed network fees', async () => {
    const h = harness();
    h.context.quote.mockResolvedValueOnce({
      dexId: 0,
      amountOutCodec: '200000',
      amountWithoutImpactCodec: '250000',
      fees: [{ assetAddress: 'third-asset', amountCodec: '100' }],
      route: [XOR.address, 'third-asset', 'out'],
    });
    await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.quote');
    h.context.networkFee.mockResolvedValueOnce('0');
    await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.quote');
    h.context.networkFee.mockResolvedValueOnce('0.1');
    await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.amount');
  });

  it('fails closed on disconnected, replaced, timed-out, and disposed requests', async () => {
    vi.useFakeTimers();
    const disconnected = expect(
      createResearchFeeLoader().load(harness().bot, { slippagePercent: '0.5' })
    ).rejects.toThrow('bots.errors.quote');
    await vi.advanceTimersByTimeAsync(25_000);
    await disconnected;
    vi.useRealTimers();
    const h = harness();
    h.context.assertCurrent.mockImplementationOnce(() => {
      throw new Error('bots.errors.stale');
    });
    await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.stale');
    h.context.networkFee.mockImplementationOnce(async () => {
      h.loader.clear();
      return '100020612589707326';
    });
    await expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.stale');
    vi.useFakeTimers();
    h.context.networkFee.mockImplementationOnce(() => new Promise(() => undefined));
    const pending = expect(h.loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.quote');
    await vi.advanceTimersByTimeAsync(25_000);
    await pending;
  });

  it('allows delayed finalized state only for explicitly opted-in historical simulation', async () => {
    vi.useFakeTimers();
    const now = Date.UTC(2026, 8, 15, 14, 36);
    vi.setSystemTime(now);
    const finalizedAt = now - 80 * 60_000;
    const h = finalizedRuntime(() => finalizedAt);
    const loader = createResearchFeeLoader();
    await expect(loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.stale');
    await expect(loader.load(h.bot, h.settings, { allowHistoricalFinalizedState: false })).rejects.toThrow(
      'bots.errors.stale'
    );
    expect(h.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    const fees = await loader.load(h.bot, h.settings, { allowHistoricalFinalizedState: true });
    expect(fees).toMatchObject({
      finalizedAt,
      queriedAt: now,
      expiresAt: now + 300_000,
      blockHash: 'pinned-hash',
      networkFeeXor: '0.100020612589707326',
      swapFeePercent: '0.600000000000000000',
    });
    expect(h.chain.at).toHaveBeenCalledWith('pinned-hash');
    const quoteCalls = h.chain.rpc.liquidityProxy.quote.mock.calls as unknown[][];
    expect(quoteCalls.every((args) => args[7] === 'pinned-hash')).toBe(true);
    expect(h.queryInfo).toHaveBeenCalledTimes(2);
    expect(h.fakeEnvelope.signAndSend).not.toHaveBeenCalled();
    await expect(loader.load(h.bot, h.settings)).rejects.toThrow('bots.errors.stale');
  });

  it.each([false, true])(
    'rejects invalid or future finalized timestamps with historical mode=%s',
    async (historical) => {
      vi.useFakeTimers();
      const now = Date.UTC(2026, 8, 15, 14, 36);
      vi.setSystemTime(now);
      for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.5, now + 30_001]) {
        const h = finalizedRuntime(() => value);
        await expect(
          createResearchFeeLoader().load(h.bot, h.settings, { allowHistoricalFinalizedState: historical })
        ).rejects.toThrow('bots.errors.stale');
        expect(h.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
        expect(h.fakeEnvelope.signAndSend).not.toHaveBeenCalled();
      }
    }
  );

  it('queries the current runtime at the finalized block without wallet access or submission', async () => {
    const h = harness();
    const { chain, fakeEnvelope, queryInfo } = finalizedRuntime();
    const fees = await createResearchFeeLoader().load(h.bot, h.settings);
    expect(fees.networkFeeXor).toBe('0.100020612589707326');
    expect(chain.rpc.liquidityProxy.quote).toHaveBeenCalledWith(
      0,
      XOR.address,
      'out',
      '10000000000000000000',
      'WithDesiredInput',
      [],
      'Disabled',
      'pinned-hash'
    );
    expect(chain.at).toHaveBeenCalledWith('pinned-hash');
    expect(queryInfo).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 3);
    expect(fakeEnvelope.signFake).toHaveBeenCalledTimes(2);
    expect(fakeEnvelope.signAndSend).not.toHaveBeenCalled();
    const cross = intermediateHarness();
    const singlePairRpc = chain.rpc.liquidityProxy.quote.getMockImplementation()!;
    chain.rpc.liquidityProxy.quote.mockClear();
    chain.rpc.liquidityProxy.quote.mockImplementation(async (dexId, assetIn, assetOut, amount) => {
      const quote = await cross.context.quote(
        {
          ...cross.bot,
          assetIn: { ...cross.bot.assetIn, address: assetIn },
          assetOut: { ...cross.bot.assetOut, address: assetOut! },
        },
        amount,
        dexId
      );
      return {
        isNone: false,
        unwrap: () => ({
          amount: { toString: () => (BigInt(quote.amountOutCodec) - BigInt(dexId)).toString() },
          amountWithoutImpact: { toString: () => quote.amountWithoutImpactCodec },
          fee: new Map(quote.fees.map((fee) => [fee.assetAddress, fee.amountCodec])),
          route: quote.route,
        }),
      };
    });
    runtime.api.dex.publicDexes = [{ dexId: 1 }];
    const crossFees = await createResearchFeeLoader().load(cross.bot, cross.settings);
    expect(crossFees.routeFees[0].conversion).toMatchObject({ blockHash: 'pinned-hash', blockNumber: 27_642_519 });
    expect(crossFees.swapFeePercent).toBe('1.196400000000000000');
    const rpcCalls = chain.rpc.liquidityProxy.quote.mock.calls as unknown[][];
    expect(rpcCalls).toHaveLength(8);
    expect(rpcCalls.every((args) => args[7] === 'pinned-hash')).toBe(true);
    const legs = rpcCalls.filter((args) => args[1] === XOR.address || args[2] === XOR.address);
    expect(legs).toHaveLength(4);
    expect(legs.every((args) => args[0] === 0)).toBe(true);
    expect(fakeEnvelope.signFake).toHaveBeenCalledTimes(4);
    expect(fakeEnvelope.signAndSend).not.toHaveBeenCalled();
    runtime.api.dex.publicDexes = [];
    chain.rpc.liquidityProxy.quote.mockImplementation(singlePairRpc);
    vi.useFakeTimers();
    runtime.api.connection = null;
    const delayed = createResearchFeeLoader().load(h.bot, h.settings);
    setTimeout(() => {
      runtime.api.connection = { api: chain, endpoint: 'wss://ws.mof.sora.org' };
    }, 400);
    await vi.advanceTimersByTimeAsync(600);
    await expect(delayed).resolves.toMatchObject({ networkFeeXor: '0.100020612589707326' });
    let metadataReady = false;
    let releaseMetadata!: () => void;
    chain.isReady = new Promise<void>((resolve) => {
      releaseMetadata = resolve;
    });
    Object.defineProperty(chain, 'genesisHash', {
      configurable: true,
      get: () => {
        if (!metadataReady) throw new Error('ApiPromise metadata is not ready');
        return { toString: () => 'genesis' };
      },
    });
    const quotesBeforeMetadata = chain.rpc.liquidityProxy.quote.mock.calls.length;
    const metadataPending = createResearchFeeLoader().load(h.bot, h.settings);
    await vi.advanceTimersByTimeAsync(200);
    expect(chain.rpc.liquidityProxy.quote).toHaveBeenCalledTimes(quotesBeforeMetadata);
    metadataReady = true;
    releaseMetadata();
    await expect(metadataPending).resolves.toMatchObject({ networkFeeXor: '0.100020612589707326' });
    runtime.api.connection = null;
  });
});
