import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  causalCalibrationCandidates,
  replayCausalGoalCalibration as replayV1,
  type CausalCalibrationInput,
  type CausalCalibrationHour,
  type CausalCalibrationPending,
  type CausalCalibrationQuoteProvider,
} from '../../../../scripts/bots/causal-goal-calibration-replay';
import { replayCausalGapCalibration } from '../../../../scripts/bots/causal-goal-calibration-gap-replay';
import {
  createHistoricalExecutionCodec,
  decodeHistoricalFeeDetailsScale,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import { createHistoricalGoalFeeCodec } from '../../../../scripts/bots/historical-goal-fee-codec';
import { createHistoricalFeeMetadataFixture, feeBytes, hex } from './fixtures/historical-goal-bound-fee-fixture';
import type { HistoricalClockBlock } from '../../../../scripts/bots/historical-execution-clock';
import * as engine from '../../../../src/features/bot-trading/engine';

const HOUR = 3_600_000,
  START = 500_000 * HOUR,
  UNIT = 10n ** 18n;
const metadata = createHistoricalFeeMetadataFixture();
const poolBinding = createHistoricalExecutionCodec(metadata.identity).binding;
const units = (n: number) => String(BigInt(n) * UNIT);
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const block = (hour: number, successor: boolean): HistoricalClockBlock => ({
  height: 1000 + hour * 600 + Number(successor),
  hash: hash(1000 + hour * 600 + Number(successor)),
  parentHash: hash(999 + hour * 600 + Number(successor)),
  timestampMs: START + hour * HOUR - (successor ? 0 : 6000),
});
function pool(at: HistoricalClockBlock, k = units(1100), x = units(1000)) {
  return {
    binding: { ...poolBinding, blockHash: at.hash, runtimeVersion: { ...poolBinding.runtimeVersion } },
    state: { timestampMs: at.timestampMs, denominator: '1' },
    basis: 'direct-pool-reserve-ratio',
    status: 'present',
    accounts: { reservesAccountId: hash(60000), feesAccountId: hash(60001) },
    pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
    reserves: { kusdCodec: k, xorCodec: x },
    marks: {
      xorPerKusd: { numeratorCodec: x, denominatorCodec: k },
      kusdPerXor: { numeratorCodec: k, denominatorCodec: x },
    },
    observedFill: false,
    transactionSubmitted: false,
  };
}
function fixture(): CausalCalibrationInput {
  return {
    candidate: 'momentum-breakout',
    startedAtMs: START,
    expectedDenominator: '1',
    warmup: Array.from({ length: 12 }, (_, i) => ({ timestamp: START + (i - 12) * HOUR, close: '1' })),
    hours: Array.from({ length: 25 }, (_, i) => ({
      completedAtMs: START + i * HOUR,
      closing: block(i, false),
      successor: block(i, true),
      closingPoolEvidence: pool(block(i, false)),
      ...(i < 24 ? { riskPoolEvidence: pool(block(i, true)) } : {}),
    })),
  };
}
/** Keep exact state provenance aligned when changing only synthetic clock spacing. */
function closingAge(input: CausalCalibrationInput, index: number, ageMs: number): void {
  const hour = input.hours[index];
  const reserves = (hour.closingPoolEvidence as ReturnType<typeof pool>).reserves;
  hour.closing.timestampMs = hour.completedAtMs - ageMs;
  hour.closingPoolEvidence = pool(hour.closing, reserves.kusdCodec, reserves.xorCodec);
}
/** Move the proven first successor without selecting another execution opportunity. */
function successorLag(input: CausalCalibrationInput, index: number, lagMs: number): void {
  const hour = input.hours[index];
  hour.successor.timestampMs = hour.completedAtMs + lagMs;
  if (index < 24) {
    const reserves = (hour.riskPoolEvidence as ReturnType<typeof pool>).reserves;
    hour.riskPoolEvidence = pool(hour.successor, reserves.kusdCodec, reserves.xorCodec);
  }
}
type QuoteOptions = { fee?: string; output?: string; without?: string; unavailable?: boolean };
function projection(order: CausalCalibrationPending, hour: CausalCalibrationHour, options: QuoteOptions = {}) {
  const at = hour.successor,
    identity = { ...metadata.identity, blockHash: at.hash },
    codec = createHistoricalExecutionCodec(identity);
  const reserves = (hour.riskPoolEvidence as ReturnType<typeof pool>).reserves;
  const buy = order.assetIn === KUSD;
  const output =
    options.output ??
    String(
      (BigInt(order.amountInCodec) * BigInt(buy ? reserves.xorCodec : reserves.kusdCodec)) /
        BigInt(buy ? reserves.kusdCodec : reserves.xorCodec)
    );
  const fee = options.fee ?? '1000000000000000';
  const request = {
    assetIn: order.assetIn,
    assetOut: order.assetOut,
    amountInCodec: order.amountInCodec,
    expectedDenominator: '1',
    block: { hash: at.hash, height: at.height },
  };
  const context = {
    genesisHash: GENESIS,
    block: request.block,
    parentHash: hour.closing.hash,
    expectedDenominator: '1',
    state: { timestampMs: at.timestampMs, denominator: '1' },
    codecBinding: codec.binding,
  };
  if (options.unavailable) return { quoteEvidence: { kind: 'historical-quote-unavailable', request, context } };
  const swap = {
    assetIn: order.assetIn,
    assetOut: order.assetOut,
    amountInCodec: order.amountInCodec,
    quotedAmountOutCodec: output,
  };
  const originalFee = '100000000000000';
  const quoteEvidence = {
    kind: 'hypothetical-historical-execution-estimate',
    request,
    context,
    quote: {
      amountOutCodec: output,
      amountWithoutImpactCodec: options.without ?? output,
      poolFeeCodec: '10000',
      dexId: 0,
      liquiditySource: 'XYKPool',
      slippageBps: 50,
      feeAssetAddress: XOR,
      route: [order.assetIn, order.assetOut],
    },
    envelope: codec.buildSwapEnvelope(swap),
    fees: {
      assetId: XOR,
      info: { partialFeeCodec: originalFee },
      details: decodeHistoricalFeeDetailsScale(feeBytes(BigInt(originalFee), 0, 0)),
    },
    observedFill: false,
    transactionSubmitted: false,
  };
  if (options.without && BigInt(output) * 100n < BigInt(options.without) * 99n) return { quoteEvidence };
  const envelope = createHistoricalGoalFeeCodec(identity).buildBoundSwapEnvelope(swap, { blockNumber: at.height });
  return {
    quoteEvidence,
    boundFee: {
      source: { identity, blockNumber: at.height, request: swap, quoteEvidence },
      receipt: {
        version: 1 as const,
        kind: 'historical-goal-bound-fee-receipt' as const,
        envelope,
        feeAssetAddress: XOR,
        queries: {
          info: {
            method: 'state_call' as const,
            params: ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, at.hash] as const,
            resultHex: hex(
              metadata.registry
                .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: fee })
                .toU8a()
            ),
          },
          details: {
            method: 'state_call' as const,
            params: ['TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex, at.hash] as const,
            resultHex: feeBytes(BigInt(fee), 0, 0),
          },
        },
      },
    },
  };
}
const provider = (options: QuoteOptions = {}) =>
  vi.fn<CausalCalibrationQuoteProvider>(async (order, hour) => projection(order, hour, options));
const eqRatio = (v: { numerator: string; denominator: string }, n: bigint, d = 1n) =>
  expect(BigInt(v.numerator) * d).toBe(n * BigInt(v.denominator));

describe('causal gap goal calibration replay', () => {
  afterEach(() => vi.restoreAllMocks());
  it('fixes all three untuned hypotheses and exact capital, reserve, risk and target policy', async () => {
    const candidates = causalCalibrationCandidates();
    expect(Object.keys(candidates)).toEqual([
      'momentum-breakout',
      'rebound-from-discount',
      'trend-pullback-accumulation',
    ]);
    expect(Object.isFrozen(candidates['momentum-breakout'].rules!.entry.conditions)).toBe(true);
    expect(candidates['momentum-breakout'].rules!.entry.conditions).toEqual([
      { kind: 'breakout', window: 12, direction: 'above' },
      { kind: 'momentum', window: 6, direction: 'above', threshold: '3' },
    ]);
    expect(candidates['rebound-from-discount'].rules!.entry.conditions[0]).toMatchObject({ threshold: '-3' });
    expect(candidates['trend-pullback-accumulation'].intervalMs).toBe(24 * HOUR);
    expect(candidates['trend-pullback-accumulation'].rules!.exit).toBeNull();
    const input = fixture(),
      read = provider(),
      result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.bot!.portfolio.initial).toEqual({ [KUSD]: units(10), [XOR]: units(1) });
    expect(result.bot!.goal).toMatchObject({
      maxLossPercent: '10',
      targetReturnPercent: '5',
      targetRequiresIdleOutperformance: true,
    });
    expect(result.bot!.policy).toMatchObject({
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeBudgetCodec: units(1),
    });
    expect(result.bot!.policy.maxTradeCodec[XOR]).toBe(String((10n * UNIT * 1000n) / 1100n));
    expect(result.bot!.portfolio.trades).toBe(1);
    expect(result.bot!.portfolio.holdings[KUSD]).toBe(String((75n * UNIT) / 10n));
    expect(result.bot!.portfolio.feesPaidCodec).toBe('1000000000000000');
    expect(result.signalsConsumed).toBe(24);
    expect(result.hourlyEquity).toHaveLength(25);
    expect(result.controlEquity).toHaveLength(26); // baseline + 24 pre-trade checks + one post-fill
    expect(result.stoppedAtMs).toBe(START + 24 * HOUR);
    expect(result.qualificationAuthority).toBe(false);
    expect(result.transactionSubmitted).toBe(false);
    expect(result.observedFill).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(read.mock.calls[0][0]).toMatchObject({
      amountInCodec: String((25n * UNIT) / 10n),
      decidedAtMs: START + 12000,
      targetExecutionAtMs: START + HOUR,
    });
    expect(Object.isFrozen(read.mock.calls[0][0])).toBe(true);
    expect(input.hours[1].successor.timestampMs).toBe(START + HOUR);
  });

  it('never applies an unpublished close to earlier admission or values a pre-fill close with post-fill holdings', async () => {
    const input = fixture();
    input.hours[1].closingPoolEvidence = pool(input.hours[1].closing, units(500), units(1000));
    const result = await replayCausalGapCalibration(input, provider());
    expect(result.status).toBe('complete');
    expect(result.events.find((e) => e.kind === 'scenario-fill')?.atMs).toBe(START + HOUR);
    expect(result.hourlyEquity[1].holdings).toEqual({ [KUSD]: units(10), [XOR]: units(1) });
    eqRatio(result.hourlyEquity[1].value, 21n * UNIT);
    expect(result.hourlyEquity[2].holdings[KUSD]).toBe(String((75n * UNIT) / 10n));
    const risk = result.events.find((e) => e.kind === 'risk' && e.atMs === START + HOUR)!;
    eqRatio(risk.peak!, 111n * UNIT, 11n);
    expect(result.events.findIndex((e) => e.kind === 'scenario-fill')).toBeLessThan(
      result.events.findIndex((e) => e.kind === 'signal' && e.signalIndex === 1)
    );
    expect(Number(result.summary!.retrospectiveDrawdownPercent)).toBeGreaterThan(10);
  });

  it('checks risk even without orders and distinguishes the exact 10% edge from one reserve codec unit above it', async () => {
    for (const bump of [0n, 1n]) {
      const input = fixture();
      for (const hour of input.hours) {
        hour.closingPoolEvidence = pool(hour.closing, units(1000), units(1000));
        if (hour.riskPoolEvidence) hour.riskPoolEvidence = pool(hour.successor, units(1000), units(1000));
      }
      input.hours[1].riskPoolEvidence = pool(input.hours[1].successor, units(1000), String(890n * UNIT + bump));
      const read = provider(),
        result = await replayCausalGapCalibration(input, read);
      expect(result.status).toBe('complete');
      expect(read).not.toHaveBeenCalled();
      expect(result.outcome).toBe(bump === 0n ? 'loss' : 'expired');
      expect(result.stoppedAtMs).toBe(bump === 0n ? START + HOUR : START + 24 * HOUR);
    }
  });

  it('rejects a profitable minimum-output scenario when fee-only failure breaches the unchanged cap', async () => {
    const input = fixture();
    input.hours[1].riskPoolEvidence = pool(input.hours[1].successor, units(1000), units(900));
    const result = await replayCausalGapCalibration(input, provider({ fee: units(1), output: units(4) }));
    expect(result.status).toBe('complete');
    expect(result.events.find((e) => e.kind === 'rejected')?.reason).toBe('goalTradeCost');
    expect(result.bot!.portfolio.trades).toBe(0);
    expect(result.bot!.portfolio.feesPaidCodec).toBe('0');
    expect(result.bot!.portfolio.holdings).toEqual(result.bot!.portfolio.initial);
  });

  it('preserves the separate reserve when the bound fee exceeds it and never substitutes the cheaper original envelope', async () => {
    const result = await replayCausalGapCalibration(fixture(), provider({ fee: String(UNIT + 1n) }));
    expect(result.status).toBe('complete');
    expect(result.events.find((e) => e.kind === 'rejected')?.reason).toBe('bots.errors.feeBudget');
    expect(result.bot!.portfolio.holdings).toEqual(result.bot!.portfolio.initial);
  });

  it('sizes a rule exit only from acquired XOR above the remaining reserve and debits fees once per fill', async () => {
    const input = fixture();
    for (let i = 6; i <= 24; i++)
      input.hours[i].closingPoolEvidence = pool(input.hours[i].closing, units(1000), units(1000));
    const read = provider(),
      result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.bot!.portfolio.trades).toBe(2);
    const [buy, sell] = read.mock.calls.map((call) => call[0]);
    expect(buy.assetIn).toBe(KUSD);
    expect(sell.assetIn).toBe(XOR);
    const acquired = (((BigInt(buy.amountInCodec) * 1000n) / 1100n) * 995n) / 1000n;
    expect(sell.amountInCodec).toBe(String(acquired));
    expect(sell.decidedAtMs).toBe(START + 7 * HOUR + 12000);
    expect(result.bot!.portfolio.feesPaidCodec).toBe('2000000000000000');
    expect(result.bot!.portfolio.holdings[XOR]).toBe(String(UNIT - 2000000000000000n));
  });

  it('cancels a previously scheduled proposal at a genuine successor risk breach before reading a quote', async () => {
    const input = fixture();
    input.hours[1].riskPoolEvidence = pool(input.hours[1].successor, units(1000), units(700));
    const read = provider(),
      result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.outcome).toBe('loss');
    expect(result.events.find((e) => e.kind === 'cancelled')).toMatchObject({
      atMs: START + HOUR,
      signalIndex: 0,
      reason: 'goal-complete',
    });
    expect(read).not.toHaveBeenCalled();
  });

  it('uses a detached dataset while quote evidence is pending', async () => {
    const input = fixture();
    const result = await replayCausalGapCalibration(input, async (order, hour) => {
      input.hours[2].completedAtMs = 0;
      input.warmup[0].close = '999';
      return projection(order, hour);
    });
    expect(result.status).toBe('complete');
    expect(result.hourlyEquity[2].accountingAtMs).toBe(START + 2 * HOUR);
    expect(result.bot!.portfolio.trades).toBe(1);
  });

  it('retains completed fills, fees, valuations and counters when a later signal evaluator unexpectedly fails', async () => {
    const evaluate = engine.evaluateStrategy;
    const failed = vi.spyOn(engine, 'evaluateStrategy').mockImplementation((bot, candles, now) => {
      if (now === START + HOUR + 12000) throw new Error('Synthetic evaluator fault after a completed fill');
      return evaluate(bot, candles, now);
    });
    try {
      const read = provider(),
        result = await replayCausalGapCalibration(fixture(), read);
      expect(result.status).toBe('incomplete');
      expect(result.diagnostics).toEqual(['replay-stage:signal:1']);
      expect(result.summary).toBeUndefined();
      expect(result.quoteRequests).toBe(1);
      expect(result.signalsConsumed).toBe(2);
      expect(read).toHaveBeenCalledTimes(1);
      expect(result.bot!.portfolio.trades).toBe(1);
      expect(result.bot!.portfolio.feesPaidCodec).toBe('1000000000000000');
      expect(result.bot!.portfolio.holdings[KUSD]).toBe(String((75n * UNIT) / 10n));
      expect(result.hourlyEquity).toHaveLength(2);
      expect(result.controlEquity).toHaveLength(4);
      expect(result.events.filter((event) => event.kind === 'scenario-fill')).toHaveLength(1);
      expect(result.events.some((event) => event.kind === 'terminal')).toBe(false);
      expect(result.timing!.potentialExecutionLagsMs).toHaveLength(23);
      expect(result.timing!.timelyPotentialExecutions).toBe(23);
      expect(Object.isFrozen(result.events)).toBe(true);
      expect(result.qualificationAuthority).toBe(false);
    } finally {
      failed.mockRestore();
    }
  });

  it('does not claim the target from rising idle value, but stops after a fill that achieves 5% and beats idle', async () => {
    const idle = fixture();
    for (const hour of idle.hours) {
      hour.closingPoolEvidence = pool(hour.closing, units(1000), units(1000));
      if (hour.riskPoolEvidence)
        hour.riskPoolEvidence = pool(
          hour.successor,
          units(1000),
          hour.completedAtMs > START ? units(1200) : units(1000)
        );
    }
    const noFill = await replayCausalGapCalibration(idle, provider());
    expect(noFill.outcome).toBe('expired');
    expect(noFill.bot!.portfolio.trades).toBe(0);
    const fill = await replayCausalGapCalibration(fixture(), provider({ output: units(4) }));
    expect(fill.outcome).toBe('target');
    expect(fill.stoppedAtMs).toBe(START + HOUR);
    expect(fill.bot!.portfolio.trades).toBe(1);
    expect(fill.hourlyEquity).toHaveLength(25);
  });

  it('cancels the last signal without quoting at or after the fixed deadline', async () => {
    const input = fixture();
    for (const hour of input.hours) {
      hour.closingPoolEvidence = pool(hour.closing, units(1000), units(1000));
      if (hour.riskPoolEvidence) hour.riskPoolEvidence = pool(hour.successor, units(1000), units(1000));
    }
    input.hours[23].closingPoolEvidence = pool(input.hours[23].closing, units(1100), units(1000));
    const read = provider(),
      result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.events.filter((e) => e.kind === 'cancelled')).toMatchObject([
      { signalIndex: 23, reason: 'deadline' },
    ]);
    expect(read).not.toHaveBeenCalled();
  });

  it('fails preflight before quotes for missing, gapped, contradictory or nonnative evidence', async () => {
    const changes: Array<(input: CausalCalibrationInput) => void> = [
      (i) => {
        i.hours.pop();
      },
      (i) => {
        i.hours[3].completedAtMs += HOUR;
      },
      (i) => {
        delete i.hours[0].riskPoolEvidence;
      },
      (i) => {
        i.warmup[2].timestamp += HOUR;
      },
      (i) => {
        i.hours[1].successor.parentHash = hash(999999);
      },
      (i) => {
        (i.hours[1].riskPoolEvidence as ReturnType<typeof pool>).binding.runtimeVersion.specVersion = 999;
      },
      (i) => {
        (i.hours[1].riskPoolEvidence as ReturnType<typeof pool>).binding.blockHash = hash(999999);
      },
      (i) => {
        (i.hours[1].riskPoolEvidence as ReturnType<typeof pool>).state.denominator = '2';
      },
      (i) => {
        i.hours[1].closing.timestampMs = i.hours[1].completedAtMs - 12001;
      },
    ];
    for (const change of changes) {
      const input = fixture();
      change(input);
      const read = provider();
      const result = await replayCausalGapCalibration(input, read);
      expect(result.status).toBe('incomplete');
      expect(result.summary).toBeUndefined();
      expect(read).not.toHaveBeenCalled();
      expect(result.diagnostics).toHaveLength(1);
    }
  });

  it('retains quote unavailability and excessive impact without inventing a fill or paying fees', async () => {
    for (const options of [{ unavailable: true }, { output: units(2), without: units(3) }]) {
      const result = await replayCausalGapCalibration(fixture(), provider(options));
      expect(result.status).toBe('complete');
      expect(result.events.find((e) => e.kind === 'rejected')?.reason).toBe(
        options.unavailable ? 'quote-unavailable' : 'impact-limit'
      );
      expect(result.bot!.portfolio.trades).toBe(0);
      expect(result.bot!.portfolio.feesPaidCodec).toBe('0');
    }
  });

  it('rejects raw fills, missing bound fees and changed frozen quote amounts without granting authority', async () => {
    const readers: CausalCalibrationQuoteProvider[] = [
      async () =>
        ({ fill: { outputCodec: units(999) } }) as unknown as Awaited<ReturnType<CausalCalibrationQuoteProvider>>,
      async (order, hour) => ({ quoteEvidence: projection(order, hour).quoteEvidence }),
      async (order, hour) => projection({ ...order, amountInCodec: units(3) }, hour),
    ];
    for (const read of readers) {
      const result = await replayCausalGapCalibration(fixture(), read);
      expect(result.status).toBe('incomplete');
      expect(result.summary).toBeUndefined();
      expect(result.bot!.portfolio.trades).toBe(0);
      expect(result.quoteRequests).toBe(1);
      expect(result.qualificationAuthority).toBe(false);
    }
  });

  it.each([12000, 12001, 12003])('handles a native closing age of %dms without pretending it is fresh', async (age) => {
    const input = fixture();
    closingAge(input, 0, age);
    closingAge(input, 24, age);
    const evaluate = vi.spyOn(engine, 'evaluateStrategy');
    const read = provider();
    const result = await replayCausalGapCalibration(input, read);
    expect(result.protocol).toBe('causal-goal-calibration-gap-v1');
    expect(result.status).toBe('complete');
    expect(result.hourlyEquity[0]).toMatchObject({ accountingAtMs: START, observedAtMs: START - age });
    expect(result.hourlyEquity[24]).toMatchObject({
      accountingAtMs: START + 24 * HOUR,
      observedAtMs: START + 24 * HOUR - age,
    });
    expect(result.timing!.closingStateTimestampsMs[0]).toBe(START - age);
    expect(result.timing!.closingStateAgesMs).toHaveLength(25);
    expect(result.timing!.closingStateAgesMs[24]).toBe(age);
    expect(result.timing!.timelyClosingStates).toBe(age <= 12000 ? 25 : 23);
    expect(result.timing!.staleSignalHourCount).toBe(age <= 12000 ? 0 : 1);
    expect(result.timing!.staleSignalSkipCount).toBe(age <= 12000 ? 0 : 1);
    expect(evaluate.mock.calls.some((call) => call[2] === START + 12000)).toBe(age <= 12000);
    expect(result.events.find((event) => event.kind === 'signal' && event.signalIndex === 0)?.reason).toBe(
      age <= 12000 ? 'bots.rules.entryMatch' : 'stale-closing-state'
    );
    expect(result.signalsConsumed).toBe(24);
    expect(read).toHaveBeenCalledTimes(age <= 12000 ? 1 : 0);
  });

  it.each([12000, 12001, 12003])(
    'expires fixed-target pending work only when successor lag %dms exceeds the cap',
    async (lag) => {
      const input = fixture();
      successorLag(input, 1, lag);
      const read = provider();
      const result = await replayCausalGapCalibration(input, read);
      expect(result.status).toBe('complete');
      expect(result.timing!.potentialExecutionLagsMs).toHaveLength(23);
      expect(result.timing!.potentialExecutionLagsMs[0]).toBe(lag);
      expect(result.timing!.timelyPotentialExecutions).toBe(lag <= 12000 ? 23 : 22);
      expect(result.timing!.pendingLateCancelCount).toBe(lag <= 12000 ? 0 : 1);
      expect(read).toHaveBeenCalledTimes(lag <= 12000 ? 1 : 0);
      expect(result.bot!.portfolio.trades).toBe(lag <= 12000 ? 1 : 0);
      const controlIndex = result.events.findIndex(
        (event) => event.kind === 'risk' && event.atMs === START + HOUR + lag
      );
      if (lag <= 12000) {
        const fillIndex = result.events.findIndex((event) => event.kind === 'scenario-fill');
        expect(fillIndex).toBeGreaterThan(controlIndex);
        expect(result.events[fillIndex].atMs).toBe(START + HOUR + lag);
        expect(read.mock.calls[0][0].targetExecutionAtMs).toBe(START + HOUR);
      } else {
        const cancelIndex = result.events.findIndex((event) => event.reason === 'execution-window-expired');
        expect(cancelIndex).toBeLessThan(controlIndex);
        expect(result.events[cancelIndex]).toMatchObject({
          kind: 'cancelled',
          atMs: START + HOUR + 12000,
          signalIndex: 0,
          pending: { targetExecutionAtMs: START + HOUR, amountInCodec: String((25n * UNIT) / 10n) },
        });
        expect(result.bot!.portfolio.holdings).toEqual(result.bot!.portfolio.initial);
        expect(result.bot!.portfolio.feesPaidCodec).toBe('0');
      }
      expect(result.events.map((event) => event.atMs)).toEqual(
        result.events.map((event) => event.atMs).sort((a, b) => a - b)
      );
    }
  );

  it('skips a stale new signal while executing its earlier timely pending proposal and retaining the historical close', async () => {
    const input = fixture();
    closingAge(input, 1, 12003);
    const implementation = engine.evaluateStrategy;
    const seen: Array<{ at: number; candles: Array<{ timestamp: number; close: string }> }> = [];
    vi.spyOn(engine, 'evaluateStrategy').mockImplementation((bot, candles, now) => {
      seen.push({ at: now, candles: candles.map((candle) => ({ ...candle })) });
      return implementation(bot, candles, now);
    });
    const result = await replayCausalGapCalibration(input, provider());
    expect(result.status).toBe('complete');
    expect(result.bot!.portfolio.trades).toBe(1);
    expect(result.events.find((event) => event.kind === 'scenario-fill')?.atMs).toBe(START + HOUR);
    expect(result.events.find((event) => event.kind === 'signal' && event.signalIndex === 1)?.reason).toBe(
      'stale-closing-state'
    );
    expect(result.timing!.staleSignalSkipCount).toBe(1);
    expect(seen.some((event) => event.at === START + HOUR + 12000)).toBe(false);
    // The interval identity remains v1-compatible; its native age is never overwritten by that label.
    expect(seen.find((event) => event.at === START + 2 * HOUR + 12000)!.candles).toContainEqual({
      timestamp: START + HOUR,
      close: '1.1',
    });
    expect(result.hourlyEquity[1].observedAtMs).toBe(START + HOUR - 12003);
    expect(result.hourlyEquity[1].holdings).toEqual(result.bot!.portfolio.initial);
  });

  it('still stops at stale-hour controls before a pending fill and counts stopped hours separately from stale skips', async () => {
    const input = fixture();
    closingAge(input, 1, 12003);
    closingAge(input, 2, 12003);
    input.hours[1].riskPoolEvidence = pool(input.hours[1].successor, units(1000), units(700));
    const read = provider();
    const result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.outcome).toBe('loss');
    expect(result.stoppedAtMs).toBe(START + HOUR);
    expect(result.timing!.staleSignalHourCount).toBe(2);
    expect(result.timing!.staleSignalSkipCount).toBe(0);
    expect(result.events.find((event) => event.kind === 'cancelled')).toMatchObject({ reason: 'goal-complete' });
    expect(result.events.find((event) => event.kind === 'signal' && event.signalIndex === 1)?.reason).toBe(
      'goal-complete'
    );
    expect(result.controlEquity).toHaveLength(25);
    expect(read).not.toHaveBeenCalled();
  });

  it('records every potential execution lag even when a candidate never has pending work', async () => {
    const input = fixture();
    input.candidate = 'trend-pullback-accumulation';
    successorLag(input, 1, 12003);
    const read = provider();
    const result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.timing!.potentialExecutionLagsMs[0]).toBe(12003);
    expect(result.timing!.timelyPotentialExecutions).toBe(22);
    expect(result.timing!.pendingLateCancelCount).toBe(0);
    expect(read).not.toHaveBeenCalled();
  });

  it('requires delayed decisions strictly before the next boundary and never shifts an episode around a halt', async () => {
    for (const lag of [HOUR - 12001, HOUR - 12000, HOUR, 2 * HOUR]) {
      const input = fixture();
      successorLag(input, 1, lag);
      const read = provider();
      const result = await replayCausalGapCalibration(input, read);
      expect(result.status).toBe(lag === HOUR - 12001 ? 'complete' : 'incomplete');
      expect(read).not.toHaveBeenCalled();
      if (result.status === 'complete') {
        expect(result.events.find((event) => event.kind === 'signal' && event.signalIndex === 1)?.atMs).toBe(
          START + 2 * HOUR - 1
        );
        expect(result.stoppedAtMs).toBe(START + 24 * HOUR);
      } else {
        expect(result.events).toEqual([]);
        expect(result.timing).toBeUndefined();
      }
    }
    for (const index of [0, 24]) {
      const input = fixture();
      closingAge(input, index, HOUR);
      const result = await replayCausalGapCalibration(input, provider());
      expect(result.status).toBe('incomplete');
      expect(result.diagnostics).toEqual(['Causal gap calibration: boundary-proof']);
    }
  });

  it('uses the original terminal H− value without a post-deadline control, quote or fill', async () => {
    const input = fixture();
    closingAge(input, 24, 12003);
    successorLag(input, 24, 60000);
    input.hours[24].closingPoolEvidence = pool(input.hours[24].closing, units(1100), units(1100));
    const read = provider();
    const result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.hourlyEquity.at(-1)!.observedAtMs).toBe(START + 24 * HOUR - 12003);
    expect(result.events.at(-1)).toMatchObject({ kind: 'terminal', atMs: START + 24 * HOUR });
    expect(result.events.every((event) => event.atMs <= START + 24 * HOUR)).toBe(true);
    expect(
      result.events.filter((event) => event.kind === 'scenario-fill').every((event) => event.atMs < START + 24 * HOUR)
    ).toBe(true);
    expect(read.mock.calls.every(([, hour]) => hour.successor.timestampMs < START + 24 * HOUR)).toBe(true);
    expect(result.controlEquity.every((row) => row.observedAtMs < START + 24 * HOUR)).toBe(true);
    expect(result.timing!.potentialExecutionLagsMs).toHaveLength(23);
  });

  it.each(Object.keys(causalCalibrationCandidates()) as CausalCalibrationInput['candidate'][])(
    'matches every registered v1 output for on-time %s data apart from protocol and added timing evidence',
    async (candidate) => {
      const input = fixture();
      input.candidate = candidate;
      const before = JSON.stringify(input);
      const v1 = await replayV1(input, provider());
      const gap = await replayCausalGapCalibration(input, provider());
      const { protocol, timing, ...rest } = gap;
      const { protocol: legacyProtocol, ...legacyRest } = v1;
      expect(legacyProtocol).toBe('causal-goal-calibration-v1');
      expect(rest).toEqual(legacyRest);
      expect(protocol).toBe('causal-goal-calibration-gap-v1');
      expect(timing).toMatchObject({
        timelyClosingStates: 25,
        timelyPotentialExecutions: 23,
        staleSignalHourCount: 0,
        staleSignalSkipCount: 0,
        pendingLateCancelCount: 0,
      });
      expect(JSON.stringify(input)).toBe(before);
    }
  );

  it.each([12000, 12001])('honors a risk stop at a %dms execution tie or after its earlier expiry', async (lag) => {
    const input = fixture();
    successorLag(input, 1, lag);
    input.hours[1].riskPoolEvidence = pool(input.hours[1].successor, units(1000), units(700));
    const read = provider();
    const result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('complete');
    expect(result.outcome).toBe('loss');
    expect(result.stoppedAtMs).toBe(START + HOUR + lag);
    const cancel = result.events.findIndex((event) => event.kind === 'cancelled');
    const loss = result.events.findIndex((event) => event.kind === 'risk' && event.reason === 'loss');
    expect(result.events[cancel]).toMatchObject({
      atMs: START + HOUR + 12000,
      reason: lag === 12000 ? 'goal-complete' : 'execution-window-expired',
    });
    expect(lag === 12000 ? loss < cancel : cancel < loss).toBe(true);
    expect(result.timing!.pendingLateCancelCount).toBe(lag === 12000 ? 0 : 1);
    expect(result.bot!.portfolio.feesPaidCodec).toBe('0');
    expect(result.bot!.portfolio.trades).toBe(0);
    expect(read).not.toHaveBeenCalled();
  });

  it('retains a late cancellation and its timing counters when a later evaluator fails', async () => {
    const input = fixture();
    successorLag(input, 1, 12003);
    const evaluate = engine.evaluateStrategy;
    vi.spyOn(engine, 'evaluateStrategy').mockImplementation((bot, candles, now) => {
      if (now === START + HOUR + 24003) throw new Error('Synthetic post-expiry evaluator failure');
      return evaluate(bot, candles, now);
    });
    const read = provider();
    const result = await replayCausalGapCalibration(input, read);
    expect(result.status).toBe('incomplete');
    expect(result.diagnostics).toEqual(['replay-stage:signal:1']);
    expect(result.events.find((event) => event.kind === 'cancelled')).toMatchObject({
      reason: 'execution-window-expired',
      atMs: START + HOUR + 12000,
    });
    expect(result.timing!.pendingLateCancelCount).toBe(1);
    expect(result.timing!.timelyPotentialExecutions).toBe(22);
    expect(result.signalsConsumed).toBe(2);
    expect(result.hourlyEquity).toHaveLength(2);
    expect(result.controlEquity).toHaveLength(3);
    expect(result.summary).toBeUndefined();
    expect(result.bot!.portfolio.trades).toBe(0);
    expect(result.bot!.portfolio.feesPaidCodec).toBe('0');
    expect(read).not.toHaveBeenCalled();
  });
});
