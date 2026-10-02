/** Exact, offline KUSD/XOR goal accounting. Quotes, causal scheduling and qualification belong to callers. */
import { assertTradeFunds } from '../../src/features/bot-trading/allocation';
import { applyPaperFill, validateStrategy, type PaperFill } from '../../src/features/bot-trading/engine';
import { toCodec } from '../../src/features/bot-trading/amounts';
import type { BotDefinition } from '../../src/features/bot-trading/types';

const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const UNIT = 10n ** 18n;
const MAX_U128 = (1n << 128n) - 1n;
const DAY = 86_400_000;
const states = new WeakSet<object>();

/** Ratios represent XOR codec units; arithmetic never rounds them to a token price. */
export interface HistoricalGoalRatio {
  readonly numerator: string;
  readonly denominator: string;
}

/** Same-state positive pool reserves; block provenance is verified by the ordered replay driver. */
export interface HistoricalGoalMark {
  readonly timestampMs: number;
  readonly blockHash: string;
  readonly kusdReserveCodec: string;
  readonly xorReserveCodec: string;
}

export interface HistoricalGoalEpisode {
  readonly startedAtMs: number;
  readonly endedAtMs: number;
}

/** Serializable immutable state, accepted only from this reducer; no restore or trading authority is provided. */
export interface HistoricalGoalLedgerState {
  readonly version: 1;
  readonly purpose: 'development';
  readonly episode: HistoricalGoalEpisode;
  readonly bot: Readonly<BotDefinition>;
  readonly openingValue: HistoricalGoalRatio;
  readonly goalPeakValue: HistoricalGoalRatio;
  readonly performancePeakValue: HistoricalGoalRatio;
  readonly latestValue: HistoricalGoalRatio;
  /** Fraction of the observed performance peak, not a percentage; continues after stopping. */
  readonly maximumDrawdownRatio: HistoricalGoalRatio;
  readonly outcome: 'active' | 'target' | 'loss' | 'expired';
  readonly stoppedAtMs?: number;
  readonly lastMark: HistoricalGoalMark;
  readonly scenarioFailures: number;
}

export type HistoricalGoalFillRejection = 'goalComplete' | 'goalTradeCost' | 'balance' | 'feeBudget' | 'tradeLimit';
export type HistoricalGoalFillScenario = 'minimum-output-success' | 'fee-only-failure';
export interface HistoricalGoalFillAssessment {
  readonly state: HistoricalGoalLedgerState;
  readonly rejection?: HistoricalGoalFillRejection;
  readonly successValue?: HistoricalGoalRatio;
  readonly failureValue?: HistoricalGoalRatio;
}

/** The deadline is an accounting clock, distinct from the retained block's observed timestamp. */
export interface HistoricalGoalTerminalPolicy {
  readonly accountingAtMs: number;
  readonly maximumAgeMs: number;
}

/** Terminal evidence is intentionally not a live ledger state and cannot be marked or filled again. */
export interface HistoricalGoalTerminalAccounting extends Omit<
  HistoricalGoalLedgerState,
  'version' | 'outcome' | 'stoppedAtMs'
> {
  readonly kind: 'historical-goal-terminal-accounting';
  readonly accountingAtMs: number;
  readonly observedAtMs: number;
  readonly ageMs: number;
  readonly maximumAgeMs: number;
  readonly outcome: 'target' | 'loss' | 'expired';
  readonly stoppedAtMs: number;
}

const fail = (): never => {
  throw new Error('Invalid historical goal ledger input');
};
const requireValue = (condition: unknown): void => {
  if (!condition) fail();
};

/** Detach bounded plain data without invoking accessors, toJSON, inherited fields or sparse array elements. */
function copyData<T>(input: T): T {
  let count = 0;
  const copy = (value: unknown, depth: number): unknown => {
    if (++count > 20_000 || depth > 24) return fail();
    if (value === null || value === undefined || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length <= 100_000 ? value : fail();
    if (typeof value === 'number') return Number.isFinite(value) ? value : fail();
    if (!value || typeof value !== 'object') return fail();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string' || !('value' in descriptors[key]))) return fail();
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 5_000 || keys.length !== value.length + 1)
        return fail();
      return Array.from({ length: value.length }, (_, i) => {
        if (!Object.hasOwn(descriptors, String(i)) || !descriptors[i].enumerable) return fail();
        return copy(descriptors[i].value, depth + 1);
      });
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail();
    if (keys.some((key) => !descriptors[key as string].enumerable)) return fail();
    return Object.fromEntries(keys.map((key) => [key, copy(descriptors[key as string].value, depth + 1)]));
  };
  return copy(input, 0) as T;
}

function exactKeys(value: object, keys: string[]): void {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value));
  const own = Object.keys(value);
  requireValue(own.length === keys.length && keys.every((key) => own.includes(key)));
}

function amount(value: unknown, positive = false): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(value)) return fail();
  const result = BigInt(value);
  return result <= MAX_U128 && (!positive || result > 0n) ? result : fail();
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function ratio(numerator: bigint, denominator: bigint): HistoricalGoalRatio {
  requireValue(numerator >= 0n && denominator > 0n);
  let a = numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  return { numerator: String(numerator / a), denominator: String(denominator / a) };
}

function compare(a: HistoricalGoalRatio, b: HistoricalGoalRatio): bigint {
  return BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
}

function drawdown(peak: HistoricalGoalRatio, current: HistoricalGoalRatio): HistoricalGoalRatio {
  const difference = compare(peak, current);
  return difference <= 0n ? ratio(0n, 1n) : ratio(difference, BigInt(peak.numerator) * BigInt(current.denominator));
}

function lossReached(peak: HistoricalGoalRatio, current: HistoricalGoalRatio): boolean {
  const loss = drawdown(peak, current);
  return BigInt(loss.numerator) * 100n >= BigInt(loss.denominator) * 5n;
}

function valueAt(bot: Readonly<BotDefinition>, mark: HistoricalGoalMark): HistoricalGoalRatio {
  const k = amount(bot.portfolio.holdings[KUSD]);
  const x = amount(bot.portfolio.holdings[XOR]);
  const rk = amount(mark.kusdReserveCodec, true);
  return ratio(k * amount(mark.xorReserveCodec, true) + x * rk, rk);
}

function markCopy(input: HistoricalGoalMark): HistoricalGoalMark {
  const mark = copyData(input);
  exactKeys(mark, ['timestampMs', 'blockHash', 'kusdReserveCodec', 'xorReserveCodec']);
  requireValue(Number.isSafeInteger(mark.timestampMs) && mark.timestampMs >= 0);
  requireValue(typeof mark.blockHash === 'string' && /^0x[0-9a-f]{64}$/.test(mark.blockHash));
  amount(mark.kusdReserveCodec, true);
  amount(mark.xorReserveCodec, true);
  return mark;
}

function retain(state: HistoricalGoalLedgerState): HistoricalGoalLedgerState {
  freeze(state);
  states.add(state);
  return state;
}

/** Establish one immutable funded baseline. No missing or later funding observation is inferred. */
export function createHistoricalGoalLedger(
  input: BotDefinition,
  inputEpisode: HistoricalGoalEpisode,
  openingMark: HistoricalGoalMark
): HistoricalGoalLedgerState {
  const bot = copyData(input);
  const episode = copyData(inputEpisode);
  exactKeys(episode, ['startedAtMs', 'endedAtMs']);
  requireValue(Number.isSafeInteger(episode.startedAtMs) && episode.startedAtMs >= 0);
  requireValue(Number.isSafeInteger(episode.endedAtMs) && episode.endedAtMs - episode.startedAtMs === DAY);
  const mark = markCopy(openingMark);
  requireValue(mark.timestampMs === episode.startedAtMs);
  requireValue(bot.mode === 'paper' && bot.goalState === undefined);
  requireValue(bot.assetIn.address === KUSD && bot.assetOut.address === XOR && bot.policy.feeAsset.address === XOR);
  requireValue([bot.assetIn, bot.assetOut, bot.policy.feeAsset].every((asset) => asset.decimals === 18));
  requireValue(bot.policy.slippagePercent === '0.5' && bot.policy.maxPriceImpactPercent === '1');
  requireValue(bot.policy.feeBudgetCodec === String(UNIT) && bot.policy.sessionDurationMs === DAY);
  requireValue(
    bot.goal?.durationMs === DAY &&
      bot.goal.targetReturnPercent === '5' &&
      bot.goal.maxLossPercent === '5' &&
      bot.goal.valuationAsset === 'output' &&
      bot.goal.lossMetric === 'drawdown'
  );
  exactKeys(bot.portfolio.initial, [KUSD, XOR]);
  exactKeys(bot.portfolio.holdings, [KUSD, XOR]);
  exactKeys(bot.policy.maxTradeCodec, [KUSD, XOR]);
  const capital = amount(bot.portfolio.initial[KUSD], true);
  requireValue(capital <= 10n * UNIT && bot.portfolio.initial[XOR] === String(UNIT));
  requireValue([KUSD, XOR].every((asset) => bot.portfolio.holdings[asset] === bot.portfolio.initial[asset]));
  requireValue(bot.portfolio.feesPaidCodec === '0' && bot.portfolio.trades === 0);
  exactKeys(bot.state, ['lastEvaluatedAt', 'lastTradeAt']);
  requireValue(bot.state.lastEvaluatedAt === 0 && bot.state.lastTradeAt === 0);
  requireValue(amount(bot.policy.maxTradeCodec[KUSD], true) <= capital);
  amount(bot.policy.maxTradeCodec[XOR]);
  validateStrategy(bot);
  requireValue(amount(toCodec(bot.strategy.amount, 18), true) < capital);
  const openingValue = valueAt(bot, mark);
  return retain({
    version: 1,
    purpose: 'development',
    episode,
    bot,
    openingValue,
    goalPeakValue: openingValue,
    performancePeakValue: openingValue,
    latestValue: openingValue,
    maximumDrawdownRatio: ratio(0n, 1n),
    outcome: 'active',
    lastMark: mark,
    scenarioFailures: 0,
  });
}

/** Observe held inventory through the endpoint, preserving any stopped goal and its original peak. */
export function markHistoricalGoalLedger(
  state: HistoricalGoalLedgerState,
  inputMark: HistoricalGoalMark
): HistoricalGoalLedgerState {
  if (!states.has(state)) return fail();
  const mark = markCopy(inputMark);
  requireValue(mark.timestampMs >= state.lastMark.timestampMs && mark.timestampMs <= state.episode.endedAtMs);
  if (mark.timestampMs === state.lastMark.timestampMs) {
    requireValue(
      mark.blockHash === state.lastMark.blockHash &&
        mark.kusdReserveCodec === state.lastMark.kusdReserveCodec &&
        mark.xorReserveCodec === state.lastMark.xorReserveCodec
    );
  } else requireValue(mark.blockHash !== state.lastMark.blockHash);
  const latestValue = valueAt(state.bot, mark);
  const performancePeakValue =
    compare(latestValue, state.performancePeakValue) > 0n ? latestValue : state.performancePeakValue;
  const loss = drawdown(performancePeakValue, latestValue);
  const maximumDrawdownRatio = compare(loss, state.maximumDrawdownRatio) > 0n ? loss : state.maximumDrawdownRatio;
  const goalPeakValue =
    state.outcome === 'active' && compare(latestValue, state.goalPeakValue) > 0n ? latestValue : state.goalPeakValue;
  let outcome = state.outcome;
  if (outcome === 'active') {
    if (mark.timestampMs === state.episode.endedAtMs) outcome = 'expired';
    else if (
      compare(latestValue, state.openingValue) * 100n >=
      BigInt(state.openingValue.numerator) * BigInt(latestValue.denominator) * 5n
    )
      outcome = 'target';
    else if (lossReached(goalPeakValue, latestValue)) outcome = 'loss';
  }
  return retain({
    ...state,
    latestValue,
    goalPeakValue,
    performancePeakValue,
    maximumDrawdownRatio,
    outcome,
    lastMark: mark,
    ...(state.outcome === 'active' && outcome !== 'active' ? { stoppedAtMs: mark.timestampMs } : {}),
  });
}

function fillCopy(input: PaperFill): PaperFill {
  const fill = copyData(input);
  exactKeys(fill, ['inputAsset', 'inputCodec', 'outputAsset', 'outputCodec', 'feeAsset', 'feeCodec']);
  requireValue(
    (fill.inputAsset === KUSD && fill.outputAsset === XOR) || (fill.inputAsset === XOR && fill.outputAsset === KUSD)
  );
  requireValue(fill.feeAsset === XOR);
  amount(fill.inputCodec, true);
  amount(fill.outputCodec, true);
  amount(fill.feeCodec, true);
  return fill;
}

/** Mark actual holdings, then test both minimum-output success and fee-only failure without saving either. */
export function assessHistoricalGoalFill(
  inputState: HistoricalGoalLedgerState,
  inputFill: PaperFill,
  mark: HistoricalGoalMark
): HistoricalGoalFillAssessment {
  const state = markHistoricalGoalLedger(inputState, mark);
  const fill = fillCopy(inputFill);
  if (state.outcome !== 'active') return freeze({ state, rejection: 'goalComplete' });
  if (fill.inputAsset === KUSD && amount(fill.inputCodec) >= amount(state.bot.portfolio.initial[KUSD]))
    return freeze({ state, rejection: 'tradeLimit' });
  let success: BotDefinition;
  try {
    assertTradeFunds(state.bot as BotDefinition, fill.inputAsset, fill.inputCodec, fill.feeCodec);
    success = { ...state.bot, portfolio: applyPaperFill(state.bot as BotDefinition, fill) };
  } catch (error) {
    const errors: Record<string, HistoricalGoalFillRejection> = {
      'bots.errors.balance': 'balance',
      'bots.errors.feeBudget': 'feeBudget',
      'bots.errors.policy': 'tradeLimit',
    };
    if (error instanceof Error && Object.hasOwn(errors, error.message))
      return freeze({ state, rejection: errors[error.message] });
    throw error;
  }
  const failure = {
    ...state.bot,
    portfolio: {
      ...state.bot.portfolio,
      holdings: {
        ...state.bot.portfolio.holdings,
        [XOR]: String(amount(state.bot.portfolio.holdings[XOR]) - amount(fill.feeCodec)),
      },
    },
  };
  const successValue = valueAt(success, state.lastMark);
  const failureValue = valueAt(failure, state.lastMark);
  return freeze({
    state,
    successValue,
    failureValue,
    ...(lossReached(state.goalPeakValue, successValue) || lossReached(state.goalPeakValue, failureValue)
      ? { rejection: 'goalTradeCost' as const }
      : {}),
  });
}

/** Apply exactly one admitted hypothetical scenario. Rejected/cancelled orders spend nothing. */
export function applyHistoricalGoalFill(
  inputState: HistoricalGoalLedgerState,
  inputFill: PaperFill,
  mark: HistoricalGoalMark,
  scenario: HistoricalGoalFillScenario
): HistoricalGoalFillAssessment {
  requireValue(scenario === 'minimum-output-success' || scenario === 'fee-only-failure');
  const fill = fillCopy(inputFill);
  const assessment = assessHistoricalGoalFill(inputState, fill, mark);
  if (assessment.rejection) return assessment;
  const bot = copyData(assessment.state.bot) as BotDefinition;
  if (scenario === 'minimum-output-success') {
    bot.portfolio = applyPaperFill(bot, fill);
    bot.state.lastTradeAt = assessment.state.lastMark.timestampMs;
  } else {
    bot.portfolio.holdings[XOR] = String(amount(bot.portfolio.holdings[XOR]) - amount(fill.feeCodec));
    bot.portfolio.feesPaidCodec = String(amount(bot.portfolio.feesPaidCodec) + amount(fill.feeCodec));
  }
  const changed = retain({
    ...assessment.state,
    bot,
    scenarioFailures: assessment.state.scenarioFailures + (scenario === 'fee-only-failure' ? 1 : 0),
  });
  return freeze({ ...assessment, state: markHistoricalGoalLedger(changed, assessment.state.lastMark) });
}

/**
 * Account for the fixed deadline using a bounded-age terminal observation, without changing its block time.
 * The caller proves this is the canonical last state at/before the deadline. A terminal-only observation
 * updates performance, but never invents an earlier target/loss event. Existing stopped outcomes remain latched.
 * The result is not accepted by live reducer APIs. Because earlier immutable states remain valid references,
 * the driver must retire its input state and own exactly-once finalization; this function does not revoke aliases.
 */
export function finalizeHistoricalGoalLedger(
  state: HistoricalGoalLedgerState,
  inputMark: HistoricalGoalMark,
  inputPolicy: HistoricalGoalTerminalPolicy
): HistoricalGoalTerminalAccounting {
  if (!states.has(state)) return fail();
  const policy = copyData(inputPolicy);
  exactKeys(policy, ['accountingAtMs', 'maximumAgeMs']);
  requireValue(Number.isSafeInteger(policy.accountingAtMs) && policy.accountingAtMs === state.episode.endedAtMs);
  requireValue(Number.isSafeInteger(policy.maximumAgeMs) && policy.maximumAgeMs >= 0 && policy.maximumAgeMs <= 60_000);
  const mark = markCopy(inputMark);
  requireValue(mark.timestampMs >= state.lastMark.timestampMs && mark.timestampMs <= policy.accountingAtMs);
  const ageMs = policy.accountingAtMs - mark.timestampMs;
  requireValue(ageMs <= policy.maximumAgeMs);
  if (mark.timestampMs === state.lastMark.timestampMs) {
    requireValue(
      mark.blockHash === state.lastMark.blockHash &&
        mark.kusdReserveCodec === state.lastMark.kusdReserveCodec &&
        mark.xorReserveCodec === state.lastMark.xorReserveCodec
    );
  } else requireValue(mark.blockHash !== state.lastMark.blockHash);
  const latestValue = valueAt(state.bot, mark);
  const performancePeakValue =
    compare(latestValue, state.performancePeakValue) > 0n ? latestValue : state.performancePeakValue;
  const loss = drawdown(performancePeakValue, latestValue);
  const maximumDrawdownRatio = compare(loss, state.maximumDrawdownRatio) > 0n ? loss : state.maximumDrawdownRatio;
  const goalPeakValue =
    state.outcome === 'active' && compare(latestValue, state.goalPeakValue) > 0n ? latestValue : state.goalPeakValue;
  return freeze({
    kind: 'historical-goal-terminal-accounting',
    purpose: 'development',
    accountingAtMs: policy.accountingAtMs,
    observedAtMs: mark.timestampMs,
    ageMs,
    maximumAgeMs: policy.maximumAgeMs,
    episode: state.episode,
    bot: state.bot,
    openingValue: state.openingValue,
    goalPeakValue,
    performancePeakValue,
    latestValue,
    maximumDrawdownRatio,
    outcome: state.outcome === 'active' ? 'expired' : state.outcome,
    stoppedAtMs: state.outcome === 'active' ? policy.accountingAtMs : state.stoppedAtMs!,
    lastMark: mark,
    scenarioFailures: state.scenarioFailures,
  });
}
