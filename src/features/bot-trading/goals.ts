import { FPNumber } from '@/lib/substrate/math';
import { codec, percent } from './amounts';
import { decimalRatio, parseBotPrice, valuePortfolio } from './engine';
import type { BotCandle, BotDefinition, BotGoal, BotGoalState } from './types';

const PRECISION = 36;
const ZERO = new FPNumber('0', PRECISION);
const HUNDRED = new FPNumber('100', PRECISION);

/** Validate and copy only public goal settings; durations span one hour through thirty days. */
export function copyBotGoal(goal: BotGoal): BotGoal {
  try {
    if (
      !goal ||
      typeof goal !== 'object' ||
      typeof goal.title !== 'string' ||
      !goal.title.trim() ||
      goal.title.length > 160 ||
      !Number.isSafeInteger(goal.durationMs) ||
      goal.durationMs < 3_600_000 ||
      goal.durationMs > 30 * 24 * 3_600_000 ||
      (goal.valuationAsset !== undefined && !['input', 'output'].includes(goal.valuationAsset)) ||
      (goal.lossMetric !== undefined && !['baseline', 'drawdown'].includes(goal.lossMetric)) ||
      (goal.targetRequiresIdleOutperformance !== undefined && goal.targetRequiresIdleOutperformance !== true) ||
      !percent(goal.targetReturnPercent, '10000').gt(ZERO) ||
      !percent(goal.maxLossPercent).gt(ZERO)
    )
      throw new Error();
    return {
      title: goal.title.trim(),
      targetReturnPercent: goal.targetReturnPercent,
      maxLossPercent: goal.maxLossPercent,
      durationMs: goal.durationMs,
      ...(goal.valuationAsset !== undefined ? { valuationAsset: goal.valuationAsset } : {}),
      ...(goal.lossMetric !== undefined ? { lossMetric: goal.lossMetric } : {}),
      ...(goal.targetRequiresIdleOutperformance ? { targetRequiresIdleOutperformance: true as const } : {}),
    };
  } catch {
    throw new Error('bots.errors.goal');
  }
}

/** Parse a nonnegative portfolio valuation without floating-point or exponent syntax. */
function valuation(value: string): FPNumber {
  if (typeof value !== 'string' || value.length > 120 || !/^(0|[1-9]\d*)(\.\d{1,36})?$/.test(value))
    throw new Error('bots.errors.goal');
  return new FPNumber(value, PRECISION);
}

/** Calculate signed progress from the immutable opening value, with exact decimal arithmetic. */
function progress(baseline: FPNumber, latest: FPNumber): string {
  return decimalRatio(latest.sub(baseline), baseline).mul(HUNDRED).toString();
}

/** Reject corrupted persisted progress instead of silently starting a new goal or changing its baseline. */
export function validateBotGoalState(
  bot: Pick<BotDefinition, 'goal' | 'goalState'> &
    Partial<Pick<BotDefinition, 'assetIn' | 'assetOut' | 'policy' | 'portfolio' | 'state'>>
): void {
  if (!bot.goal) {
    if (bot.goalState !== undefined) throw new Error('bots.errors.goal');
    return;
  }
  const goal = copyBotGoal(bot.goal);
  const state = bot.goalState;
  if (state === undefined) return;
  if (
    !state ||
    typeof state !== 'object' ||
    !Number.isSafeInteger(state.startedAt) ||
    state.startedAt < 0 ||
    !Number.isSafeInteger(state.startedAt + goal.durationMs) ||
    !['active', 'target', 'loss', 'expired'].includes(state.outcome)
  )
    throw new Error('bots.errors.goal');
  const baseline = valuation(state.baselineValue);
  const latest = valuation(state.lastValue);
  if (!baseline.gt(ZERO) || state.returnPercent !== progress(baseline, latest)) throw new Error('bots.errors.goal');
  let idleLastValue: FPNumber | undefined;
  if (goal.targetRequiresIdleOutperformance) {
    const holdings = state.idleHoldings;
    if (
      !holdings ||
      typeof holdings !== 'object' ||
      Array.isArray(holdings) ||
      Object.getPrototypeOf(holdings) !== Object.prototype ||
      Object.keys(holdings).length < 1 ||
      Object.keys(holdings).length > 3
    )
      throw new Error('bots.errors.goal');
    try {
      for (const [asset, amount] of Object.entries(holdings)) {
        if (!asset || asset.length > 128) throw new Error();
        codec(amount);
      }
    } catch {
      throw new Error('bots.errors.goal');
    }
    if (bot.assetIn && bot.assetOut && bot.policy) {
      const assets = [...new Set([bot.assetIn.address, bot.assetOut.address, bot.policy.feeAsset.address])];
      if (assets.length !== Object.keys(holdings).length || assets.some((asset) => !Object.hasOwn(holdings, asset)))
        throw new Error('bots.errors.goal');
    }
    idleLastValue = valuation(state.idleLastValue ?? '');
  }
  const lossReference = goal.lossMetric === 'drawdown' ? valuation(state.peakValue ?? '') : baseline;
  if (goal.lossMetric === 'drawdown' && (lossReference.lt(baseline) || lossReference.lt(latest)))
    throw new Error('bots.errors.goal');
  const lossReached = lossReference
    .sub(latest)
    .mul(HUNDRED)
    .gte(lossReference.mul(new FPNumber(goal.maxLossPercent)));
  if (
    (state.outcome === 'active' && state.completedAt !== undefined) ||
    (state.outcome === 'active' && goal.lossMetric === 'drawdown' && lossReached) ||
    (state.outcome !== 'active' &&
      (!Number.isSafeInteger(state.completedAt) || state.completedAt! < state.startedAt)) ||
    (state.outcome === 'target' &&
      (!latest
        .sub(baseline)
        .mul(HUNDRED)
        .gte(baseline.mul(new FPNumber(goal.targetReturnPercent))) ||
        (goal.lossMetric === 'drawdown' && lossReached) ||
        (goal.targetRequiresIdleOutperformance &&
          (!latest.gt(idleLastValue!) ||
            (bot.portfolio !== undefined &&
              bot.state !== undefined &&
              !(bot.portfolio.trades > 0 && bot.state.lastTradeAt >= state.startedAt)))))) ||
    (state.outcome === 'loss' && !lossReached) ||
    (state.outcome === 'expired' && state.completedAt! < state.startedAt + goal.durationMs)
  )
    throw new Error('bots.errors.goal');
}

/** Freeze the current allocation for an idle benchmark, including any separately funded fee token. */
function openingHoldings(bot: BotDefinition): Record<string, string> {
  return Object.fromEntries(
    [...new Set([bot.assetIn.address, bot.assetOut.address, bot.policy.feeAsset.address])].map((asset) => [
      asset,
      bot.portfolio.holdings[asset] ?? '0',
    ])
  );
}

/**
 * Advance a goal from a fresh observation, or check its durable threshold/deadline before network work.
 * A missing observation never invents an opening price. Outcomes latch until an explicit edit/reset.
 */
export function evaluateBotGoal(bot: BotDefinition, now: number, candle?: BotCandle): BotGoalState | undefined {
  validateBotGoalState(bot);
  if (!bot.goal) return undefined;
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('bots.errors.goal');
  const goal = copyBotGoal(bot.goal);
  let state = bot.goalState ? { ...bot.goalState } : undefined;
  if (state && now < state.startedAt) throw new Error('bots.errors.goal');
  if (state?.outcome !== undefined && state.outcome !== 'active') return state;
  if (candle) {
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp > now || now - candle.timestamp >= 5000)
      throw new Error('bots.errors.stale');
    const inputValue = valuePortfolio(bot, candle);
    const currentValue =
      goal.valuationAsset === 'output'
        ? decimalRatio(valuation(inputValue), parseBotPrice(candle.close)).toString()
        : inputValue;
    const latest = valuation(currentValue);
    if (!state) {
      if (!latest.gt(ZERO)) throw new Error('bots.errors.goal');
      state = {
        startedAt: now,
        baselineValue: currentValue,
        lastValue: currentValue,
        ...(goal.lossMetric === 'drawdown' ? { peakValue: currentValue } : {}),
        ...(goal.targetRequiresIdleOutperformance
          ? { idleHoldings: openingHoldings(bot), idleLastValue: currentValue }
          : {}),
        returnPercent: '0',
        outcome: 'active',
      };
    } else {
      state.lastValue = currentValue;
      state.returnPercent = progress(valuation(state.baselineValue), latest);
      if (goal.lossMetric === 'drawdown') state.peakValue = valuation(state.peakValue!).max(latest).toString();
      if (goal.targetRequiresIdleOutperformance) {
        const idleInputValue = valuePortfolio(bot, candle, state.idleHoldings);
        state.idleLastValue =
          goal.valuationAsset === 'output'
            ? decimalRatio(valuation(idleInputValue), parseBotPrice(candle.close)).toString()
            : idleInputValue;
      }
    }
  }
  if (!state) return undefined;
  if (now >= state.startedAt + goal.durationMs) return { ...state, outcome: 'expired', completedAt: now };
  const lossReference = goal.lossMetric === 'drawdown' ? valuation(state.peakValue!) : valuation(state.baselineValue);
  if (
    lossReference
      .sub(valuation(state.lastValue))
      .mul(HUNDRED)
      .gte(lossReference.mul(new FPNumber(goal.maxLossPercent)))
  )
    return { ...state, outcome: 'loss', completedAt: now };
  const baseline = valuation(state.baselineValue);
  const difference = valuation(state.lastValue).sub(baseline).mul(HUNDRED);
  if (
    difference.gte(baseline.mul(new FPNumber(goal.targetReturnPercent))) &&
    (!goal.targetRequiresIdleOutperformance ||
      (valuation(state.lastValue).gt(valuation(state.idleLastValue!)) &&
        bot.portfolio.trades > 0 &&
        bot.state.lastTradeAt >= state.startedAt))
  )
    return { ...state, outcome: 'target', completedAt: now };
  return state;
}
