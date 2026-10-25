import { FPNumber } from '@/lib/substrate/math';
import { subtractCodec } from './amounts';
import { applyPaperFill, decimalRatio, parseBotPrice, valuePortfolio } from './engine';
import { evaluateBotGoal, validateBotGoalState } from './goals';
import type { PaperFill } from './engine';
import type { BotCandle, BotDefinition, BotGoalState } from './types';

export interface BotGoalTradeAdmission {
  /** Actual observed progress only; callers may persist this even when the proposed trade is rejected. */
  goalState?: BotGoalState;
  rejection?: 'bots.errors.goalComplete' | 'bots.errors.goalTradeCost';
}

/**
 * Refuse an opted-in drawdown trade whose minimum proceeds or failed-swap fee
 * would reach the loss threshold at a fresh observed price. Fill output is the
 * validated quote minimum and fee is its conservative ceiling; route fees and
 * slippage are already included. No hypothetical progress or holdings are saved.
 * Legacy baseline goals retain their existing observed-pause behavior.
 */
export function assessGoalTradeAdmission(
  bot: BotDefinition,
  fill: PaperFill,
  candle: BotCandle,
  now: number
): BotGoalTradeAdmission {
  if (bot.goal?.lossMetric !== 'drawdown') return {};
  validateBotGoalState(bot);
  if (!bot.goalState) throw new Error('bots.errors.goal');
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(candle.timestamp) ||
    candle.timestamp < 0 ||
    candle.timestamp > now ||
    now - candle.timestamp >= 5000
  )
    throw new Error('bots.errors.stale');
  const goalState = evaluateBotGoal(bot, now, candle)!;
  if (goalState.outcome !== 'active') return { goalState, rejection: 'bots.errors.goalComplete' };
  const detached = {
    ...bot,
    goalState: { ...goalState },
    portfolio: {
      ...bot.portfolio,
      initial: { ...bot.portfolio.initial },
      holdings: { ...bot.portfolio.holdings },
    },
  };
  const success = applyPaperFill(detached, fill).holdings;
  const failure = {
    ...detached.portfolio.holdings,
    [fill.feeAsset]: subtractCodec(detached.portfolio.holdings[fill.feeAsset] ?? '0', fill.feeCodec),
  };
  const peak = new FPNumber(goalState.peakValue!, 36);
  const hundred = new FPNumber('100', 36);
  const lossLimit = peak.mul(new FPNumber(bot.goal.maxLossPercent, 36));
  const breaches = (holdings: Record<string, string>): boolean => {
    const inputValue = new FPNumber(valuePortfolio(detached, candle, holdings), 36);
    const value =
      bot.goal!.valuationAsset === 'output' ? decimalRatio(inputValue, parseBotPrice(candle.close)) : inputValue;
    return peak.sub(value).mul(hundred).gte(lossLimit);
  };
  return {
    goalState,
    ...(breaches(success) || breaches(failure) ? { rejection: 'bots.errors.goalTradeCost' as const } : {}),
  };
}
