import type { ResearchFeeSnapshot } from './research-fees';
import { copyStrategyConfig, parseBotPrice } from './engine';
import { copyBotGoal } from './goals';
import { codec } from './amounts';
import {
  MAX_EPISODE_WARMUP_CANDLES,
  type ResearchProgress,
  type ResearchResult,
  type ResearchSettings,
} from './research';
import type { BotCandle, BotGoal, BotResearchSnapshot, StrategyConfig } from './types';

/** One independently reproducible historical study, with optional explicitly reviewed deterministic rules. */
export interface ExperimentDefinition {
  id: string;
  name: string;
  settings: ResearchSettings;
  strategy?: StrategyConfig;
  /** Optional approved goal, evaluated over its own funding-to-expiry interval. */
  goal?: BotGoal;
  /** Earlier hourly observations inform signals without allocating any capital before funding. */
  warmupCandles?: BotCandle[];
  /** One positive output-asset order cap remains fixed across independently funded goal episodes. */
  outputTradeLimitCodec?: string;
}
/** Research status is distinct from bot execution authority and never represents an allocated trading balance. */
export interface ExperimentRun extends ExperimentDefinition {
  status: 'queued' | 'loading' | 'running' | 'complete' | 'error' | 'cancelled';
  /** Fraction of actual decision-bar work completed; loading remains zero until computation begins. */
  progress: number;
  createdAt: number;
  result?: ResearchResult;
  fees?: ResearchFeeSnapshot;
  error?: string;
  partial?: ResearchProgress;
}

export const MAX_EXPERIMENTS = 36;

/** Detach only price observations; the evaluator additionally requires warmup to end immediately before funding. */
function copyWarmupCandles(candles: BotCandle[], fundingAt?: number): BotCandle[] {
  if (!Array.isArray(candles) || candles.length > MAX_EPISODE_WARMUP_CANDLES) throw new Error('bots.errors.history');
  return Array.from(candles, (candle, index) => {
    if (
      !candle ||
      !Number.isSafeInteger(candle.timestamp) ||
      candle.timestamp < 0 ||
      candle.timestamp % 3_600_000 !== 0 ||
      (index > 0 && candle.timestamp - candles[index - 1].timestamp !== 3_600_000) ||
      (fundingAt !== undefined && candle.timestamp >= fundingAt)
    )
      throw new Error('bots.errors.history');
    parseBotPrice(candle.close);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose);
    return {
      timestamp: candle.timestamp,
      close: candle.close,
      ...(candle.feeClose !== undefined ? { feeClose: candle.feeClose } : {}),
    };
  });
}

/** Copy only supported definition fields, preventing provider credentials or execution state entering a study. */
export function copyExperimentDefinition(definition: ExperimentDefinition): ExperimentDefinition {
  if (
    typeof definition.id !== 'string' ||
    !/^[\w-]{1,100}$/.test(definition.id) ||
    typeof definition.name !== 'string' ||
    !definition.name.trim() ||
    definition.name.length > 120 ||
    !definition.settings ||
    typeof definition.settings !== 'object'
  )
    throw new Error('bots.errors.config');
  const keys: Array<keyof ResearchSettings> = [
    'preset',
    'capital',
    'tradePercent',
    'intervalHours',
    'intervalBlocks',
    'days',
    'thresholdPercent',
    'fastWindow',
    'slowWindow',
    'signalTiming',
    'assetInAddress',
    'assetOutAddress',
    'feeBudgetXor',
    'networkFeeXor',
    'swapFeePercent',
    'sellNetworkFeeXor',
    'sellSwapFeePercent',
    'priceImpactPercent',
    'sellPriceImpactPercent',
    'historyStartAt',
    'historyEndAt',
    'validation',
    'trainPercent',
    'folds',
    'optimize',
    'slippagePercent',
  ];
  const settings = Object.fromEntries(
    keys.filter((key) => definition.settings[key] !== undefined).map((key) => [key, definition.settings[key]])
  ) as unknown as ResearchSettings;
  const strategy = definition.strategy ? copyStrategyConfig(definition.strategy) : undefined;
  const goal = definition.goal !== undefined ? copyBotGoal(definition.goal) : undefined;
  if (!goal && (definition.warmupCandles !== undefined || definition.outputTradeLimitCodec !== undefined))
    throw new Error('bots.errors.config');
  const warmupCandles =
    definition.warmupCandles !== undefined
      ? copyWarmupCandles(definition.warmupCandles, settings.historyStartAt)
      : undefined;
  const outputTradeLimitCodec = definition.outputTradeLimitCodec;
  if (outputTradeLimitCodec !== undefined && codec(outputTradeLimitCodec) <= 0n) throw new Error('bots.errors.amount');
  return {
    id: definition.id,
    name: definition.name.trim(),
    settings,
    ...(strategy ? { strategy } : {}),
    ...(goal ? { goal } : {}),
    ...(warmupCandles !== undefined ? { warmupCandles } : {}),
    ...(outputTradeLimitCodec !== undefined ? { outputTradeLimitCodec } : {}),
  };
}

/** Preserve historical provenance when creating a fresh bot; hypothetical holdings never enter its ledger. */
export function makeExperimentSnapshot(result: ResearchResult, fees: ResearchFeeSnapshot): BotResearchSnapshot {
  const candles = result.source.history.candles;
  return {
    version: 1,
    source: result.source.kind,
    testedAt: result.bot.createdAt,
    startAt: candles[0].timestamp,
    endAt: candles.at(-1)!.timestamp,
    coverage: result.result.coverage,
    validation: result.settings.validation,
    trainPercent: result.settings.trainPercent,
    folds: result.settings.folds,
    optimized: result.settings.optimize,
    returnPercent: result.result.returnPercent,
    drawdownPercent: result.result.drawdownPercent,
    trades: result.result.trades,
    networkFeeXor: fees.networkFeeXor,
    swapFeePercent: fees.swapFeePercent,
    sellNetworkFeeXor: fees.sellNetworkFeeXor,
    sellSwapFeePercent: fees.sellSwapFeePercent,
    priceImpactPercent: fees.priceImpactPercent,
    sellPriceImpactPercent: fees.sellPriceImpactPercent,
    feeObservation: {
      blockNumber: fees.blockNumber,
      blockHash: fees.blockHash,
      genesisHash: fees.genesisHash,
      endpoint: fees.endpoint,
      queriedAt: fees.queriedAt,
      ...(fees.finalizedAt !== undefined ? { finalizedAt: fees.finalizedAt } : {}),
      amountIn: fees.amountIn,
      sellAmountIn: fees.sellAmountIn,
    },
  };
}
