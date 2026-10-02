/** Pure completed-hour signal consumption. The driver owns evidence provenance, event ordering and order resolution. */
import {
  copyStrategyConfig,
  evaluateStrategy,
  parseBotPrice,
  validateStrategy,
} from '../../src/features/bot-trading/engine';
import { toCodec } from '../../src/features/bot-trading/amounts';
import type { BotCandle, BotDefinition, StrategyState, TradeProposal } from '../../src/features/bot-trading/types';
import { planHistoricalGoalSchedule } from './historical-goal-schedule';
import { planHistoricalExecutionClock, type HistoricalExecutionClockPlan } from './historical-execution-clock';
import type { HistoricalGoalLedgerState } from './historical-goal-ledger';

const HOUR = 3_600_000;
const U128_MAX = (1n << 128n) - 1n;
const states = new WeakSet<object>();
type Schedule = ReturnType<typeof planHistoricalGoalSchedule>;

/** A fixed codec input is a hypothetical request, never permission to trade or evidence of a fill. */
export interface HistoricalGoalPendingOrder {
  readonly signalIndex: number;
  readonly signalCompletedAtMs: number;
  readonly decidedAtMs: number;
  readonly targetExecutionAtMs: number;
  readonly maximumExecutionLagMs: number;
  readonly assetIn: string;
  readonly assetOut: string;
  readonly amountInCodec: string;
  readonly plan: HistoricalExecutionClockPlan;
}

/** Configuration identity is stable across immutable ledger transitions; it carries no mutable holdings. */
export interface HistoricalGoalSignalBinding {
  readonly id: string;
  readonly network: string;
  readonly assetIn: BotDefinition['assetIn'];
  readonly assetOut: BotDefinition['assetOut'];
  readonly strategy: BotDefinition['strategy'];
  readonly policy: BotDefinition['policy'];
  readonly initial: BotDefinition['portfolio']['initial'];
  readonly goal: BotDefinition['goal'];
  readonly episode: HistoricalGoalLedgerState['episode'];
  readonly openingValue: HistoricalGoalLedgerState['openingValue'];
}

/** Immutable sequential state; no restore API and no pre-funding crossover are inferred. */
export interface HistoricalGoalSignalState {
  readonly version: 1;
  readonly purpose: 'development';
  readonly binding: HistoricalGoalSignalBinding;
  readonly plans: readonly HistoricalExecutionClockPlan[];
  readonly strategyState: Readonly<StrategyState>;
  readonly candles: readonly BotCandle[];
  readonly nextIndex: number;
  readonly lastLedgerAtMs: number;
  readonly lastTradeAtMs: number;
  readonly lastTrades: number;
  readonly lastFeesPaidCodec: string;
}

export interface HistoricalGoalSignalResult {
  readonly state: HistoricalGoalSignalState;
  readonly proposal: Readonly<TradeProposal>;
  readonly blockedAction?: 'buy' | 'sell';
  readonly pending?: HistoricalGoalPendingOrder;
}

const fail = (): never => {
  throw new Error('Invalid historical goal signal input');
};
const check = (condition: unknown): void => {
  if (!condition) fail();
};

/** Snapshot bounded descriptor-only plain data; never evaluate getters, custom iterators or toJSON. */
function copy<T>(input: T): T {
  let count = 0;
  const read = (value: unknown, depth: number): unknown => {
    if (++count > 20_000 || depth > 24) return fail();
    if (value === null || value === undefined || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fail();
    if (typeof value === 'string') return value.length <= 100_000 ? value : fail();
    if (!value || typeof value !== 'object') return fail();
    const fields = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(fields);
    if (keys.some((key) => typeof key !== 'string' || !('value' in fields[key]))) return fail();
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 1000 || keys.length !== value.length + 1)
        return fail();
      return Array.from({ length: value.length }, (_, index) => {
        if (!fields[index]?.enumerable) return fail();
        return read(fields[index].value, depth + 1);
      });
    }
    if (
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      keys.some((key) => !fields[key as string].enumerable)
    )
      return fail();
    return Object.fromEntries(keys.map((key) => [key, read(fields[key as string].value, depth + 1)]));
  };
  return read(input, 0) as T;
}

function exact(value: object, keys: string[]): void {
  check(value !== null && typeof value === 'object' && !Array.isArray(value));
  const own = Object.keys(value);
  check(own.length === keys.length && keys.every((key) => own.includes(key)));
}

/** Compare copied data structurally, including canonical key order instead of caller insertion order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function retain(state: HistoricalGoalSignalState): HistoricalGoalSignalState {
  freeze(state);
  states.add(state);
  return state;
}

function unsigned(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(value)) return fail();
  const result = BigInt(value);
  return result <= U128_MAX ? result : fail();
}

function candleCopy(input: BotCandle): BotCandle {
  const value = copy(input);
  exact(value, ['timestamp', 'close', ...(Object.hasOwn(value, 'feeClose') ? ['feeClose'] : [])]);
  check(Number.isSafeInteger(value.timestamp) && value.timestamp >= 0 && value.timestamp % HOUR === 0);
  parseBotPrice(value.close);
  if (value.feeClose !== undefined) parseBotPrice(value.feeClose);
  return value;
}

function binding(ledger: HistoricalGoalLedgerState): HistoricalGoalSignalBinding {
  const bot = ledger.bot;
  return {
    id: bot.id,
    network: bot.network,
    assetIn: bot.assetIn,
    assetOut: bot.assetOut,
    strategy: copyStrategyConfig(bot.strategy),
    policy: bot.policy,
    initial: bot.portfolio.initial,
    goal: bot.goal,
    episode: ledger.episode,
    openingValue: ledger.openingValue,
  };
}

/** Ledger authenticity/lineage remains an upstream reducer contract; this module checks causal scalar consistency. */
function ledgerCopy(input: HistoricalGoalLedgerState): HistoricalGoalLedgerState {
  const ledger = copy(input);
  check(ledger.version === 1 && ledger.purpose === 'development');
  check(['active', 'target', 'loss', 'expired'].includes(ledger.outcome));
  check(
    Number.isSafeInteger(ledger.lastMark.timestampMs) &&
      ledger.lastMark.timestampMs >= ledger.episode.startedAtMs &&
      ledger.lastMark.timestampMs <= ledger.episode.endedAtMs
  );
  check(
    Number.isSafeInteger(ledger.bot.state.lastTradeAt) &&
      ledger.bot.state.lastTradeAt >= 0 &&
      ledger.bot.state.lastTradeAt <= ledger.lastMark.timestampMs
  );
  check(Number.isSafeInteger(ledger.bot.portfolio.trades) && ledger.bot.portfolio.trades >= 0);
  unsigned(ledger.bot.portfolio.feesPaidCodec);
  validateStrategy(ledger.bot as BotDefinition);
  check(ledger.bot.strategy.kind !== 'ai' && ledger.bot.strategy.signalTiming !== 'live-price');
  return ledger;
}

/**
 * Bind the fresh funded ledger and all 24 fixed plans. Warmup is supplied solely as earlier indicator input:
 * no evaluateStrategy call is made before funding, so an earlier SMA side never fabricates a first crossover.
 * The 200-hour warmup bound is explicit; longer lookbacks remain unready until enough funded closes arrive.
 */
export function createHistoricalGoalSignalState(
  inputLedger: HistoricalGoalLedgerState,
  inputSchedule: Schedule,
  inputWarmup: readonly BotCandle[] = []
): HistoricalGoalSignalState {
  const ledger = ledgerCopy(inputLedger);
  check(
    ledger.outcome === 'active' &&
      ledger.lastMark.timestampMs === ledger.episode.startedAtMs &&
      ledger.bot.portfolio.trades === 0 &&
      ledger.bot.portfolio.feesPaidCodec === '0'
  );
  exact(ledger.bot.state, ['lastEvaluatedAt', 'lastTradeAt']);
  check(ledger.bot.state.lastEvaluatedAt === 0 && ledger.bot.state.lastTradeAt === 0);
  // Select only the schedule inputs: its potentially large valuation list is deliberately not inspected.
  check(
    inputSchedule !== null &&
      typeof inputSchedule === 'object' &&
      [Object.prototype, null].includes(Object.getPrototypeOf(inputSchedule))
  );
  const descriptors = Object.getOwnPropertyDescriptors(inputSchedule);
  check(Reflect.ownKeys(descriptors).every((key) => typeof key === 'string' && 'value' in descriptors[key]));
  for (const field of ['executions', 'episode', 'valuationPolicy']) check(descriptors[field]?.enumerable);
  const plans = copy(descriptors.executions.value) as HistoricalExecutionClockPlan[];
  check(Array.isArray(plans) && plans.length === 24);
  for (const plan of plans) {
    exact(plan, ['signal', 'policy', 'episode', 'assumedDecisionAtMs', 'targetExecutionAtMs']);
    check(canonical(plan) === canonical(planHistoricalExecutionClock(plan.signal, plan.policy, plan.episode)));
  }
  const schedule = planHistoricalGoalSchedule(
    plans.map((plan) => plan.signal),
    plans[0].policy,
    copy(descriptors.episode.value) as Schedule['episode'],
    copy(descriptors.valuationPolicy.value) as Schedule['valuationPolicy']
  );
  check(
    canonical(plans) === canonical(schedule.executions) && canonical(ledger.episode) === canonical(schedule.episode)
  );
  const warmup = copy(inputWarmup);
  check(Array.isArray(warmup) && warmup.length <= 200);
  const candles = warmup.map(candleCopy);
  for (let i = 0; i < candles.length; i++)
    check(candles[i].timestamp === ledger.episode.startedAtMs - (candles.length - i) * HOUR);
  return retain({
    version: 1,
    purpose: 'development',
    binding: binding(ledger),
    plans: schedule.executions,
    strategyState: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    candles,
    nextIndex: 0,
    lastLedgerAtMs: ledger.lastMark.timestampMs,
    lastTradeAtMs: 0,
    lastTrades: 0,
    lastFeesPaidCodec: '0',
  });
}

/**
 * Consume precisely the next completed hour, including hold/stopped/allocation-blocked signals. Each returned
 * pending input is fixed here. The driver must merge actual event times, supply available valuation evidence,
 * bind quote denominator/provenance, and resolve/cancel each attempt once; it must never rescale this amount.
 */
export function consumeHistoricalGoalSignal(
  state: HistoricalGoalSignalState,
  inputLedger: HistoricalGoalLedgerState,
  inputCandle: BotCandle
): HistoricalGoalSignalResult {
  if (!states.has(state) || state.nextIndex >= 24) return fail();
  const ledger = ledgerCopy(inputLedger);
  const candle = candleCopy(inputCandle);
  const plan = state.plans[state.nextIndex];
  check(canonical(binding(ledger)) === canonical(state.binding));
  check(candle.timestamp === plan.signal.completedAtMs);
  check(ledger.lastMark.timestampMs >= state.lastLedgerAtMs && ledger.lastMark.timestampMs <= plan.assumedDecisionAtMs);
  check(
    ledger.bot.state.lastTradeAt >= state.lastTradeAtMs &&
      ledger.bot.portfolio.trades >= state.lastTrades &&
      unsigned(ledger.bot.portfolio.feesPaidCodec) >= unsigned(state.lastFeesPaidCodec)
  );
  const candles = [...state.candles, candle];
  const bot = {
    ...ledger.bot,
    state: { ...state.strategyState, lastTradeAt: ledger.bot.state.lastTradeAt },
  } as BotDefinition;
  const decision =
    ledger.outcome === 'active'
      ? evaluateStrategy(bot, candles, plan.assumedDecisionAtMs)
      : {
          proposal: { action: 'hold' as const, amount: '0', reason: 'bots.errors.goalComplete' },
          state: { ...bot.state, lastEvaluatedAt: plan.assumedDecisionAtMs },
        };
  const next = retain({
    ...state,
    strategyState: decision.state,
    candles,
    nextIndex: state.nextIndex + 1,
    lastLedgerAtMs: ledger.lastMark.timestampMs,
    lastTradeAtMs: ledger.bot.state.lastTradeAt,
    lastTrades: ledger.bot.portfolio.trades,
    lastFeesPaidCodec: ledger.bot.portfolio.feesPaidCodec,
  });
  const result: HistoricalGoalSignalResult = {
    state: next,
    proposal: decision.proposal,
    ...('blockedAction' in decision && decision.blockedAction ? { blockedAction: decision.blockedAction } : {}),
  };
  if (decision.proposal.action === 'hold') return freeze(result);
  const buy = decision.proposal.action === 'buy';
  const assetIn = buy ? bot.assetIn : bot.assetOut;
  const amountInCodec = toCodec(decision.proposal.amount, assetIn.decimals);
  check(unsigned(amountInCodec) > 0n);
  if (buy) check(unsigned(amountInCodec) < unsigned(state.binding.initial[bot.assetIn.address]));
  if (unsigned(amountInCodec) > unsigned(bot.policy.maxTradeCodec[assetIn.address] ?? '0'))
    return freeze({
      state: next,
      proposal: { action: 'hold', amount: '0', reason: 'bots.errors.policy' },
      blockedAction: decision.proposal.action,
    });
  return freeze({
    ...result,
    pending: {
      signalIndex: state.nextIndex,
      signalCompletedAtMs: candle.timestamp,
      decidedAtMs: plan.assumedDecisionAtMs,
      targetExecutionAtMs: plan.targetExecutionAtMs,
      maximumExecutionLagMs: plan.policy.maximumExecutionLagMs,
      assetIn: assetIn.address,
      assetOut: (buy ? bot.assetOut : bot.assetIn).address,
      amountInCodec,
      plan,
    },
  });
}
