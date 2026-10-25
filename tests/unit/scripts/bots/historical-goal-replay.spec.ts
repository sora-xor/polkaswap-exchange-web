import { describe, expect, it, vi } from 'vitest';
import {
  replayHistoricalGoal,
  type HistoricalGoalReplayInput,
  type HistoricalGoalQuoteEvidenceProvider,
} from '../../../../scripts/bots/historical-goal-replay';
import { planHistoricalGoalSchedule } from '../../../../scripts/bots/historical-goal-schedule';
import { planHistoricalGoalTerminal } from '../../../../scripts/bots/historical-goal-terminal';
import {
  createHistoricalExecutionCodec,
  decodeHistoricalFeeDetailsScale,
} from '../../../../scripts/bots/historical-execution-codec';
import {
  HISTORICAL_GOAL_FEE_POLICY,
  createHistoricalGoalFeeCodec,
} from '../../../../scripts/bots/historical-goal-fee-codec';
import { createHistoricalFeeMetadataFixture, feeBytes, hex } from './fixtures/historical-goal-bound-fee-fixture';
import type { HistoricalClockBlock } from '../../../../scripts/bots/historical-execution-clock';
import type { HistoricalGoalPendingOrder } from '../../../../scripts/bots/historical-goal-signals';
import type { StrategyConfig } from '../../../../src/features/bot-trading/types';
import { botFixture } from '../../features/bot-trading/fixtures';

const HOUR = 3_600_000,
  START = 500_000 * HOUR,
  DAY = 24 * HOUR;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const UNIT = 10n ** 18n,
  FEE = '100000000000000';
const units = (n: number) => String(BigInt(n) * UNIT);
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const block = (offset: number): HistoricalClockBlock => ({
  height: 1000 + offset / 6000,
  hash: hash(1000 + offset / 6000),
  parentHash: hash(999 + offset / 6000),
  timestampMs: START + offset,
});
const binding = (at: HistoricalClockBlock) => ({
  genesisHash: GENESIS,
  blockHash: at.hash,
  metadataSha256: 'a'.repeat(64),
  metadataVersion: 14,
  runtimeVersion: { specVersion: 130, transactionVersion: 130 },
});
function pool(at: HistoricalClockBlock, xor = units(1000)) {
  const kusd = units(1000);
  return {
    binding: binding(at),
    state: { timestampMs: at.timestampMs, denominator: '1' },
    basis: 'direct-pool-reserve-ratio',
    status: 'present',
    accounts: { reservesAccountId: hash(50000), feesAccountId: hash(50001) },
    pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
    reserves: { kusdCodec: kusd, xorCodec: xor },
    marks: {
      xorPerKusd: { numeratorCodec: xor, denominatorCodec: kusd },
      kusdPerXor: { numeratorCodec: kusd, denominatorCodec: xor },
    },
    observedFill: false,
    transactionSubmitted: false,
  };
}
const mark = (at: HistoricalClockBlock, xor = units(1000)) => ({
  timestampMs: at.timestampMs,
  blockHash: at.hash,
  kusdReserveCodec: units(1000),
  xorReserveCodec: xor,
});

function fixture(
  options: { strategy?: Partial<StrategyConfig>; cadenceMs?: number; market?: (offset: number) => string } = {}
) {
  const market = options.market ?? (() => units(1000));
  const bot = botFixture();
  bot.assetIn = { address: KUSD, symbol: 'KUSD', decimals: 18 };
  bot.assetOut = { address: XOR, symbol: 'XOR', decimals: 18 };
  bot.strategy = { ...bot.strategy, amount: '2.5', intervalMs: 1000, ...options.strategy };
  bot.policy = {
    maxTradeCodec: { [KUSD]: units(10), [XOR]: units(10) },
    slippagePercent: '0.5',
    maxPriceImpactPercent: '1',
    feeAsset: bot.assetOut,
    feeBudgetCodec: units(1),
    sessionDurationMs: DAY,
  };
  bot.portfolio = {
    initial: { [KUSD]: units(10), [XOR]: units(1) },
    holdings: { [KUSD]: units(10), [XOR]: units(1) },
    feesPaidCodec: '0',
    trades: 0,
  };
  bot.goal = {
    title: 'Grow XOR',
    targetReturnPercent: '5',
    maxLossPercent: '5',
    durationMs: DAY,
    valuationAsset: 'output',
    lossMetric: 'drawdown',
  };
  const episode = { startedAtMs: START, endedAtMs: START + DAY };
  const signals = Array.from({ length: 24 }, (_, i) => ({
    completedAtMs: START + i * HOUR,
    closing: block(i * HOUR - 6000),
    successor: block(i * HOUR),
  }));
  const schedule = planHistoricalGoalSchedule(
    signals,
    {
      version: 1,
      purpose: 'development',
      availability: 'assumed-after-successor-block',
      signalDelayMs: 60_000,
      executionDelayMs: 120_000,
      maximumExecutionLagMs: 60_000,
    },
    episode,
    { cadenceMs: options.cadenceMs ?? HOUR, maximumLagMs: Math.min(12_000, (options.cadenceMs ?? HOUR) - 1) }
  );
  const observed = block(DAY - 6000),
    successor = { ...block(DAY), timestampMs: START + DAY + 6000 };
  const input: HistoricalGoalReplayInput = {
    bot,
    schedule,
    terminalPolicy: planHistoricalGoalTerminal(episode, 12_000),
    expectedDenominator: '1',
    warmup: [],
    candles: Array.from({ length: 24 }, (_, i) => ({ timestamp: START + i * HOUR, close: '1' })),
    valuations: schedule.valuations.slice(0, -1).map((request) => {
      const offset = request.targetAtMs - START,
        at = block(offset),
        xor = market(offset);
      return {
        status: 'available',
        targetAtMs: request.targetAtMs,
        previous: block(offset - 6000),
        block: at,
        mark: mark(at, xor),
        poolEvidence: pool(at, xor),
      };
    }),
    executions: schedule.executions.map((plan, signalIndex) => ({
      status: 'available',
      signalIndex,
      previous: block(plan.targetExecutionAtMs - START - 6000),
      execution: block(plan.targetExecutionAtMs - START),
    })),
    terminal: {
      status: 'available',
      observed,
      successor,
      mark: mark(observed, market(DAY - 6000)),
      poolEvidence: pool(observed, market(DAY - 6000)),
    },
    scenario: 'minimum-output-success',
  };
  return { input, market };
}

/** Full synthetic reader projection, not a mocked fill/admission function. */
function quote(
  order: HistoricalGoalPendingOrder,
  at: HistoricalClockBlock,
  previous: HistoricalClockBlock,
  xor = units(1000),
  options: { fee?: string; output?: string; without?: string; unavailable?: boolean } = {}
) {
  const amount = options.output ?? order.amountInCodec,
    fee = options.fee ?? FEE;
  const b = binding(at),
    request = {
      assetIn: order.assetIn,
      assetOut: order.assetOut,
      amountInCodec: order.amountInCodec,
      expectedDenominator: '1',
      block: { hash: at.hash, height: at.height },
    };
  const context = {
    genesisHash: GENESIS,
    block: request.block,
    parentHash: previous.hash,
    expectedDenominator: '1',
    state: { timestampMs: at.timestampMs, denominator: '1' },
    codecBinding: b,
  };
  if (options.unavailable)
    return { quoteEvidence: { kind: 'historical-quote-unavailable', request, context }, poolEvidence: pool(at, xor) };
  const bytes = Buffer.alloc(65);
  bytes[0] = 1;
  bytes.writeBigUInt64LE(BigInt(fee), 1);
  return {
    quoteEvidence: {
      kind: 'hypothetical-historical-execution-estimate',
      request,
      context,
      quote: {
        amountOutCodec: amount,
        amountWithoutImpactCodec: options.without ?? amount,
        poolFeeCodec: '10000',
        dexId: 0,
        liquiditySource: 'XYKPool',
        slippageBps: 50,
        feeAssetAddress: XOR,
        route: [order.assetIn, order.assetOut],
      },
      envelope: {
        ...b,
        assetIn: order.assetIn,
        assetOut: order.assetOut,
        amountInCodec: order.amountInCodec,
        minimumCodec: String((BigInt(amount) * 995n) / 1000n),
        feeAssetAddress: XOR,
        estimation: {
          signature: 'fake-placeholder-only',
          nonce: '0',
          tip: '0',
          era: 'immortal',
          feeExtension: 'ChargeTransactionPayment',
        },
      },
      fees: {
        assetId: XOR,
        info: { partialFeeCodec: fee },
        details: decodeHistoricalFeeDetailsScale(`0x${bytes.toString('hex')}`),
      },
      observedFill: false,
      transactionSubmitted: false,
    },
    poolEvidence: pool(at, xor),
  };
}
const provider = (market = (_offset: number) => units(1000), options = {}) =>
  vi.fn<HistoricalGoalQuoteEvidenceProvider>(async (order, clock) =>
    quote(order, clock.execution, clock.previous, market(clock.execution.timestampMs - START), options)
  );
const ratioEq = (value: { numerator: string; denominator: string }, n: bigint, d = 1n) =>
  expect(BigInt(value.numerator) * d).toBe(n * BigInt(value.denominator));

/** Both joins use actual SDK envelopes and SCALE fee decoders with wholly invented metadata and values. */
function boundProvider(boundFeeCodec = String(2n * BigInt(FEE))) {
  const metadata = createHistoricalFeeMetadataFixture();
  return vi.fn<HistoricalGoalQuoteEvidenceProvider>(async (order, clock) => {
    const identity = { ...metadata.identity, blockHash: clock.execution.hash };
    const codec = createHistoricalExecutionCodec(identity);
    const request = {
      assetIn: order.assetIn,
      assetOut: order.assetOut,
      amountInCodec: order.amountInCodec,
      quotedAmountOutCodec: order.amountInCodec,
    };
    const base = quote(order, clock.execution, clock.previous);
    const quoteEvidence = {
      ...base.quoteEvidence,
      context: { ...base.quoteEvidence.context, codecBinding: codec.binding },
      envelope: codec.buildSwapEnvelope(request),
    };
    const envelope = createHistoricalGoalFeeCodec(identity).buildBoundSwapEnvelope(request, {
      blockNumber: clock.execution.height,
    });
    return {
      quoteEvidence,
      poolEvidence: { ...base.poolEvidence, binding: codec.binding },
      boundFee: {
        source: { identity, blockNumber: clock.execution.height, request, quoteEvidence },
        receipt: {
          version: 1,
          kind: 'historical-goal-bound-fee-receipt',
          envelope,
          feeAssetAddress: XOR,
          queries: {
            info: {
              method: 'state_call',
              params: ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, clock.execution.hash],
              resultHex: hex(
                metadata.registry
                  .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: boundFeeCodec })
                  .toU8a()
              ),
            },
            details: {
              method: 'state_call',
              params: ['TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex, clock.execution.hash],
              resultHex: feeBytes(BigInt(boundFeeCodec), 0, 0),
            },
          },
        },
      },
    };
  });
}

describe('ordered hypothetical goal replay', () => {
  it('consumes24signals, quotes only funded partial orders and preserves the unchanged benchmark through terminalT−6s', async () => {
    const { input } = fixture(),
      reader = provider();
    const result = await replayHistoricalGoal(input, reader);
    expect(result.status).toBe('complete');
    expect(result.protocol).toBe('goal-ordered-replay-v3-development');
    expect(result).not.toHaveProperty('feePolicy');
    expect(result.coverage.signalsConsumed).toBe(24);
    expect(reader).toHaveBeenCalledTimes(4);
    expect(result.terminal!.bot.portfolio.trades).toBe(4);
    expect(result.terminal!.bot.portfolio.holdings[KUSD]).toBe('0');
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe(String(4n * BigInt(FEE)));
    expect(result.benchmarkTerminal!.bot.portfolio).toEqual(input.bot.portfolio);
    ratioEq(result.benchmarkTerminal!.latestValue, 11n * UNIT);
    expect(result.terminal!.accountingAtMs).toBe(START + DAY);
    expect(result.terminal!.observedAtMs).toBe(START + DAY - 6000);
    expect(result.events.filter((e) => e.kind === 'signal')).toHaveLength(24);
    expect(result.observedFill).toBe(false);
    expect(result.transactionSubmitted).toBe(false);
    expect(Object.isFrozen(result.events)).toBe(true);
    expect(input.bot.portfolio.trades).toBe(0);
  });

  it('preflights every mandatory minute valuation and terminal row before any quote, retaining incomplete targets', async () => {
    for (const missing of ['valuation', 'terminal'] as const) {
      const { input } = fixture({ cadenceMs: 60_000 }),
        reader = provider();
      if (missing === 'valuation')
        input.valuations = input.valuations.map((row, i) =>
          i === 500
            ? { status: 'unavailable' as const, targetAtMs: row.targetAtMs, reason: 'unavailable' as const }
            : row
        );
      else input.terminal = { status: 'unavailable', reason: 'unavailable' };
      const result = await replayHistoricalGoal(input, reader);
      expect(result.status).toBe('incomplete');
      expect(reader).not.toHaveBeenCalled();
      expect(result.coverage.signalsConsumed).toBe(0);
      expect(result.terminal).toBeUndefined();
      expect(result.diagnostics[0].reason).toBe(
        missing === 'valuation' ? 'valuation-unavailable' : 'terminal-unavailable'
      );
    }
  });

  it('rejects duplicate, absent, wrong-boundary or contradictory valuation metadata before quotes', async () => {
    const transforms: ((input: HistoricalGoalReplayInput) => void)[] = [
      (i) => {
        i.valuations = i.valuations.slice(1);
      },
      (i) => {
        i.valuations = i.valuations.map((r, n) => (n === 1 ? i.valuations[0] : r));
      },
      (i) => {
        const r = i.valuations[1];
        if (r.status === 'available') r.mark = { ...r.mark, blockHash: hash(99999) };
      },
      (i) => {
        const r = i.valuations[1];
        if (r.status === 'available') (r.poolEvidence as ReturnType<typeof pool>).state.denominator = '2';
      },
      (i) => {
        if (i.terminal.status === 'available')
          i.terminal.mark = { ...i.terminal.mark, timestampMs: i.terminal.mark.timestampMs + 1000 };
      },
      (i) => {
        if (i.terminal.status === 'available') i.terminal.successor.parentHash = hash(99999);
      },
    ];
    for (const change of transforms) {
      const { input } = fixture(),
        reader = provider();
      change(input);
      await expect(replayHistoricalGoal(input, reader)).rejects.toThrow();
      expect(reader).not.toHaveBeenCalled();
    }
  });

  it('marks before same-time decisions and cancels a pending order on the intervening loss without quoting or charging', async () => {
    const { input, market } = fixture({ cadenceMs: 60_000, market: (t) => (t >= 120_000 ? units(940) : units(1000)) }),
      reader = provider(market);
    const result = await replayHistoricalGoal(input, reader);
    expect(reader).not.toHaveBeenCalled();
    expect(result.status).toBe('complete');
    expect(result.events.filter((e) => e.atMs === START + 60_000).map((e) => e.kind)).toEqual(['valuation', 'signal']);
    expect(result.events.some((e) => e.kind === 'cancelled' && e.signalIndex === 0)).toBe(true);
    expect(result.terminal!.outcome).toBe('loss');
    expect(result.terminal!.stoppedAtMs).toBe(START + 120_000);
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe('0');
  });

  it('orders a lagged valuation by its actual block time, after the nominal-target decision and before execution', async () => {
    const { input, market } = fixture({ cadenceMs: 60_000, market: (t) => (t >= 60_000 ? units(940) : units(1000)) });
    const row = input.valuations[1];
    if (row.status !== 'available') throw new Error('fixture');
    // No block exists at the nominal target: adjacent previous is54s, first observed block is72s.
    row.block = { ...row.block, timestampMs: START + 72_000 };
    row.mark = mark(row.block, units(940));
    row.poolEvidence = pool(row.block, units(940));
    const reader = provider(market),
      result = await replayHistoricalGoal(input, reader);
    expect(result.status).toBe('complete');
    expect(reader).not.toHaveBeenCalled();
    const signal = result.events.findIndex((e) => e.kind === 'signal' && e.signalIndex === 0);
    const observed = result.events.findIndex((e) => e.kind === 'valuation' && e.targetAtMs === START + 60_000);
    expect(signal).toBeLessThan(observed);
    expect(result.events[signal].atMs).toBe(START + 60_000);
    expect(result.events[observed].atMs).toBe(START + 72_000);
    expect(result.terminal!.stoppedAtMs).toBe(START + 72_000);
  });

  it('supports the full14,401-request schedule without rejecting its larger immutable event manifest', async () => {
    const { input } = fixture({
      cadenceMs: 6000,
      strategy: { kind: 'threshold', threshold: '0.1', direction: 'below' },
    });
    const reader = provider(),
      result = await replayHistoricalGoal(input, reader);
    expect(result.status).toBe('complete');
    expect(reader).not.toHaveBeenCalled();
    expect(result.coverage.valuationRequests).toBe(14_401);
    expect(result.coverage.valuationAvailable).toBe(14_401);
    expect(result.events).toHaveLength(14_449);
    expect(Object.isFrozen(result.events)).toBe(true);
  });

  it('retains impact/null-quote/goal-cost rejections without retrying, resizing or spending fees', async () => {
    for (const options of [
      { output: '989999999999999999', without: units(1) },
      { unavailable: true },
      { output: units(4), fee: '550000000000000000' },
    ]) {
      const { input } = fixture(),
        reader = provider(undefined, options);
      const result = await replayHistoricalGoal(input, reader);
      expect(result.status).toBe('complete');
      expect(reader).toHaveBeenCalledTimes(24);
      expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe('0');
      expect(result.terminal!.bot.portfolio.trades).toBe(0);
      expect(reader.mock.calls.every(([order]) => order.amountInCodec === '2500000000000000000')).toBe(true);
      expect(result.events.filter((e) => e.kind === 'rejected')).toHaveLength(24);
    }
  });

  it('charges only one failed-attempt fee per declared scenario and never invents a fill/cooldown', async () => {
    const { input } = fixture({ strategy: { intervalMs: 24 * HOUR } });
    input.scenario = 'fee-only-failure';
    const reader = provider(),
      result = await replayHistoricalGoal(input, reader);
    expect(reader).toHaveBeenCalledTimes(24);
    expect(result.terminal!.bot.portfolio.trades).toBe(0);
    expect(result.terminal!.scenarioFailures).toBe(24);
    expect(result.terminal!.bot.portfolio.holdings[KUSD]).toBe(units(10));
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe(String(24n * BigInt(FEE)));
    expect(result.terminal!.bot.state.lastTradeAt).toBe(0);
  });

  it('quotes an exact acquired-XOR sell lot after a real hypothetical buy while preserving the remaining reserve', async () => {
    const { input } = fixture({ strategy: { kind: 'sma', fastWindow: 1, slowWindow: 2 } });
    input.warmup = [{ timestamp: START - HOUR, close: '1' }];
    input.candles = input.candles.map((c, i) => ({ ...c, close: i === 0 || i === 2 ? '2' : '1' }));
    const reader = provider(),
      result = await replayHistoricalGoal(input, reader);
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader.mock.calls[0][0]).toMatchObject({
      signalIndex: 2,
      assetIn: KUSD,
      amountInCodec: '2500000000000000000',
    });
    expect(reader.mock.calls[1][0]).toMatchObject({
      signalIndex: 3,
      assetIn: XOR,
      amountInCodec: '2487500000000000000',
    });
    expect(result.terminal!.bot.portfolio.holdings[XOR]).toBe(String(UNIT - 2n * BigInt(FEE)));
    expect(result.terminal!.bot.portfolio.trades).toBe(2);
  });

  it('treats missing clocks as incomplete only for actual pending orders, retaining all hold slots', async () => {
    for (const idle of [false, true]) {
      const { input } = fixture({ strategy: idle ? { kind: 'threshold', threshold: '0.1', direction: 'below' } : {} });
      input.executions = input.executions.map((r, i) =>
        i === 0 ? { status: 'unavailable' as const, signalIndex: i, reason: 'unavailable' as const } : r
      );
      const reader = provider(),
        result = await replayHistoricalGoal(input, reader);
      expect(result.status).toBe(idle ? 'complete' : 'incomplete');
      expect(result.coverage.signalsConsumed).toBe(24);
      expect(result.coverage.requiredExecutionClocksUnavailable).toEqual(idle ? [] : [0]);
      expect(reader.mock.calls.some(([p]) => p.signalIndex === 0)).toBe(false);
    }
  });

  it('preserves actual terminal holdings and later drawdown after an early target, without liquidation or further quotes', async () => {
    const { input, market } = fixture({
      cadenceMs: 60_000,
      market: (t) => (t < 600_000 ? units(1000) : t < 1_200_000 ? units(1100) : units(800)),
    });
    const reader = provider(market),
      result = await replayHistoricalGoal(input, reader);
    expect(reader).toHaveBeenCalledTimes(1);
    expect(result.terminal!.outcome).toBe('target');
    expect(result.terminal!.stoppedAtMs).toBe(START + 600_000);
    expect(result.terminal!.bot.portfolio.holdings[KUSD]).toBe('7500000000000000000');
    expect(BigInt(result.terminal!.maximumDrawdownRatio.numerator) * 20n).toBeGreaterThan(
      BigInt(result.terminal!.maximumDrawdownRatio.denominator)
    );
    expect(result.events.filter((e) => e.kind === 'valuation')).toHaveLength(1440);
  });

  it('rejects mismatched quote state/denomination before any fill, and never retries malformed evidence', async () => {
    for (const mismatch of ['hash', 'denominator', 'pool-time']) {
      const { input } = fixture();
      const reader = vi.fn<HistoricalGoalQuoteEvidenceProvider>(async (p, c) => {
        const result = quote(p, c.execution, c.previous);
        if (mismatch === 'hash') result.quoteEvidence.request.block.hash = hash(99999);
        if (mismatch === 'denominator') result.quoteEvidence.request.expectedDenominator = '2';
        if (mismatch === 'pool-time') result.poolEvidence.state.timestampMs++;
        return result;
      });
      await expect(replayHistoricalGoal(input, reader)).rejects.toThrow();
      expect(reader).toHaveBeenCalledTimes(1);
      expect(input.bot.portfolio.trades).toBe(0);
    }
  });

  it('retains reader failures as incomplete without replacing their fixed input or state', async () => {
    const { input } = fixture();
    const reader = vi.fn<HistoricalGoalQuoteEvidenceProvider>(async () => {
      throw new Error('synthetic unavailable');
    });
    const result = await replayHistoricalGoal(input, reader);
    expect(reader).toHaveBeenCalledTimes(24);
    expect(result.status).toBe('incomplete');
    expect(result.diagnostics).toHaveLength(24);
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe('0');
  });

  it('retains safe structured provider failure codes and immutable receipt digests without logging raw errors', async () => {
    const { input } = fixture();
    const diagnostic = {
      status: 'unavailable' as const,
      stage: 'fees' as const,
      reason: 'timeout' as const,
      evidenceSha256: 'a'.repeat(64),
    };
    const reader = vi.fn<HistoricalGoalQuoteEvidenceProvider>(async () => ({ ...diagnostic }));
    const result = await replayHistoricalGoal(input, reader);
    expect(result.status).toBe('incomplete');
    expect(reader).toHaveBeenCalledTimes(24);
    expect(result.diagnostics[0].providerFailure).toEqual(diagnostic);
    expect(result.events.find((e) => e.kind === 'rejected')!.providerFailure).toEqual(diagnostic);
    expect(Object.isFrozen(result.diagnostics[0].providerFailure)).toBe(true);
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe('0');
  });

  it('snapshots all inputs before awaiting and exposes only the frozen pending input/clock to the provider', async () => {
    const { input } = fixture();
    const reader = vi.fn<HistoricalGoalQuoteEvidenceProvider>(async (p, c) => {
      expect(Object.isFrozen(p)).toBe(true);
      expect(Object.isFrozen(c.execution)).toBe(true);
      input.bot.strategy.amount = '9';
      input.candles[23].close = '999';
      return quote(p, c.execution, c.previous);
    });
    const result = await replayHistoricalGoal(input, reader);
    expect(result.status).toBe('complete');
    expect(reader.mock.calls.every(([p]) => p.amountInCodec === '2500000000000000000')).toBe(true);
    expect(result.terminal!.bot.strategy.amount).toBe('2.5');
  });

  it('rejects accessor/sparse input and future signal candles without invoking the reader or getter', async () => {
    const getter = vi.fn(() => '1');
    for (const mode of ['getter', 'sparse', 'future']) {
      const { input } = fixture(),
        reader = provider();
      if (mode === 'getter') Object.defineProperty(input.candles[0], 'close', { enumerable: true, get: getter });
      if (mode === 'sparse') input.valuations = new Array(input.valuations.length);
      if (mode === 'future') input.candles[0].timestamp += HOUR;
      await expect(replayHistoricalGoal(input, reader)).rejects.toThrow();
      expect(reader).not.toHaveBeenCalled();
    }
    expect(getter).not.toHaveBeenCalled();
  });
});

describe('explicit bounded-fee replay policy', () => {
  it('replaces the original native estimate once and retains the policy and immutable receipt digests', async () => {
    const { input } = fixture();
    input.feePolicy = HISTORICAL_GOAL_FEE_POLICY;
    const reader = boundProvider();
    const result = await replayHistoricalGoal(input, reader);
    expect(result.protocol).toBe('goal-ordered-replay-v3-bound-fee-v1-development');
    expect(result.status).toBe('complete');
    expect(result.terminal!.bot.portfolio.trades).toBe(4);
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe(String(8n * BigInt(FEE)));
    expect(result.benchmarkTerminal!.bot.portfolio.feesPaidCodec).toBe('0');
    expect(result.feePolicy).toEqual(HISTORICAL_GOAL_FEE_POLICY);
    expect(result.feePolicySha256).toBe('82999e261ec15966a673c02eb15960fef6895352f3a9f4ee1bd1296894674063');
    expect(result.feeEvidenceDigests).toHaveLength(4);
    for (const event of result.events.filter((event) => event.kind === 'scenario-fill')) {
      expect(event.feePolicySha256).toBe(result.feePolicySha256);
      expect(event.feeReceiptSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(event.feeSourceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(result.feeEvidenceDigests).toContain(event.feeEvidenceDigest);
    }
    expect(result.feeAdequacyVerified).toBe(false);
    expect(Object.isFrozen(result.feePolicy)).toBe(true);
  });

  it('charges only the new bound estimate once per fee-only failure without inventing trades or cooldown', async () => {
    const { input } = fixture();
    input.feePolicy = HISTORICAL_GOAL_FEE_POLICY;
    input.scenario = 'fee-only-failure';
    const result = await replayHistoricalGoal(input, boundProvider());
    expect(result.status).toBe('complete');
    expect(result.terminal!.bot.portfolio.feesPaidCodec).toBe(String(48n * BigInt(FEE)));
    expect(result.terminal!.bot.portfolio.trades).toBe(0);
    expect(result.terminal!.bot.state.lastTradeAt).toBe(0);
    expect(result.terminal!.bot.portfolio.holdings[KUSD]).toBe(units(10));
    expect(result.events.filter((event) => event.kind === 'scenario-failure')).toHaveLength(24);
  });

  it('admits against the bounded cost and preserves every rejected signal without charging any fee', async () => {
    const { input } = fixture();
    input.feePolicy = HISTORICAL_GOAL_FEE_POLICY;
    const result = await replayHistoricalGoal(input, boundProvider('600000000000000000'));
    expect(result.coverage.signalsConsumed).toBe(24);
    expect(result.events.filter((event) => event.reason === 'goalTradeCost')).toHaveLength(24);
    expect(result.terminal!.bot.portfolio).toEqual(input.bot.portfolio);
    expect(result.feeEvidenceDigests).toHaveLength(24);
  });

  it('retains missing bounded fee evidence as incomplete with the original pending order and no fill', async () => {
    const { input } = fixture();
    input.feePolicy = HISTORICAL_GOAL_FEE_POLICY;
    const reader = provider();
    const result = await replayHistoricalGoal(input, reader);
    expect(result.status).toBe('incomplete');
    expect(result.diagnostics).toHaveLength(24);
    expect(result.diagnostics.every((row) => row.reason === 'bound-fee-evidence-unavailable')).toBe(true);
    expect(
      result.events
        .filter((event) => event.reason === 'bound-fee-evidence-unavailable')
        .every((event) => event.pending?.amountInCodec === '2500000000000000000')
    ).toBe(true);
    expect(result.terminal!.bot.portfolio).toEqual(input.bot.portfolio);
    expect(reader).toHaveBeenCalledTimes(24);
  });

  it('does not require bounded fee data for a null quote or impact rejection', async () => {
    for (const options of [{ unavailable: true }, { without: units(3) }]) {
      const { input } = fixture();
      input.feePolicy = HISTORICAL_GOAL_FEE_POLICY;
      const result = await replayHistoricalGoal(input, provider(undefined, options));
      expect(result.status).toBe('complete');
      expect(result.diagnostics).toEqual([]);
      expect(result.feeEvidenceDigests).toEqual([]);
      expect(result.terminal!.bot.portfolio).toEqual(input.bot.portfolio);
    }
  });

  it.each(['receipt-state', 'source-quote', 'receipt-fee'] as const)(
    'rejects a mismatched %s with no fallback or second quote',
    async (change) => {
      const { input } = fixture();
      input.feePolicy = HISTORICAL_GOAL_FEE_POLICY;
      const build = boundProvider();
      const reader = vi.fn<HistoricalGoalQuoteEvidenceProvider>(async (pending, clock) => {
        const response = structuredClone(await build(pending, clock));
        if ('status' in response || !response.boundFee) throw new Error('fixture unavailable');
        if (change === 'receipt-state')
          response.boundFee.receipt.queries.info.params = [
            'TransactionPaymentApi_query_info',
            response.boundFee.receipt.envelope.feeQueryDataHex,
            hash(999999),
          ];
        if (change === 'receipt-fee') response.boundFee.receipt.queries.details.resultHex = feeBytes(1, 0, 0);
        if (change === 'source-quote') response.boundFee.source.quoteEvidence = {};
        return response;
      });
      await expect(replayHistoricalGoal(input, reader)).rejects.toThrow();
      expect(reader).toHaveBeenCalledTimes(1);
      expect(input.bot.portfolio.trades).toBe(0);
    }
  );

  it('rejects an undeclared policy receipt and altered policy before using bounded fees', async () => {
    const { input } = fixture();
    const reader = boundProvider();
    await expect(replayHistoricalGoal(input, reader)).rejects.toThrow();
    expect(reader).toHaveBeenCalledTimes(1);
    const altered = structuredClone(HISTORICAL_GOAL_FEE_POLICY);
    Object.assign(altered, { tipCodec: '1' });
    input.feePolicy = altered;
    reader.mockClear();
    await expect(replayHistoricalGoal(input, reader)).rejects.toThrow();
    expect(reader).not.toHaveBeenCalled();
  });
});
