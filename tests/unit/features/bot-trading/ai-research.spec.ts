import { describe, expect, it, vi } from 'vitest';
import {
  assertBotAiResearchWindow,
  copyBotAiPriceImpactLimit,
  copyBotAiResearchConstraints,
  type BotAiCostSample,
  type BotAiResearchConstraints,
} from '@/features/bot-trading/ai-research';
import { researchConstraintsFixture } from './fixtures';

const constraints = (): BotAiResearchConstraints => ({
  minimumIntervalMs: 3_600_000,
  maximumIntervalMs: 12 * 3_600_000,
  minimumTrades: 5,
  trainingCandles: 117,
  validationCandles: 50,
  sizing: {
    capitalCodec: '10000000000000000019',
    spendableInputCodec: '9000000000000000018',
    feeSampleAmountCodec: '1000000000000000001',
  },
});

const HOUR = 3_600_000;
const FUNDING = Date.UTC(2026, 8, 14);
type WarmupEpisodes = Extract<NonNullable<BotAiResearchConstraints['goalEpisodes']>, { protocol: 'goal-episodes-v3' }>;
/** Synthetic public metadata describes signal history without disclosing any prices or outcomes. */
const warmedConstraints = (): BotAiResearchConstraints & { goalEpisodes: WarmupEpisodes } => ({
  ...researchConstraintsFixture(),
  minimumTrades: 1,
  maximumIntervalMs: 24 * HOUR,
  goalEpisodes: {
    protocol: 'goal-episodes-v3',
    durationMs: 24 * HOUR,
    trainingEpisodes: 4,
    validationEpisodes: 2,
    trainingTailCandles: 20,
    validationTailCandles: 1,
    aggregation: 'mean-net-return',
    minimumTradesPerPartition: 1,
    signalWarmup: {
      candles: 201,
      firstCompletedAt: FUNDING - 201 * HOUR,
      lastCompletedAt: FUNDING - HOUR,
      use: 'signals-only',
      prices: 'not-supplied',
    },
  },
});

const sampledConstraints = (): BotAiResearchConstraints & { costSamples: BotAiCostSample[] } => {
  const input = researchConstraintsFixture();
  const { finalizedAt, blockHash, buy, sell } = input.costs!;
  const reference = {
    amountInCodec: input.sizing!.feeSampleAmountCodec,
    status: 'available' as const,
    finalizedAt,
    blockHash,
    buy: { ...buy },
    sell: { ...sell },
  };
  return {
    ...input,
    costSamples: [
      reference,
      {
        ...structuredClone(reference),
        amountInCodec: '2475',
        finalizedAt: finalizedAt + 1,
        blockHash: `0x${'b'.repeat(64)}`,
      },
      { amountInCodec: '4950', status: 'unavailable', reason: 'quoteUnavailable' },
    ],
  };
};

type FeeScenario = NonNullable<Extract<BotAiCostSample, { status: 'available' }>['openingFeeScenario']>;
const feeScenario = (): FeeScenario => ({
  protocol: 'opening-fee-scenario-v1',
  valuationAsset: 'output',
  lossMetric: 'drawdown',
  maxLossPercent: '5',
  opening: { timestamp: 100, feeOnlyLossPercent: '7.875', feeOnlyReachesLossLimit: true },
  firstPossibleTrade: {
    timestamp: 200,
    feeOnlyLossPercent: '4.999999999999999999999999999999999999',
    feeOnlyReachesLossLimit: true,
  },
  laterOpportunity: 'not-assessed',
});

describe('GO target criterion in public drafting constraints', () => {
  it('preserves only the opt-in idle comparison without adding validation outcomes', () => {
    const input = warmedConstraints();
    input.goal = { ...input.goal!, targetRequiresIdleOutperformance: true };
    const copied = copyBotAiResearchConstraints(input)!;
    expect(copied.goal?.targetRequiresIdleOutperformance).toBe(true);
    expect(JSON.stringify(copied)).not.toMatch(/heldOutReturn|validationOutcome|walletAddress|idleHoldings/);
    copied.goal!.targetReturnPercent = '99';
    expect(input.goal!.targetReturnPercent).toBe('10');
    expect(copyBotAiResearchConstraints(warmedConstraints())!.goal).not.toHaveProperty(
      'targetRequiresIdleOutperformance'
    );
  });

  it('rejects a false opt-in or attached validation result', () => {
    const falseOptIn = warmedConstraints();
    Object.assign(falseOptIn.goal!, { targetRequiresIdleOutperformance: false });
    expect(() => copyBotAiResearchConstraints(falseOptIn)).toThrow();
    const leaked = warmedConstraints();
    Object.assign(leaked.goal!, { validationOutcome: 'passed' });
    expect(() => copyBotAiResearchConstraints(leaked)).toThrow();
  });
});

describe('descriptive opening fee scenarios', () => {
  it('detaches dated training diagnostics and preserves an exact flag independently of rounded display', () => {
    const input = sampledConstraints();
    const sample = input.costSamples[0];
    if (sample.status !== 'available') throw new Error('fixture');
    sample.openingFeeScenario = feeScenario();
    const copy = copyBotAiResearchConstraints(input)!;
    expect(copy).toEqual(input);
    const copied = copy.costSamples![0];
    if (copied.status !== 'available') throw new Error('fixture');
    expect(copied.openingFeeScenario!.firstPossibleTrade.feeOnlyReachesLossLimit).toBe(true);
    copied.openingFeeScenario!.opening.feeOnlyLossPercent = '0';
    expect(sample.openingFeeScenario.opening.feeOnlyLossPercent).toBe('7.875');
    expect(JSON.stringify(copy)).not.toMatch(/portfolioValue|holdings|currentPrice|validationReturn|qualified/);
  });

  it.each([
    { protocol: 'historical-paid-fee' },
    { valuationAsset: 'input' },
    { lossMetric: 'baseline' },
    { maxLossPercent: '6' },
    { laterOpportunity: 'impossible' },
    { validationPrice: '123' },
  ])('rejects scope and goal changes %j', (patch) => {
    const input = sampledConstraints();
    Object.assign(input.costSamples[0], { openingFeeScenario: { ...feeScenario(), ...patch } });
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it.each([
    { timestamp: 0 },
    { timestamp: 100.5 },
    { timestamp: 1001 },
    { feeOnlyLossPercent: '-1' },
    { feeOnlyLossPercent: '100.000000000000000000000000000000000001' },
    { feeOnlyLossPercent: '0.0000000000000000000000000000000000001' },
    { feeOnlyReachesLossLimit: 'true' },
    { historicalFeePaid: '1' },
  ])('rejects malformed, future or overprecise points %j', (patch) => {
    const input = sampledConstraints();
    const scenario = feeScenario();
    Object.assign(scenario.opening, patch);
    Object.assign(input.costSamples[0], { openingFeeScenario: scenario });
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it('requires goal binding and ordered training dates, and forbids a scenario for an unavailable quote', () => {
    const input = sampledConstraints();
    Object.assign(input.costSamples[0], { openingFeeScenario: feeScenario() });
    delete input.goal;
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
    const sameDate = sampledConstraints();
    const scenario = feeScenario();
    scenario.firstPossibleTrade.timestamp = scenario.opening.timestamp;
    Object.assign(sameDate.costSamples[0], { openingFeeScenario: scenario });
    expect(() => copyBotAiResearchConstraints(sameDate)).toThrow();
    const unavailable = sampledConstraints();
    Object.assign(unavailable.costSamples[2], { openingFeeScenario: feeScenario() });
    expect(() => copyBotAiResearchConstraints(unavailable)).toThrow();
  });

  it('does not invoke nested accessors or accept inherited points', () => {
    const input = sampledConstraints();
    const scenario = feeScenario();
    const getter = vi.fn(() => 'private');
    Object.defineProperty(scenario.opening, 'feeOnlyLossPercent', { get: getter });
    Object.assign(input.costSamples[0], { openingFeeScenario: scenario });
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const inherited = sampledConstraints();
    Object.assign(inherited.costSamples[0], {
      openingFeeScenario: { ...feeScenario(), opening: Object.create(feeScenario().opening) },
    });
    expect(() => copyBotAiResearchConstraints(inherited)).toThrow();
  });
});

describe('public exact-size cost samples', () => {
  it('detaches dated available and unavailable partial observations without inferring a size envelope', () => {
    const input = sampledConstraints();
    const copy = copyBotAiResearchConstraints(input)!;
    expect(copy).toEqual(input);
    const point = copy.costSamples![1];
    expect(point.status).toBe('available');
    if (point.status === 'available') point.buy.networkFeeXor = '1';
    copy.costSamples![2].amountInCodec = '1';
    expect(copy).not.toEqual(input);
    expect(copy.costSamples![0]).not.toBe(input.costSamples[0]);
    expect(JSON.stringify(copy)).not.toMatch(/amountOut|currentPrice|maxFeasible/);
  });

  it('requires sizing and common cost semantics while preserving older contexts without samples', () => {
    for (const key of ['sizing', 'costs'] as const) {
      const input = sampledConstraints();
      delete input[key];
      expect(() => copyBotAiResearchConstraints(input)).toThrow();
    }
    const legacy = researchConstraintsFixture();
    legacy.sizing!.feeSampleAmountCodec = legacy.sizing!.spendableInputCodec;
    expect(copyBotAiResearchConstraints(legacy)).toEqual(legacy);
    const input = sampledConstraints();
    input.sizing!.feeSampleAmountCodec = input.sizing!.spendableInputCodec;
    input.costSamples[0].amountInCodec = input.sizing!.spendableInputCodec;
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it.each(['0', '-1', '01', '1.5', '1e3', '9900', '10000'])(
    'rejects noncanonical, empty or nonpartial exact input %s',
    (amountInCodec) => {
      const input = sampledConstraints();
      input.costSamples[1].amountInCodec = amountInCodec;
      expect(() => copyBotAiResearchConstraints(input)).toThrow();
    }
  );

  it('preserves single base-unit precision beyond the number safe-integer limit', () => {
    const input = sampledConstraints();
    input.sizing = {
      capitalCodec: '10000000000000000019',
      spendableInputCodec: '9000000000000000018',
      feeSampleAmountCodec: '1',
    };
    input.costSamples[0].amountInCodec = '1';
    input.costSamples[1].amountInCodec = '9000000000000000017';
    expect(copyBotAiResearchConstraints(input)).toEqual(input);
    input.costSamples[1].amountInCodec = '9000000000000000018';
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it('rejects duplicate amounts and missing or unavailable reference observations', () => {
    const duplicate = sampledConstraints();
    duplicate.costSamples[2].amountInCodec = duplicate.costSamples[1].amountInCodec;
    expect(() => copyBotAiResearchConstraints(duplicate)).toThrow();
    const missing = sampledConstraints();
    missing.costSamples.shift();
    expect(() => copyBotAiResearchConstraints(missing)).toThrow();
    const unavailable = sampledConstraints();
    unavailable.costSamples[0] = { amountInCodec: '100', status: 'unavailable', reason: 'quoteUnavailable' };
    expect(() => copyBotAiResearchConstraints(unavailable)).toThrow();
  });

  it.each([
    { finalizedAt: 1001 },
    { blockHash: `0x${'c'.repeat(64)}` },
    { buy: { networkFeeXor: '1', swapFeePercent: '0.6', priceImpactPercent: '1.378020032171570988' } },
    { sell: { networkFeeXor: '0.200000000000000001', swapFeePercent: '0.7', priceImpactPercent: '2.2' } },
  ])('rejects a forged reference cost observation %j', (patch) => {
    const input = sampledConstraints();
    Object.assign(input.costSamples[0], patch);
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it.each([
    { finalizedAt: 0 },
    { finalizedAt: 1.5 },
    { blockHash: 'unknown' },
    { status: 'estimated' },
    { buy: { networkFeeXor: '0', swapFeePercent: '0.6', priceImpactPercent: '1' } },
    { sell: { networkFeeXor: '1', swapFeePercent: '11', priceImpactPercent: '1' } },
    { sell: { networkFeeXor: '1', swapFeePercent: '0.6', priceImpactPercent: '100' } },
    { reason: 'quoteUnavailable' },
    { amountOut: '123' },
  ])('applies the reference provenance and cost rules to each available size %j', (patch) => {
    const input = sampledConstraints();
    Object.assign(input.costSamples[1], patch);
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it.each([{ reason: 'unknown' }, { finalizedAt: 1000 }, { buy: {} }, { currentPrice: '1' }])(
    'rejects extra or misleading unavailable evidence %j',
    (patch) => {
      const input = sampledConstraints();
      Object.assign(input.costSamples[2], patch);
      expect(() => copyBotAiResearchConstraints(input)).toThrow();
    }
  );

  it('accepts five distinct exact probes but rejects a sixth or hidden array properties', () => {
    const input = sampledConstraints();
    const singleton = [input.costSamples[0]];
    expect(copyBotAiResearchConstraints({ ...input, costSamples: singleton })!.costSamples).toEqual(singleton);
    const adaptive = [
      ...input.costSamples,
      { amountInCodec: '3750', status: 'unavailable', reason: 'quoteUnavailable' } as const,
    ];
    expect(copyBotAiResearchConstraints({ ...input, costSamples: adaptive })!.costSamples).toEqual(adaptive);
    const verified = input.costSamples[1];
    if (verified.status !== 'available') throw new Error('fixture');
    const fifth: BotAiCostSample = {
      ...structuredClone(verified),
      amountInCodec: '6000',
      finalizedAt: verified.finalizedAt + 2,
      blockHash: `0x${'c'.repeat(64)}`,
    };
    const bounded = [...adaptive, fifth];
    expect(copyBotAiResearchConstraints({ ...input, costSamples: bounded })!.costSamples).toEqual(bounded);
    const sparse = [...input.costSamples];
    delete sparse[1];
    class ExtendedArray extends Array<BotAiCostSample> {}
    for (const samples of [
      [],
      [...input.costSamples, input.costSamples[0]],
      [...bounded, { amountInCodec: '7000', status: 'unavailable', reason: 'quoteUnavailable' } as const],
      sparse,
      Object.assign([...input.costSamples], { extra: 'private' }),
      Object.assign([...input.costSamples], { [Symbol('private')]: 'private' }),
      new ExtendedArray(...input.costSamples),
      { 0: input.costSamples[0], length: 1 },
    ]) {
      expect(() => copyBotAiResearchConstraints({ ...input, costSamples: samples as BotAiCostSample[] })).toThrow();
    }
  });

  it.each(['root', 'index', 'status', 'amount', 'direction', 'cost', 'hidden'])(
    'rejects a %s accessor without invoking it',
    (location) => {
      const input = sampledConstraints();
      const getter = vi.fn(() => 'private');
      const point = input.costSamples[1];
      if (point.status !== 'available') throw new Error('fixture');
      const [target, key] =
        location === 'root'
          ? [input, 'costSamples']
          : location === 'index'
            ? [input.costSamples, '1']
            : location === 'direction'
              ? [point, 'buy']
              : location === 'cost'
                ? [point.buy, 'networkFeeXor']
                : [point, location === 'amount' ? 'amountInCodec' : location];
      Object.defineProperty(target, key, { get: getter });
      expect(() => copyBotAiResearchConstraints(input)).toThrow();
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('rejects inherited sample records and nested quote-price extensions', () => {
    const input = sampledConstraints();
    input.costSamples[1] = Object.create(input.costSamples[1]);
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
    const nested = sampledConstraints();
    const point = nested.costSamples[1];
    if (point.status === 'available') Object.assign(point.buy, { currentPrice: '123' });
    expect(() => copyBotAiResearchConstraints(nested)).toThrow();
  });
});

describe('bounded public signal warmup metadata', () => {
  it('copies v3 counts and detached warmup dates without prices or a changed funded training window', () => {
    const input = warmedConstraints();
    const copied = copyBotAiResearchConstraints(input)!;
    expect(copied).toEqual(input);
    expect(copied.trainingCandles).toBe(117);
    expect(copied.validationCandles).toBe(50);
    expect(copied.goalEpisodes!.protocol).toBe('goal-episodes-v3');
    if (copied.goalEpisodes!.protocol !== 'goal-episodes-v3') throw new Error('fixture');
    expect(copied.goalEpisodes.signalWarmup).not.toBe(input.goalEpisodes.signalWarmup);
    expect(Object.keys(copied.goalEpisodes.signalWarmup)).toEqual([
      'candles',
      'firstCompletedAt',
      'lastCompletedAt',
      'use',
      'prices',
    ]);
    copied.goalEpisodes.signalWarmup.firstCompletedAt = HOUR;
    expect(input.goalEpisodes.signalWarmup.firstCompletedAt).toBe(FUNDING - 201 * HOUR);
  });

  it.each([
    { candles: 200 },
    { candles: 202 },
    { candles: '201' },
    { candles: 201.5 },
    { use: 'funded' },
    { prices: ['1'] },
    { firstCompletedAt: 0 },
    { firstCompletedAt: -HOUR },
    { firstCompletedAt: '100' },
    { firstCompletedAt: FUNDING - 201 * HOUR + 1 },
    { firstCompletedAt: Number.MAX_SAFE_INTEGER + 1 },
    { firstCompletedAt: Number.NaN },
    { lastCompletedAt: 0 },
    { lastCompletedAt: Number.POSITIVE_INFINITY },
    { lastCompletedAt: FUNDING - HOUR + 1 },
    { lastCompletedAt: FUNDING - 2 * HOUR },
    { lastCompletedAt: FUNDING },
    { close: '1' },
    { observations: [{ timestamp: FUNDING - HOUR, close: '1' }] },
    { [Symbol('private')]: 'secret' },
  ])('rejects malformed, extended, or unbounded metadata %j', (patch) => {
    const input = warmedConstraints();
    Object.assign(input.goalEpisodes.signalWarmup, patch);
    expect(() => copyBotAiResearchConstraints(input)).toThrow('bots.errors.provider');
  });

  it.each(['candles', 'firstCompletedAt', 'lastCompletedAt', 'use', 'prices'] as const)(
    'rejects a missing %s and never invokes its accessor',
    (field) => {
      const input = warmedConstraints();
      const getter = vi.fn(() => input.goalEpisodes.signalWarmup[field]);
      const incomplete = { ...input.goalEpisodes.signalWarmup };
      Reflect.deleteProperty(incomplete, field);
      Object.assign(input.goalEpisodes, { signalWarmup: incomplete });
      expect(() => copyBotAiResearchConstraints(input)).toThrow('bots.errors.provider');
      Object.defineProperty(incomplete, field, { get: getter });
      expect(() => copyBotAiResearchConstraints(input)).toThrow('bots.errors.provider');
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('requires a plain own v3 object and rejects protocol and warmup accessors without invoking them', () => {
    for (const field of ['protocol', 'signalWarmup']) {
      const input = warmedConstraints();
      const getter = vi.fn(() => 'private');
      Object.defineProperty(input.goalEpisodes, field, { get: getter });
      expect(() => copyBotAiResearchConstraints(input)).toThrow('bots.errors.provider');
      expect(getter).not.toHaveBeenCalled();
    }
    for (const value of [undefined, null, [], Object.create(warmedConstraints().goalEpisodes.signalWarmup)]) {
      const input = warmedConstraints();
      Object.assign(input.goalEpisodes, { signalWarmup: value });
      expect(() => copyBotAiResearchConstraints(input)).toThrow('bots.errors.provider');
    }
    const missing = warmedConstraints();
    Reflect.deleteProperty(missing.goalEpisodes, 'signalWarmup');
    expect(() => copyBotAiResearchConstraints(missing)).toThrow('bots.errors.provider');
  });

  it('preserves v2 exactly and forbids claiming any warmup metadata under v2', () => {
    const input = warmedConstraints();
    const { signalWarmup, ...episodes } = input.goalEpisodes;
    const legacy: BotAiResearchConstraints = {
      ...input,
      goalEpisodes: { ...episodes, protocol: 'goal-episodes-v2' },
    };
    expect(copyBotAiResearchConstraints(legacy)).toEqual(legacy);
    expect(copyBotAiResearchConstraints(legacy)!.goalEpisodes).not.toHaveProperty('signalWarmup');
    for (const value of [signalWarmup, undefined]) {
      Object.assign(legacy.goalEpisodes!, { signalWarmup: value });
      expect(() => copyBotAiResearchConstraints(legacy)).toThrow('bots.errors.provider');
    }
  });

  it('binds exactly 117 training closes to the following hour and leaves legacy transports unchanged', () => {
    const input = copyBotAiResearchConstraints(warmedConstraints())!;
    const candles = Array.from({ length: 117 }, (_, index) => ({ timestamp: FUNDING + index * HOUR, close: '1' }));
    expect(() => assertBotAiResearchWindow(input, candles)).not.toThrow();
    const invalid = [
      [],
      candles.slice(1),
      [...candles, { timestamp: FUNDING + 117 * HOUR, close: '1' }],
      candles.map((candle) => ({ ...candle, timestamp: candle.timestamp + HOUR })),
      candles.map((candle) => ({ ...candle, timestamp: candle.timestamp - HOUR })),
      candles.map((candle, index) => (index === 116 ? { ...candle, timestamp: FUNDING + 118 * HOUR } : candle)),
    ];
    for (const candidate of invalid)
      expect(() => assertBotAiResearchWindow(input, candidate)).toThrow('bots.errors.provider');
    expect(() => assertBotAiResearchWindow(undefined, [])).not.toThrow();
    expect(() => assertBotAiResearchWindow(constraints(), [])).not.toThrow();
    const { signalWarmup: _signalWarmup, ...episodes } = warmedConstraints().goalEpisodes;
    const legacy = { ...input, goalEpisodes: { ...episodes, protocol: 'goal-episodes-v2' as const } };
    expect(() => assertBotAiResearchWindow(legacy, [])).not.toThrow();
  });

  it.each([
    { trainingCandles: 118, validationCandles: 50 },
    { trainingCandles: 203, validationCandles: 50 },
    { trainingCandles: 117, validationCandles: 51 },
  ])('rejects changed v3 funded partition sizes even with consistent episode counts %j', (counts) => {
    const input = warmedConstraints();
    Object.assign(input, counts);
    Object.assign(input.goalEpisodes, {
      trainingEpisodes: Math.floor((counts.trainingCandles - 1) / 24),
      trainingTailCandles: (counts.trainingCandles - 1) % 24,
      validationEpisodes: Math.floor((counts.validationCandles - 1) / 24),
      validationTailCandles: (counts.validationCandles - 1) % 24,
    });
    const candles = Array.from({ length: counts.trainingCandles }, (_, index) => ({
      timestamp: FUNDING + index * HOUR,
      close: '1',
    }));
    expect(() => copyBotAiResearchConstraints(input)).toThrow('bots.errors.provider');
    expect(() => assertBotAiResearchWindow(input, candles)).toThrow('bots.errors.provider');
    const { signalWarmup: _signalWarmup, ...episodes } = input.goalEpisodes;
    const legacy: BotAiResearchConstraints = { ...input, goalEpisodes: { ...episodes, protocol: 'goal-episodes-v2' } };
    expect(copyBotAiResearchConstraints(legacy)).toEqual(legacy);
  });
});

describe('public research budget constraints', () => {
  it.each(['0', '1', '1.000000000000000001', '100'])('copies exact policy impact limit %s', (limit) => {
    expect(copyBotAiPriceImpactLimit({ maxPriceImpactPercent: limit })).toBe(limit);
  });

  it.each([undefined, null, 1, '-1', '1e0', '100.000000000000000001', '0.0000000000000000001'])(
    'rejects malformed policy impact limit %s',
    (limit) => {
      expect(() =>
        copyBotAiPriceImpactLimit({ maxPriceImpactPercent: limit } as Parameters<typeof copyBotAiPriceImpactLimit>[0])
      ).toThrow();
    }
  );

  it('refuses inherited or accessor impact limits without invoking getters or copying private fields', () => {
    const getter = vi.fn(() => '1');
    const policy = Object.defineProperty({ maxPriceImpactPercent: '1' }, 'maxPriceImpactPercent', { get: getter });
    expect(() => copyBotAiPriceImpactLimit(policy)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(() => copyBotAiPriceImpactLimit(Object.create({ maxPriceImpactPercent: '1' }))).toThrow();
    expect(copyBotAiPriceImpactLimit(Object.assign({ maxPriceImpactPercent: '1' }, { wallet: 'PRIVATE' }))).toBe('1');
  });

  it('copies fixed episode layout without held-out outcomes and rejects incompatible counts', () => {
    const input = researchConstraintsFixture();
    input.minimumTrades = 1;
    input.maximumIntervalMs = 86_400_000;
    input.goalEpisodes = {
      protocol: 'goal-episodes-v2',
      durationMs: 86_400_000,
      trainingEpisodes: 4,
      validationEpisodes: 2,
      trainingTailCandles: 20,
      validationTailCandles: 1,
      aggregation: 'mean-net-return',
      minimumTradesPerPartition: 1,
    };
    const copy = copyBotAiResearchConstraints(input)!;
    expect(copy).toEqual(input);
    copy.goalEpisodes!.trainingEpisodes = 1;
    expect(input.goalEpisodes.trainingEpisodes).toBe(4);
    for (const patch of [
      { protocol: 'goal-episodes-v1' },
      { trainingEpisodes: 3 },
      { validationTailCandles: 0 },
      { aggregation: 'compound' },
      { minimumTradesPerPartition: 5 },
      { testReturn: '10' },
    ]) {
      expect(() =>
        copyBotAiResearchConstraints({
          ...input,
          goalEpisodes: { ...input.goalEpisodes!, ...patch } as typeof input.goalEpisodes,
        })
      ).toThrow();
    }
  });
  it('detaches the goal horizon and directional costs without admitting raw quote prices', () => {
    const input = researchConstraintsFixture();
    const copy = copyBotAiResearchConstraints(input)!;
    expect(copy).toEqual(input);
    copy.goal!.durationMs = 3_600_000;
    copy.costs!.buy.priceImpactPercent = '0';
    expect(input.goal!.durationMs).toBe(86_400_000);
    expect(input.costs!.buy.priceImpactPercent).not.toBe('0');
    expect(JSON.stringify(copy)).not.toContain('amountOut');
    Object.assign(input.costs!, { amountOut: '123' });
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });
  it.each([
    { durationMs: 0 },
    { durationMs: 30 * 86_400_000 + 1 },
    { targetReturnPercent: '0' },
    { maxLossPercent: '-1' },
    { valuationAsset: 'USD' },
    { lossMetric: 'anything' },
    { latestReturn: '1' },
  ])('rejects malformed or private goal fields %j', (patch) => {
    const input = researchConstraintsFixture();
    Object.assign(input.goal!, patch);
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });
  it.each([
    { networkFeeXor: '0' },
    { networkFeeXor: '0.0000000000000000001' },
    { swapFeePercent: '11' },
    { priceImpactPercent: '100' },
    { priceImpactPercent: null },
    { priceImpactPercent: '-1' },
    { currentPrice: '10' },
  ])('rejects invalid or future-price cost evidence %j', (patch) => {
    const input = researchConstraintsFixture();
    Object.assign(input.costs!.buy, patch);
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });
  it('rejects incomplete provenance and accessors without reading them', () => {
    for (const patch of [
      { finalizedAt: 0 },
      { blockHash: 'unknown' },
      { feeReserveXor: '0' },
      { slippagePercent: '100' },
      { basis: 'historical' },
      { reverseLotBasis: 'actual-holdings' },
      { reserveFunding: 'wallet' },
    ]) {
      const input = researchConstraintsFixture();
      Object.assign(input.costs!, patch);
      expect(() => copyBotAiResearchConstraints(input)).toThrow();
    }
    const input = researchConstraintsFixture();
    const getter = vi.fn(() => '0');
    Object.defineProperty(input.costs!.sell, 'priceImpactPercent', { get: getter });
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('copies exact budget, reserve-adjusted ceiling and reference amount independently', () => {
    const input = constraints();
    const copy = copyBotAiResearchConstraints(input)!;
    expect(copy).toEqual(input);
    copy.sizing!.feeSampleAmountCodec = '1';
    expect(input.sizing!.feeSampleAmountCodec).toBe('1000000000000000001');
    expect(copyBotAiResearchConstraints(undefined)).toBeUndefined();
    const { sizing: _sizing, ...legacy } = input;
    expect(copyBotAiResearchConstraints(legacy)).toEqual(legacy);
  });

  it.each([
    { capitalCodec: '1' },
    { spendableInputCodec: '10000000000000000020' },
    { feeSampleAmountCodec: '9000000000000000019' },
    { feeSampleAmountCodec: '0' },
    { feeSampleAmountCodec: '0.1' },
    { walletBalance: '10000' },
  ])('refuses malformed or unfunded public sizing %#', (patch) => {
    const input = constraints();
    Object.assign(input.sizing!, patch);
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
  });

  it('rejects accessors and hidden fields without invoking or leaking them', () => {
    const input = constraints();
    const getter = vi.fn(() => '100');
    Object.defineProperty(input.sizing!, 'capitalCodec', { get: getter });
    expect(() => copyBotAiResearchConstraints(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const extra = constraints();
    Object.defineProperty(extra, Symbol('wallet'), { value: 'private' });
    expect(() => copyBotAiResearchConstraints(extra)).toThrow();
  });
});
