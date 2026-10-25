/** Causal completed-hour direction with qualified fixed codec lots. No storage or trading authority. */
import { canonicalizeAgentIntent } from '@/features/agent-trading/intent';
import { evaluateStrategy, parseBotPrice, requiredStrategyCandles } from './engine';
import { fromCodec } from './amounts';
import { readGoalQualificationBinding, type GoalQualificationBinding } from './goal-qualification';
import { copyGoalStorageData, readGoalExecutionBot } from './goal-storage';
import { GOAL_EXACT_POLICY } from './goal-exact-ledger';
import type { GoalExecutionBot } from './goal-execution-types';
import type { IndexedPoolBoundaryEvidence, IndexedPoolHistoryWithEvidence } from './pool-history';
import type { BotCandle, StrategyState, TradeProposal } from './types';

const HOUR = 3_600_000;
const HASH = /^0x[0-9a-f]{64}$/;
const fail = (reason = 'history'): never => {
  throw new Error(`bots.errors.${reason}`);
};
const requireValue = (value: unknown, reason?: string): void => {
  if (!value) fail(reason);
};
const time = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const same = (a: unknown, b: unknown) => canonicalizeAgentIntent(a) === canonicalizeAgentIntent(b);
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export interface GoalCompletedSignalInput {
  bot: GoalExecutionBot;
  /** Structural binding from the owned qualification; this input alone proves no qualification. */
  binding: GoalQualificationBinding;
  history: IndexedPoolHistoryWithEvidence;
  /** Actual receipt of this query response, separately from its indexed chain timestamps. */
  receivedAtMs: number;
  now: number;
}
export type GoalCompletedSignalResult =
  | Readonly<{ kind: 'already-consumed'; completedAtMs: number }>
  | Readonly<{
      kind: 'awaiting-history';
      completedAtMs: number;
      lastAvailableAtMs: number;
    }>
  | Readonly<{
      kind: 'decision';
      completedAtMs: number;
      receivedAtMs: number;
      decisionAtMs: number;
      state: Readonly<StrategyState>;
      proposal: Readonly<TradeProposal>;
      /** Already capped at signal time; execution must not resize or price-convert it. */
      inputCodec: string | null;
      boundary: IndexedPoolBoundaryEvidence;
      /** Preserve reported gaps even when they precede the required contiguous signal tail. */
      sourceMissingPeriods: number;
    }>;

/** Validate the strategy's durable cursor without allowing a legacy live-price observation into this protocol. */
function strategyState(bot: GoalExecutionBot, now: number): void {
  const state = bot.state;
  const allowed = ['lastEvaluatedAt', 'lastTradeAt', 'previousSignal', 'lastRuleObservationAt'];
  requireValue(
    Object.keys(state).every((key) => allowed.includes(key)),
    'strategy'
  );
  requireValue(
    time(state.lastEvaluatedAt) && time(state.lastTradeAt) && state.lastEvaluatedAt <= now && state.lastTradeAt <= now,
    'strategy'
  );
  requireValue(
    state.previousSignal === undefined || (bot.strategy.kind === 'sma' && [-1, 0, 1].includes(state.previousSignal)),
    'strategy'
  );
  requireValue(
    state.lastRuleObservationAt === undefined ||
      (bot.strategy.kind === 'rules' &&
        time(state.lastRuleObservationAt) &&
        state.lastRuleObservationAt % HOUR === 0 &&
        bot.goalSignal.completedAtMs !== null &&
        state.lastRuleObservationAt <= bot.goalSignal.completedAtMs),
    'strategy'
  );
}

/** Validate second-resolution indexed boundary evidence without inventing an exact millisecond timestamp. */
function boundaryValid(
  proof: IndexedPoolBoundaryEvidence,
  candle: BotCandle,
  binding: GoalQualificationBinding,
  receivedAtMs: number
): void {
  const endSeconds = candle.timestamp / 1000;
  const startSeconds = endSeconds - HOUR / 1000;
  requireValue(
    proof.kind === 'indexed-finalized-hour-boundary' &&
      proof.arrivalTimeKnown === false &&
      proof.completedAtMs === candle.timestamp &&
      proof.genesisHash === binding.genesisHash &&
      proof.denominator === binding.denominator &&
      time(proof.closing.height) &&
      proof.closing.height > 0 &&
      proof.closing.height < 0xffffffff &&
      proof.successor.height === proof.closing.height + 1 &&
      typeof proof.closing.hash === 'string' &&
      typeof proof.successor.hash === 'string' &&
      HASH.test(proof.closing.hash) &&
      HASH.test(proof.successor.hash) &&
      proof.closing.hash !== proof.successor.hash &&
      time(proof.closing.timestampSeconds) &&
      proof.closing.timestampSeconds >= startSeconds &&
      proof.closing.timestampSeconds < endSeconds &&
      time(proof.successor.timestampSeconds) &&
      proof.successor.timestampSeconds >= endSeconds &&
      proof.successor.timestampSeconds < endSeconds + HOUR / 1000 &&
      proof.successor.timestampSeconds <= Math.floor(receivedAtMs / 1000)
  );
}

/** The engine's blockedAction keeps direction, but its no-allocation reason describes legacy sizing. */
function directionReason(bot: GoalExecutionBot, action: 'buy' | 'sell'): string {
  if (bot.strategy.kind === 'rules') return action === 'buy' ? 'bots.rules.entryMatch' : 'bots.rules.exitMatch';
  if (bot.strategy.kind === 'threshold') return 'bots.events.threshold';
  return bot.strategy.kind === 'sma' ? 'bots.events.crossover' : 'bots.events.scheduled';
}

/**
 * Consume one current completed hour. The engine supplies only direction and causal strategy state;
 * its inverse-price sell sizing and allocation rejection never determine this protocol's lot amount.
 * Persist the returned state/hour atomically before quoting, including held or subsequently rejected signals.
 */
export function evaluateGoalCompletedSignal(input: GoalCompletedSignalInput): GoalCompletedSignalResult {
  const source = copyGoalStorageData(input);
  const bot = readGoalExecutionBot(source.bot);
  const binding = readGoalQualificationBinding(source.binding);
  const now = source.now;
  requireValue(time(now) && time(source.receivedAtMs) && source.receivedAtMs <= now, 'stale');
  const completedAtMs = Math.floor(now / HOUR) * HOUR;
  requireValue(
    bot.status === 'running' &&
      bot.exactGoalState.outcome === 'active' &&
      bot.exactGoalState.attention.length === 0 &&
      now >= bot.exactGoalState.episode.startedAtMs &&
      now < bot.exactGoalState.episode.endedAtMs &&
      now < bot.sessionExpiresAt,
    'session'
  );
  requireValue(
    same(binding, {
      genesisHash: bot.network,
      denominator: bot.goalExecution.execution.expectedDenominator,
      initialKusdCodec: bot.exactGoalState.initial.kusdCodec,
      maxTradeKusdCodec: bot.exactGoalState.limits.kusdCodec,
      maxTradeXorCodec: bot.exactGoalState.limits.xorCodec,
      strategy: bot.strategy,
    }),
    'research'
  );
  strategyState(bot, now);
  if (bot.goalSignal.completedAtMs !== null && completedAtMs <= bot.goalSignal.completedAtMs)
    return Object.freeze({ kind: 'already-consumed', completedAtMs });

  const { history, boundaries } = source.history;
  requireValue(
    history.denominationVerified === true &&
      history.identity?.genesisHash === binding.genesisHash &&
      history.identity.denominator === binding.denominator &&
      time(history.missing) &&
      Array.isArray(history.candles) &&
      history.candles.length > 0 &&
      history.candles.length <= 10_000 &&
      Array.isArray(boundaries) &&
      boundaries.length === history.candles.length
  );
  const tail: BotCandle[] = [];
  let previous = -1;
  const byHeight = new Map<number, IndexedPoolBoundaryEvidence['closing']>();
  const byHash = new Map<string, number>();
  for (let i = 0; i < history.candles.length; i++) {
    const candle = history.candles[i];
    requireValue(
      time(candle.timestamp) &&
        candle.timestamp % HOUR === 0 &&
        candle.timestamp > previous &&
        candle.timestamp <= completedAtMs &&
        candle.timestamp <= source.receivedAtMs
    );
    parseBotPrice(candle.close);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose);
    boundaryValid(boundaries[i], candle, binding, source.receivedAtMs);
    const proof = boundaries[i];
    if (i > 0) requireValue(proof.closing.height >= boundaries[i - 1].successor.height);
    for (const observed of [proof.closing, proof.successor]) {
      const known = byHeight.get(observed.height);
      requireValue(
        (!known || same(known, observed)) &&
          (!byHash.has(observed.hash) || byHash.get(observed.hash) === observed.height)
      );
      byHeight.set(observed.height, observed);
      byHash.set(observed.hash, observed.height);
    }
    if (previous >= 0 && candle.timestamp - previous !== HOUR) tail.length = 0;
    tail.push(candle);
    previous = candle.timestamp;
  }
  requireValue(tail.length >= requiredStrategyCandles(bot.strategy));
  const lastAvailableAtMs = tail.at(-1)!.timestamp;
  if (lastAvailableAtMs === completedAtMs - HOUR) {
    // The current close needs a finalized successor and indexer publication. Keep
    // the validated prior prefix, but do not consume an hour or advance strategy state.
    return Object.freeze({ kind: 'awaiting-history', completedAtMs, lastAvailableAtMs });
  }
  requireValue(lastAvailableAtMs === completedAtMs, 'stale');

  const evaluated = evaluateStrategy(bot, tail, now);
  const state = { ...evaluated.state, lastTradeAt: bot.state.lastTradeAt };
  const action = evaluated.proposal.action === 'hold' ? evaluated.blockedAction : evaluated.proposal.action;
  let proposal: TradeProposal = { ...evaluated.proposal, action: 'hold', amount: '0' };
  let inputCodec: string | null = null;
  if (action === 'buy' || action === 'sell') {
    const exact = bot.exactGoalState;
    const paid = BigInt(exact.feesPaidCodec);
    const allowance = BigInt(GOAL_EXACT_POLICY.initialFeeReserveCodec);
    requireValue(paid < allowance, 'feeBudget');
    const reserve = allowance - paid;
    const xor = BigInt(exact.holdings.xorCodec) - BigInt(exact.deficit.xorCodec);
    const kusd = BigInt(exact.holdings.kusdCodec) - BigInt(exact.deficit.kusdCodec);
    requireValue(xor >= reserve && kusd >= 0n, 'balance');
    const available = action === 'buy' ? kusd : xor - reserve;
    const fixed = BigInt(action === 'buy' ? binding.maxTradeKusdCodec : binding.maxTradeXorCodec);
    const selected = fixed < available ? fixed : available;
    if (selected > 0n) {
      inputCodec = selected.toString();
      proposal = {
        action,
        amount: fromCodec(inputCodec, 18),
        reason: evaluated.blockedAction ? directionReason(bot, action) : evaluated.proposal.reason,
      };
    } else proposal.reason = 'bots.events.noAllocation';
  }
  return freeze({
    kind: 'decision',
    completedAtMs,
    receivedAtMs: source.receivedAtMs,
    decisionAtMs: now,
    state,
    proposal,
    inputCodec,
    boundary: boundaries.at(-1)!,
    sourceMissingPeriods: history.missing,
  });
}
