import { FPNumber } from '@/lib/substrate/math';
import { spendableHoldingCodec } from './allocation';
import { codec, fromCodec, percent, subtractCodec } from './amounts';
import type { AutopilotFeePressureEvidence, AutopilotOpeningEvidence } from './autopilot-diagnostics';
import { decimalRatio, parseBotPrice, portfolioPerformance, valuePortfolio } from './engine';
import type { BotCandle, BotDefinition, BotGoal } from './types';

/** A numerical fee-only scenario at a training mark, not permission to trade. */
interface OpeningResearchFeePoint {
  timestamp: number;
  /** Nonnegative decline, truncated to 36 decimal places; gains are displayed as zero loss. */
  feeOnlyLossPercent: string;
  /** Direct loss comparison, independent of the rounded percentage; baseline goals have no prospective gate. */
  feeOnlyReachesLossLimit: boolean;
}

/** One observed quote fee applied to two training marks, with no conclusion about later opportunities. */
export interface OpeningResearchFeeScenario {
  protocol: 'opening-fee-scenario-v1';
  valuationAsset: 'input' | 'output';
  lossMetric: 'baseline' | 'drawdown';
  maxLossPercent: string;
  opening: OpeningResearchFeePoint;
  firstPossibleTrade: OpeningResearchFeePoint;
  laterOpportunity: 'not-assessed';
}

/**
 * Explain a large fixed fee using the protected opening allocation and the latest completed pool mark.
 * The fee is an exact finalized quote; the older mark is a dated scenario, not a current execution price.
 * Return nothing once either observation is stale or the fee uses less than a quarter of the loss allowance.
 */
export function describeNetworkFeeLossPressure(
  bot: BotDefinition,
  candle: BotCandle,
  goal: Pick<BotGoal, 'valuationAsset' | 'maxLossPercent'>,
  networkFeeCodec: string,
  feeObservation: { finalizedAt: number; expiresAt: number },
  now: number
): AutopilotFeePressureEvidence | null {
  const fee = codec(networkFeeCodec);
  if (
    goal.valuationAsset !== 'output' ||
    bot.assetOut.address !== bot.policy.feeAsset.address ||
    bot.assetIn.address === bot.policy.feeAsset.address ||
    fee <= 0n ||
    fee > codec(bot.policy.feeBudgetCodec) ||
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(candle.timestamp) ||
    !Number.isSafeInteger(feeObservation.finalizedAt) ||
    !Number.isSafeInteger(feeObservation.expiresAt) ||
    candle.timestamp > feeObservation.finalizedAt ||
    candle.timestamp > now ||
    now - candle.timestamp > 2 * 3_600_000 ||
    feeObservation.finalizedAt > now ||
    now - feeObservation.finalizedAt > 300_000 ||
    feeObservation.expiresAt <= now
  )
    return null;
  const value = decimalRatio(
    new FPNumber(valuePortfolio(bot, candle, bot.portfolio.initial), 36),
    parseBotPrice(candle.close)
  );
  const allowance = value.mul(decimalRatio(percent(goal.maxLossPercent), new FPNumber('100', 36)));
  if (!allowance.gt(new FPNumber('0', 36))) return null;
  const share = decimalRatio(new FPNumber(fromCodec(networkFeeCodec, bot.policy.feeAsset.decimals), 36), allowance).mul(
    new FPNumber('100', 36)
  );
  if (!share.gte(new FPNumber('25', 36)) || share.gt(new FPNumber('10000', 36))) return null;
  return {
    sharePercent: share.value.toFixed(1, 1),
    maxLossPercent: goal.maxLossPercent,
    observedAt: feeObservation.finalizedAt,
    markAt: candle.timestamp,
  };
}

/**
 * Describe an already verified current first-buy network fee at the first two TRAINING closes.
 * The caller owns the quoted amount and finalized fee provenance. These are current fees applied
 * to dated training marks, not historical paid fees, executable fills, qualification or future proof.
 *
 * Opening and first-possible-trade scenarios are independent: each subtracts the fee once from
 * untouched allocations, including the protected reserve once in the baseline/peak. The second
 * scenario also includes the unchanged allocation's price movement. No strategy, other amount,
 * later candle or validation data is inspected. A reaches-limit result never rejects a study.
 *
 * Exact flags use the prospective drawdown gate's multiplication comparison, including equality.
 * Baseline flags describe the equivalent numerical loss comparison only; legacy baseline goals
 * have no prospective admission gate. Displayed losses clamp gains to zero and truncate at 36
 * places independently. An unfundable fee returns null, without inventing negative holdings.
 */
export function describeOpeningResearchFee(
  bot: BotDefinition,
  candles: readonly [BotCandle, BotCandle],
  goal: Pick<BotGoal, 'valuationAsset' | 'lossMetric' | 'maxLossPercent'>,
  networkFeeCodec: string
): OpeningResearchFeeScenario | null {
  // Reuse the existing fresh-allocation/chronology checks; its loss result is not a rejection here.
  openingResearchDrawdown(bot, candles, goal);
  if (bot.goalState || ![undefined, 'baseline', 'drawdown'].includes(goal.lossMetric))
    throw new Error('bots.errors.config');
  const fee = codec(networkFeeCodec);
  if (fee === 0n) throw new Error('bots.errors.amount');
  const reserve = codec(bot.policy.feeBudgetCodec);
  const feeAsset = bot.policy.feeAsset.address;
  const feeHolding = bot.portfolio.initial[feeAsset] ?? '0';
  if (codec(feeHolding) < reserve) throw new Error('bots.errors.config');
  if (fee > reserve) return null;

  const valuationAsset = goal.valuationAsset ?? 'input';
  const lossMetric = goal.lossMetric ?? 'baseline';
  const afterFee = { ...bot.portfolio.initial, [feeAsset]: subtractCodec(feeHolding, networkFeeCodec) };
  const value = (candle: BotCandle, holdings: Record<string, string>): FPNumber => {
    const input = new FPNumber(valuePortfolio(bot, candle, holdings), 36);
    return valuationAsset === 'output' ? decimalRatio(input, parseBotPrice(candle.close)) : input;
  };
  const [opening, next] = candles;
  const baseline = value(opening, bot.portfolio.initial);
  const nextValue = value(next, bot.portfolio.initial);
  const limit = percent(goal.maxLossPercent);
  const hundred = new FPNumber('100', 36);
  const point = (candle: BotCandle, reference: FPNumber): OpeningResearchFeePoint => {
    const decline = reference.sub(value(candle, afterFee));
    return {
      timestamp: candle.timestamp,
      feeOnlyLossPercent: decimalRatio(decline.max(new FPNumber('0', 36)), reference)
        .mul(hundred)
        .value.toFixed(36, 1)
        .replace(/\.?0+$/, ''),
      feeOnlyReachesLossLimit: decline.mul(hundred).gte(reference.mul(limit)),
    };
  };
  return {
    protocol: 'opening-fee-scenario-v1',
    valuationAsset,
    lossMetric,
    maxLossPercent: goal.maxLossPercent,
    opening: point(opening, baseline),
    firstPossibleTrade: point(next, lossMetric === 'drawdown' ? baseline.max(nextValue) : baseline),
    laterOpportunity: 'not-assessed',
  };
}

/**
 * Bound the first possible post-fill value of a fresh next-close research allocation.
 * No supported rule can trade before the second close. Its first buy conserves
 * value before nonnegative costs; output inventory is absent or fully reserved.
 * Unchanged holdings therefore give an optimistic upper bound at that close.
 *
 * Only the first two training observations are inspected. This is a sufficient
 * rejection test, never qualification, a forecast, or a test of an ongoing bot.
 */
export function openingResearchDrawdown(
  bot: BotDefinition,
  candles: readonly [BotCandle, BotCandle],
  goal: Pick<BotGoal, 'valuationAsset' | 'maxLossPercent'>
): AutopilotOpeningEvidence | null {
  const { initial, holdings, trades, feesPaidCodec } = bot.portfolio;
  const addresses = new Set([...Object.keys(initial), ...Object.keys(holdings)]);
  if (
    trades !== 0 ||
    codec(feesPaidCodec) !== 0n ||
    [...addresses].some((address) => (initial[address] ?? '0') !== (holdings[address] ?? '0')) ||
    codec(spendableHoldingCodec(bot, bot.assetOut.address)) !== 0n ||
    ![undefined, 'input', 'output'].includes(goal.valuationAsset)
  )
    throw new Error('bots.errors.config');

  const [opening, next] = candles;
  if (
    !opening ||
    !next ||
    !Number.isSafeInteger(opening.timestamp) ||
    !Number.isSafeInteger(next.timestamp) ||
    opening.timestamp <= 0 ||
    next.timestamp <= opening.timestamp
  )
    throw new Error('bots.errors.history');
  const limit = percent(goal.maxLossPercent);
  const equity = [opening, next].map((candle) => {
    const inputValue = new FPNumber(valuePortfolio(bot, candle, initial), 36);
    const value =
      goal.valuationAsset === 'output'
        ? decimalRatio(inputValue, parseBotPrice(candle.close)).toString()
        : inputValue.toString();
    return { timestamp: candle.timestamp, value, benchmark: value };
  });
  if (!new FPNumber(equity[0].value, 36).gt(new FPNumber('0', 36))) throw new Error('bots.errors.history');
  // Match qualification's 36-place calculation and strict comparison. An exact
  // rational comparison could incorrectly reject an excess that replay truncates.
  const lossPercent = portfolioPerformance(equity).drawdownPercent;
  if (!new FPNumber(lossPercent, 36).gt(limit)) return null;
  return {
    lossPercent,
    maxLossPercent: goal.maxLossPercent,
    valuationSymbol: (goal.valuationAsset === 'output' ? bot.assetOut : bot.assetIn).symbol,
    openedAt: opening.timestamp,
    firstTradeAt: next.timestamp,
  };
}
