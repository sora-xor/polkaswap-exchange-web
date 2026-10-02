/**
 * Turns a Quant Loop selection into the workspace's existing bot, research and signal
 * contracts. Nothing here signs, saves or starts a bot: the page passes these values
 * to the established paper flow or to the live funding review and consent dialog.
 */
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { requiredStrategyCandles } from './engine';
import { PLAYGROUND_DEFAULT_SETTINGS } from './playground';
import { QUANT_CAPITAL_XOR, QUANT_FEE_BUDGET_XOR, QUANT_FOLDS, QUANT_TRAIN_PERCENT } from './quant-loop';
import { createResearchBot, type ResearchSettings } from './research';
import { evaluateStrategyRules } from './strategy-rules';
import type { QuantCandidate, QuantLoopResult, QuantMarketResult } from './quant-loop';
import type { ResearchFeeSnapshot } from './research-fees';
import type { BotAsset, BotCandle, BotDefinition, BotHistory, BotResearchSnapshot, StrategyConfig } from './types';

/** One SORA block; rules still decide once per completed hourly close. */
const BLOCK_MS = 6_000;
const HOUR = 3_600_000;
/** Live impact ceilings never exceed this, even when the archive saw larger fills. */
const MAX_IMPACT_CEILING = 20;

/** Everything the page needs to open the existing paper or live review for a selection. */
export interface QuantDeployPayload {
  bot: BotDefinition;
  settings: ResearchSettings;
  research: BotResearchSnapshot;
  denomination: NonNullable<BotHistory['identity']>;
}

/** Live signal states shown on a market card. */
export type QuantSignalState = 'entry' | 'exit' | 'neutral' | 'warmup' | 'unavailable';

export interface QuantSignal {
  state: QuantSignalState;
  /** Completed close the signal used, or null when no observation was available. */
  observedAt: number | null;
  /** First deviation leaf of the entry rule: current distance from the mean and the trigger. */
  deviation: { value: string; threshold: string; window: number } | null;
  source: 'live' | 'archive';
}

/** Rules strategy with the exact researched order size and one-block cadence. */
export function quantStrategy(candidate: QuantCandidate): StrategyConfig {
  return {
    kind: 'rules',
    amount: candidate.amount,
    intervalMs: BLOCK_MS,
    threshold: '',
    direction: 'below',
    fastWindow: PLAYGROUND_DEFAULT_SETTINGS.fastWindow,
    slowWindow: PLAYGROUND_DEFAULT_SETTINGS.slowWindow,
    prompt: '',
    rules: JSON.parse(JSON.stringify(candidate.rules)) as StrategyConfig['rules'],
  };
}

/** Research settings matching the loop: XOR capital including its protected fee reserve. */
export function quantResearchSettings(market: QuantMarketResult, fees?: ResearchFeeSnapshot): ResearchSettings {
  return {
    ...PLAYGROUND_DEFAULT_SETTINGS,
    preset: 'dca',
    capital: QUANT_CAPITAL_XOR,
    tradePercent: 20,
    intervalHours: 1,
    intervalBlocks: 1,
    assetInAddress: XOR.address,
    assetOutAddress: market.asset.address,
    feeBudgetXor: QUANT_FEE_BUDGET_XOR,
    networkFeeXor: fees?.networkFeeXor ?? '',
    swapFeePercent: fees?.swapFeePercent ?? '',
    sellNetworkFeeXor: fees?.sellNetworkFeeXor ?? '',
    sellSwapFeePercent: fees?.sellSwapFeePercent ?? '',
    priceImpactPercent: fees?.priceImpactPercent,
    sellPriceImpactPercent: fees?.sellPriceImpactPercent,
    validation: 'walk-forward',
    trainPercent: QUANT_TRAIN_PERCENT,
    folds: QUANT_FOLDS,
    optimize: false,
    slippagePercent: '0.5',
  };
}

/**
 * Live price-impact ceiling: the largest impact the researched fills needed, rounded up
 * with one point of headroom and bounded. A tighter default (1%) would block every
 * researched trade in these pools; a looser one would admit trades the study never made.
 */
export function quantImpactCeiling(market: QuantMarketResult): string {
  const observed = [
    market.final?.train.maxImpactPercent ?? '0',
    ...(market.walkForward?.fills ?? []).map((fill) => fill.impactPercent),
  ].reduce((largest, value) => Math.max(largest, Math.ceil(Number(value))), 0);
  return String(Math.min(MAX_IMPACT_CEILING, Math.max(2, observed + 1)));
}

/** Build an idle, credential-free template that the existing paper or live flow can review. */
export function createQuantBot(
  market: QuantMarketResult,
  assets: BotAsset[],
  name: string,
  now: number,
  fees?: ResearchFeeSnapshot
): BotDefinition {
  if (market.status !== 'deploy' || !market.final) throw new Error('bots.errors.config');
  const bot = createResearchBot(
    quantResearchSettings(market, fees),
    assets,
    now,
    quantStrategy(market.final.candidate)
  );
  bot.name = name.slice(0, 80);
  bot.policy.maxPriceImpactPercent = quantImpactCeiling(market);
  return bot;
}

/**
 * Compact provenance for the saved bot. Every metric is the chained walk-forward
 * out-of-sample result, so the period starts where blind evaluation started.
 */
export function quantResearchSnapshot(
  result: QuantLoopResult,
  market: QuantMarketResult,
  fees: ResearchFeeSnapshot,
  testedAt: number
): BotResearchSnapshot {
  const walkForward = market.walkForward;
  if (market.status !== 'deploy' || !walkForward) throw new Error('bots.errors.config');
  return {
    version: 1,
    source: 'historical',
    testedAt,
    startAt: walkForward.startAt,
    endAt: walkForward.endAt,
    coverage: 1,
    validation: 'walk-forward',
    trainPercent: QUANT_TRAIN_PERCENT,
    folds: QUANT_FOLDS,
    optimized: true,
    returnPercent: walkForward.returnPercent,
    drawdownPercent: walkForward.drawdownPercent,
    trades: walkForward.trades,
    valuationAsset: 'input',
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

/** The archive's chain identity; the live review rejects a different network or denomination. */
export function quantDenomination(result: QuantLoopResult): NonNullable<BotHistory['identity']> {
  return { genesisHash: result.archive.genesisHash, denominator: result.archive.denominator };
}

/** Request window for the latest completed closes a candidate's rules need. */
export function quantSignalWindow(candidate: QuantCandidate, now: number): { startAt: number; endAt: number } {
  const endAt = Math.floor(now / HOUR) * HOUR;
  const needed = requiredStrategyCandles(quantStrategy(candidate));
  return { startAt: endAt - (needed + 48) * HOUR, endAt };
}

/**
 * Evaluate the exact live rule on completed closes, as a running bot would. The gauge
 * reads the first deviation leaf so users see how far the market is from its trigger.
 */
export function evaluateQuantSignal(
  candidate: QuantCandidate,
  candles: readonly BotCandle[],
  source: QuantSignal['source']
): QuantSignal {
  if (!candles.length) return { state: 'unavailable', observedAt: null, deviation: null, source };
  const needed = requiredStrategyCandles(quantStrategy(candidate));
  const evaluation = evaluateStrategyRules(candidate.rules, candles.slice(-needed));
  const index = candidate.rules.entry.conditions.findIndex((leaf) => leaf.kind === 'deviation');
  const leaf = candidate.rules.entry.conditions[index];
  const evidence = index >= 0 ? evaluation.entryConditions[index] : undefined;
  const deviation =
    leaf && leaf.kind === 'deviation' && evidence?.ready && evidence.value !== null && evidence.threshold !== null
      ? { value: evidence.value, threshold: evidence.threshold, window: leaf.window }
      : null;
  const state: QuantSignalState = !evaluation.ready
    ? 'warmup'
    : evaluation.exit
      ? 'exit'
      : evaluation.entry
        ? 'entry'
        : 'neutral';
  return { state, observedAt: candles[candles.length - 1].timestamp, deviation, source };
}

/** Exact archived closes for a market, formatted like the archive history loader. */
export function quantArchiveCandles(closeUnits: readonly bigint[], timestamps: readonly number[]): BotCandle[] {
  return closeUnits.map((close, index) => {
    const digits = close.toString().padStart(37, '0');
    const fraction = digits.slice(-36).replace(/0+$/, '');
    return { timestamp: timestamps[index], close: `${digits.slice(0, -36)}${fraction ? `.${fraction}` : ''}` };
  });
}
