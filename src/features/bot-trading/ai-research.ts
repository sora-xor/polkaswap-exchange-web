import { codec, percent, toCodec } from './amounts';
import type { OpeningResearchFeeScenario } from './autopilot-feasibility';
import type { BotCandle, BotPolicy } from './types';

/** Costs for one direction, without quoted prices or output amounts. */
interface BotAiDirectionalCosts {
  networkFeeXor: string;
  swapFeePercent: string;
  priceImpactPercent: string;
}

/** One exact partial input size; unavailable quotes never imply zero costs. */
export type BotAiCostSample =
  | {
      amountInCodec: string;
      status: 'available';
      finalizedAt: number;
      blockHash: string;
      buy: BotAiDirectionalCosts;
      sell: BotAiDirectionalCosts;
      /** Current quoted fee applied only to the first two training marks; never execution authority. */
      openingFeeScenario?: OpeningResearchFeeScenario;
    }
  | { amountInCodec: string; status: 'unavailable'; reason: 'quoteUnavailable' };

/** Public training constraints; no held-out observations or wallet balances. */
export interface BotAiResearchConstraints {
  minimumIntervalMs: number;
  maximumIntervalMs: number;
  minimumTrades: number;
  trainingCandles: number;
  validationCandles: number;
  /** Fixed funding episodes and descriptive aggregation, with no held-out outcomes. */
  goalEpisodes?: {
    durationMs: number;
    trainingEpisodes: number;
    validationEpisodes: number;
    trainingTailCandles: number;
    validationTailCandles: number;
    aggregation: 'mean-net-return';
    /** Legacy wire name: qualification needs one fill per full phase; individual episodes may be idle. */
    minimumTradesPerPartition: 1;
  } & (
    | { protocol: 'goal-episodes-v2'; signalWarmup?: never }
    | {
        protocol: 'goal-episodes-v3';
        /** Signal-only history precedes funding; its prices are never supplied to the assistant. */
        signalWarmup: {
          candles: 201;
          firstCompletedAt: number;
          lastCompletedAt: number;
          use: 'signals-only';
          prices: 'not-supplied';
        };
      }
  );
  /** Input-token base units. A fee sample is not a selected order or funding instruction. */
  sizing?: {
    capitalCodec: string;
    spendableInputCodec: string;
    feeSampleAmountCodec: string;
  };
  /** Explicit goal limits; never current holdings, realized returns or validation outcomes. */
  goal?: {
    targetReturnPercent: string;
    maxLossPercent: string;
    durationMs: number;
    valuationAsset: 'input' | 'output';
    lossMetric: 'baseline' | 'drawdown';
    /** A new GO target must beat the unchanged opening allocation after costs. */
    targetRequiresIdleOutperformance?: true;
  };
  /** Dated execution-cost scenario only: raw quote prices and later market observations stay private to research. */
  costs?: {
    basis: 'current-finalized-scenario';
    finalizedAt: number;
    blockHash: string;
    slippagePercent: string;
    feeReserveXor: string;
    reserveFunding: 'included-in-input' | 'separate';
    reverseLotBasis: 'expected-forward-output';
    buy: BotAiDirectionalCosts;
    sell: BotAiDirectionalCosts;
  };
  /** At most five exact dated size observations, sharing the reference cost semantics above. */
  costSamples?: BotAiCostSample[];
}

const HOUR = 3_600_000;
const invalid = () => new Error('bots.errors.provider');

/** Copy the authoritative impact ceiling without invoking an untrusted policy accessor. */
export function copyBotAiPriceImpactLimit(policy: Pick<BotPolicy, 'maxPriceImpactPercent'>): string {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw invalid();
  const prototype = Object.getPrototypeOf(policy);
  if (prototype !== Object.prototype && prototype !== null) throw invalid();
  const field = Object.getOwnPropertyDescriptor(policy, 'maxPriceImpactPercent');
  if (!field || !('value' in field) || typeof field.value !== 'string') throw invalid();
  percent(field.value);
  return field.value;
}

/** Reject extensions and accessors before copying a public research object. */
function fields(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    required.some((key) => !Object.hasOwn(descriptors, key)) ||
    Reflect.ownKeys(descriptors).some(
      (key) => typeof key !== 'string' || ![...required, ...optional].includes(key) || !('value' in descriptors[key])
    )
  )
    throw invalid();
  return value as Record<string, unknown>;
}

/** Apply the same exact cost validation to the reference and every additional size. */
function copyDirectionalCosts(raw: unknown): BotAiDirectionalCosts {
  const leg = fields(raw, ['networkFeeXor', 'swapFeePercent', 'priceImpactPercent']);
  if (
    typeof leg.networkFeeXor !== 'string' ||
    codec(toCodec(leg.networkFeeXor, 18)) === 0n ||
    typeof leg.swapFeePercent !== 'string' ||
    percent(leg.swapFeePercent, '10').gte(percent('100')) ||
    typeof leg.priceImpactPercent !== 'string' ||
    percent(leg.priceImpactPercent).gte(percent('100'))
  )
    throw invalid();
  return {
    networkFeeXor: leg.networkFeeXor,
    swapFeePercent: leg.swapFeePercent,
    priceImpactPercent: leg.priceImpactPercent,
  };
}

/** Reject holes, extensions and accessors before reading at most five exact cost samples. */
function sampleRecords(value: unknown): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<string, PropertyDescriptor>;
  const length = descriptors.length.value as number;
  if (!Number.isSafeInteger(length) || length < 1 || length > 5) throw invalid();
  if (Reflect.ownKeys(descriptors).length !== length + 1) throw invalid();
  const result: unknown[] = [];
  for (let index = 0; index < length; index++) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !('value' in descriptor)) throw invalid();
    result.push(descriptor.value);
  }
  return result;
}

/** Require the reference observation to be identical across both public representations. */
function sameDirectionalCosts(left: BotAiDirectionalCosts, right: BotAiDirectionalCosts): boolean {
  return (
    left.networkFeeXor === right.networkFeeXor &&
    left.swapFeePercent === right.swapFeePercent &&
    left.priceImpactPercent === right.priceImpactPercent
  );
}

/** Copy descriptive first-close costs without admitting prices, later observations or trading authority. */
function copyOpeningFeeScenario(
  raw: unknown,
  goal: BotAiResearchConstraints['goal'],
  finalizedAt: number
): OpeningResearchFeeScenario {
  const scenario = fields(raw, [
    'protocol',
    'valuationAsset',
    'lossMetric',
    'maxLossPercent',
    'opening',
    'firstPossibleTrade',
    'laterOpportunity',
  ]);
  if (
    !goal ||
    scenario.protocol !== 'opening-fee-scenario-v1' ||
    scenario.valuationAsset !== goal.valuationAsset ||
    scenario.lossMetric !== goal.lossMetric ||
    scenario.maxLossPercent !== goal.maxLossPercent ||
    scenario.laterOpportunity !== 'not-assessed'
  )
    throw invalid();
  const point = (input: unknown): OpeningResearchFeeScenario['opening'] => {
    const item = fields(input, ['timestamp', 'feeOnlyLossPercent', 'feeOnlyReachesLossLimit']);
    if (
      !Number.isSafeInteger(item.timestamp) ||
      (item.timestamp as number) <= 0 ||
      (item.timestamp as number) > finalizedAt ||
      typeof item.feeOnlyLossPercent !== 'string' ||
      codec(toCodec(item.feeOnlyLossPercent, 36)) > 100n * 10n ** 36n ||
      typeof item.feeOnlyReachesLossLimit !== 'boolean'
    )
      throw invalid();
    // The exact comparison is computed before the display ratio is truncated.
    // This copied flag is descriptive only; every fill still uses live admission.
    return {
      timestamp: item.timestamp as number,
      feeOnlyLossPercent: item.feeOnlyLossPercent,
      feeOnlyReachesLossLimit: item.feeOnlyReachesLossLimit,
    };
  };
  const opening = point(scenario.opening);
  const firstPossibleTrade = point(scenario.firstPossibleTrade);
  if (firstPossibleTrade.timestamp <= opening.timestamp) throw invalid();
  return {
    protocol: 'opening-fee-scenario-v1',
    valuationAsset: goal.valuationAsset,
    lossMetric: goal.lossMetric,
    maxLossPercent: goal.maxLossPercent,
    opening,
    firstPossibleTrade,
    laterOpportunity: 'not-assessed',
  };
}

/** Detach the same bounded budget and sample constraints for every assistant transport. */
export function copyBotAiResearchConstraints(
  value: BotAiResearchConstraints | undefined
): BotAiResearchConstraints | undefined {
  if (value === undefined) return;
  const keys = ['minimumIntervalMs', 'maximumIntervalMs', 'minimumTrades', 'trainingCandles', 'validationCandles'];
  const data = fields(value, keys, ['sizing', 'goal', 'costs', 'goalEpisodes', 'costSamples']);
  if (keys.some((key) => typeof data[key] !== 'number' || !Number.isSafeInteger(data[key]))) throw invalid();
  const { minimumIntervalMs, maximumIntervalMs, minimumTrades, trainingCandles, validationCandles } = value;
  if (
    minimumIntervalMs < HOUR ||
    maximumIntervalMs > 24 * HOUR ||
    maximumIntervalMs < minimumIntervalMs ||
    minimumIntervalMs % HOUR !== 0 ||
    maximumIntervalMs % HOUR !== 0 ||
    minimumTrades < 1 ||
    minimumTrades > 1000 ||
    trainingCandles < 2 ||
    trainingCandles > 2160 ||
    validationCandles < 2 ||
    validationCandles > 2160 ||
    minimumTrades >= Math.min(trainingCandles, validationCandles)
  )
    throw invalid();
  let sizing: BotAiResearchConstraints['sizing'];
  if (data.sizing !== undefined) {
    const size = fields(data.sizing, ['capitalCodec', 'spendableInputCodec', 'feeSampleAmountCodec']);
    if (Object.values(size).some((item) => typeof item !== 'string')) throw invalid();
    const { capitalCodec, spendableInputCodec, feeSampleAmountCodec } = size as NonNullable<
      BotAiResearchConstraints['sizing']
    >;
    if (
      codec(feeSampleAmountCodec) === 0n ||
      codec(feeSampleAmountCodec) > codec(spendableInputCodec) ||
      codec(spendableInputCodec) > codec(capitalCodec)
    )
      throw invalid();
    sizing = { capitalCodec, spendableInputCodec, feeSampleAmountCodec };
  }
  let goal: BotAiResearchConstraints['goal'];
  if (data.goal !== undefined) {
    const g = fields(
      data.goal,
      ['targetReturnPercent', 'maxLossPercent', 'durationMs', 'valuationAsset', 'lossMetric'],
      ['targetRequiresIdleOutperformance']
    );
    if (
      typeof g.targetReturnPercent !== 'string' ||
      typeof g.maxLossPercent !== 'string' ||
      !percent(g.targetReturnPercent, '10000').gt(percent('0')) ||
      !percent(g.maxLossPercent).gt(percent('0')) ||
      !Number.isSafeInteger(g.durationMs) ||
      (g.durationMs as number) < HOUR ||
      (g.durationMs as number) > 30 * 24 * HOUR ||
      !['input', 'output'].includes(g.valuationAsset as string) ||
      !['baseline', 'drawdown'].includes(g.lossMetric as string) ||
      (g.targetRequiresIdleOutperformance !== undefined && g.targetRequiresIdleOutperformance !== true)
    )
      throw invalid();
    goal = {
      targetReturnPercent: g.targetReturnPercent,
      maxLossPercent: g.maxLossPercent,
      durationMs: g.durationMs as number,
      valuationAsset: g.valuationAsset as 'input' | 'output',
      lossMetric: g.lossMetric as 'baseline' | 'drawdown',
      ...(g.targetRequiresIdleOutperformance ? { targetRequiresIdleOutperformance: true } : {}),
    };
  }
  let goalEpisodes: BotAiResearchConstraints['goalEpisodes'];
  if (data.goalEpisodes !== undefined) {
    const e = fields(
      data.goalEpisodes,
      [
        'protocol',
        'durationMs',
        'trainingEpisodes',
        'validationEpisodes',
        'trainingTailCandles',
        'validationTailCandles',
        'aggregation',
        'minimumTradesPerPartition',
      ],
      ['signalWarmup']
    );
    const hours = 24;
    if (
      !goal ||
      goal.durationMs !== hours * HOUR ||
      e.durationMs !== goal.durationMs ||
      (e.protocol !== 'goal-episodes-v2' && e.protocol !== 'goal-episodes-v3') ||
      (e.protocol === 'goal-episodes-v3' && (trainingCandles !== 117 || validationCandles !== 50)) ||
      e.aggregation !== 'mean-net-return' ||
      e.minimumTradesPerPartition !== 1 ||
      minimumTrades !== 1 ||
      e.trainingEpisodes !== Math.floor((trainingCandles - 1) / hours) ||
      e.validationEpisodes !== Math.floor((validationCandles - 1) / hours) ||
      e.trainingTailCandles !== (trainingCandles - 1) % hours ||
      e.validationTailCandles !== (validationCandles - 1) % hours ||
      (e.trainingEpisodes as number) < 1 ||
      (e.validationEpisodes as number) < 1
    )
      throw invalid();
    const episodes = {
      durationMs: goal.durationMs,
      trainingEpisodes: e.trainingEpisodes as number,
      validationEpisodes: e.validationEpisodes as number,
      trainingTailCandles: e.trainingTailCandles as number,
      validationTailCandles: e.validationTailCandles as number,
      aggregation: 'mean-net-return' as const,
      minimumTradesPerPartition: 1 as const,
    };
    if (e.protocol === 'goal-episodes-v2') {
      if (Object.hasOwn(e, 'signalWarmup')) throw invalid();
      goalEpisodes = { ...episodes, protocol: 'goal-episodes-v2' };
    } else {
      const warmup = fields(e.signalWarmup, ['candles', 'firstCompletedAt', 'lastCompletedAt', 'use', 'prices']);
      const first = warmup.firstCompletedAt as number;
      const last = warmup.lastCompletedAt as number;
      if (
        warmup.candles !== 201 ||
        warmup.use !== 'signals-only' ||
        warmup.prices !== 'not-supplied' ||
        !Number.isSafeInteger(first) ||
        !Number.isSafeInteger(last) ||
        first <= 0 ||
        last <= 0 ||
        first % HOUR !== 0 ||
        last % HOUR !== 0 ||
        first + 200 * HOUR !== last
      )
        throw invalid();
      // The transport additionally binds the final warmup close to its first
      // training close. No funding time or prior prices are inferred here.
      goalEpisodes = {
        ...episodes,
        protocol: 'goal-episodes-v3',
        signalWarmup: {
          candles: 201,
          firstCompletedAt: first,
          lastCompletedAt: last,
          use: 'signals-only',
          prices: 'not-supplied',
        },
      };
    }
  }
  let costs: BotAiResearchConstraints['costs'];
  if (data.costs !== undefined) {
    const c = fields(data.costs, [
      'basis',
      'finalizedAt',
      'blockHash',
      'slippagePercent',
      'feeReserveXor',
      'reserveFunding',
      'reverseLotBasis',
      'buy',
      'sell',
    ]);
    if (
      c.basis !== 'current-finalized-scenario' ||
      c.reverseLotBasis !== 'expected-forward-output' ||
      !['included-in-input', 'separate'].includes(c.reserveFunding as string) ||
      !Number.isSafeInteger(c.finalizedAt) ||
      (c.finalizedAt as number) <= 0 ||
      typeof c.blockHash !== 'string' ||
      !/^0x[0-9a-f]{64}$/i.test(c.blockHash) ||
      typeof c.slippagePercent !== 'string' ||
      percent(c.slippagePercent).gte(percent('100')) ||
      typeof c.feeReserveXor !== 'string' ||
      codec(toCodec(c.feeReserveXor, 18)) === 0n
    )
      throw invalid();
    costs = {
      basis: c.basis,
      finalizedAt: c.finalizedAt as number,
      blockHash: c.blockHash,
      slippagePercent: c.slippagePercent,
      feeReserveXor: c.feeReserveXor,
      reverseLotBasis: c.reverseLotBasis,
      reserveFunding: c.reserveFunding as 'included-in-input' | 'separate',
      buy: copyDirectionalCosts(c.buy),
      sell: copyDirectionalCosts(c.sell),
    };
  }
  let costSamples: BotAiCostSample[] | undefined;
  if (data.costSamples !== undefined) {
    if (!sizing || !costs) throw invalid();
    const spendable = codec(sizing.spendableInputCodec);
    const amounts = new Set<string>();
    costSamples = sampleRecords(data.costSamples).map((raw): BotAiCostSample => {
      const sample = fields(
        raw,
        ['amountInCodec', 'status'],
        ['finalizedAt', 'blockHash', 'buy', 'sell', 'reason', 'openingFeeScenario']
      );
      if (typeof sample.amountInCodec !== 'string') throw invalid();
      const amount = codec(sample.amountInCodec);
      if (amount === 0n || amount >= spendable || amounts.has(sample.amountInCodec)) throw invalid();
      amounts.add(sample.amountInCodec);
      if (sample.status === 'unavailable') {
        fields(raw, ['amountInCodec', 'status', 'reason']);
        if (sample.reason !== 'quoteUnavailable') throw invalid();
        return { amountInCodec: sample.amountInCodec, status: 'unavailable', reason: 'quoteUnavailable' };
      }
      fields(raw, ['amountInCodec', 'status', 'finalizedAt', 'blockHash', 'buy', 'sell'], ['openingFeeScenario']);
      if (
        sample.status !== 'available' ||
        !Number.isSafeInteger(sample.finalizedAt) ||
        (sample.finalizedAt as number) <= 0 ||
        typeof sample.blockHash !== 'string' ||
        !/^0x[0-9a-f]{64}$/i.test(sample.blockHash)
      )
        throw invalid();
      return {
        amountInCodec: sample.amountInCodec,
        status: 'available',
        finalizedAt: sample.finalizedAt as number,
        blockHash: sample.blockHash,
        buy: copyDirectionalCosts(sample.buy),
        sell: copyDirectionalCosts(sample.sell),
        ...(sample.openingFeeScenario !== undefined
          ? {
              openingFeeScenario: copyOpeningFeeScenario(sample.openingFeeScenario, goal, sample.finalizedAt as number),
            }
          : {}),
      };
    });
    const reference = costSamples.find((sample) => sample.amountInCodec === sizing.feeSampleAmountCodec);
    if (
      !reference ||
      reference.status !== 'available' ||
      reference.finalizedAt !== costs.finalizedAt ||
      reference.blockHash !== costs.blockHash ||
      !sameDirectionalCosts(reference.buy, costs.buy) ||
      !sameDirectionalCosts(reference.sell, costs.sell)
    )
      throw invalid();
  }
  return {
    minimumIntervalMs,
    maximumIntervalMs,
    minimumTrades,
    trainingCandles,
    validationCandles,
    ...(sizing ? { sizing } : {}),
    ...(goal ? { goal } : {}),
    ...(goalEpisodes ? { goalEpisodes } : {}),
    ...(costs ? { costs } : {}),
    ...(costSamples ? { costSamples } : {}),
  };
}

/** Bind v3 metadata to the exact funded training window without exposing warmup prices. */
export function assertBotAiResearchWindow(
  research: BotAiResearchConstraints | undefined,
  candles: readonly BotCandle[]
): void {
  if (research?.goalEpisodes?.protocol !== 'goal-episodes-v3') return;
  const first = candles[0]?.timestamp;
  const last = candles.at(-1)?.timestamp;
  if (
    research.trainingCandles !== 117 ||
    research.validationCandles !== 50 ||
    candles.length !== research.trainingCandles ||
    typeof first !== 'number' ||
    typeof last !== 'number' ||
    !Number.isSafeInteger(first) ||
    !Number.isSafeInteger(last) ||
    first !== research.goalEpisodes.signalWarmup.lastCompletedAt + HOUR ||
    last !== first + (candles.length - 1) * HOUR
  )
    throw invalid();
}
