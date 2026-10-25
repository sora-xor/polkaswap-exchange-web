// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { evaluateGoalCompletedSignal, type GoalCompletedSignalInput } from '@/features/bot-trading/goal-signals';
import { readGoalQualificationBinding } from '@/features/bot-trading/goal-qualification';
import { evaluateStrategy } from '@/features/bot-trading/engine';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import {
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  createGoalExactLedger,
  markGoalExactLedger,
  settleGoalExactLedger,
  type GoalExactLedgerState,
} from '@/features/bot-trading/goal-exact-ledger';
import type { GoalExecutionBot } from '@/features/bot-trading/goal-execution-types';
import type { IndexedPoolHistoryWithEvidence } from '@/features/bot-trading/pool-history';
import { goalExpected, goalStorageBot, goalTestCodec, goalTestHash, goalTestMark } from './goal-storage-fixtures';

vi.unmock('@polkadot/util-crypto');
const HOUR = 3_600_000;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function history(prices = ['1'], hours = prices.map((_, index) => index + 1)): IndexedPoolHistoryWithEvidence {
  const bot = goalStorageBot();
  return {
    history: {
      candles: prices.map((close, i) => ({ timestamp: hours[i] * HOUR, close, feeClose: close })),
      missing: 0,
      identity: { genesisHash: bot.network, denominator: '1' },
      denominationVerified: true,
    },
    boundaries: hours.map((hour) => ({
      kind: 'indexed-finalized-hour-boundary',
      completedAtMs: hour * HOUR,
      genesisHash: bot.network,
      denominator: '1',
      closing: { height: hour * 100, hash: goalTestHash(hour * 100), timestampSeconds: hour * 3600 - 6 },
      successor: { height: hour * 100 + 1, hash: goalTestHash(hour * 100 + 1), timestampSeconds: hour * 3600 },
      arrivalTimeKnown: false,
    })),
  };
}
function fixture(bot = goalStorageBot(), observations = history()): GoalCompletedSignalInput {
  bot.strategy = { ...bot.strategy, amount: '3', intervalMs: HOUR };
  const now = observations.history.candles.at(-1)!.timestamp + 1000;
  return {
    bot,
    binding: readGoalQualificationBinding({
      genesisHash: bot.network,
      denominator: '1',
      initialKusdCodec: bot.exactGoalState.initial.kusdCodec,
      maxTradeKusdCodec: bot.exactGoalState.limits.kusdCodec,
      maxTradeXorCodec: bot.exactGoalState.limits.xorCodec,
      strategy: bot.strategy,
    }),
    history: observations,
    receivedAtMs: now,
    now,
  };
}
function bind(input: GoalCompletedSignalInput) {
  input.binding = { ...input.binding, strategy: clone(input.bot.strategy) };
  return input;
}
/** Real pure ledger transitions over invented receipts keep inventory tests internally consistent. */
function bought(count = 1, output = '2970000000000000000', xorLot = 3): GoalExecutionBot {
  const bot = goalStorageBot();
  let state = createGoalExactLedger(
    {
      goalId: bot.exactGoalState.goalId,
      startedAtMs: bot.exactGoalState.episode.startedAtMs,
      initialKusdCodec: goalTestCodec(10),
      maxTradeKusdCodec: goalTestCodec(3),
      maxTradeXorCodec: goalTestCodec(xorLot),
    },
    bot.exactGoalState.openingMark
  );
  bot.policy.maxTradeCodec[XOR] = goalTestCodec(xorLot);
  for (let i = 0; i < count; i++) {
    const atMs = state.episode.startedAtMs + (i + 1) * 10;
    state = settleGoalExactLedger(state, {
      expectedRevision: state.revision,
      accountingAtMs: atMs,
      mark: goalTestMark(101 + i, atMs),
      orderId: `invented-buy-${i}`,
      receipt: {
        blockHash: goalTestHash(101 + i),
        blockNumber: 101 + i,
        extrinsicHash: goalTestHash(501 + i),
        extrinsicIndex: 1,
      },
      fill: {
        inputAsset: KUSD,
        outputAsset: XOR,
        inputCodec: goalTestCodec(3),
        minimumOutputCodec: '2900000000000000000',
        feeCeilingCodec: '10000000000000000',
      },
      success: true,
      actualOutputCodec: output,
      actualFeeCodec: '10000000000000000',
    }).state;
  }
  bot.exactGoalState = state;
  bot.portfolio = {
    initial: { [KUSD]: state.initial.kusdCodec, [XOR]: state.initial.xorCodec },
    holdings: { [KUSD]: state.holdings.kusdCodec, [XOR]: state.holdings.xorCodec },
    feesPaidCodec: state.feesPaidCodec,
    trades: state.trades,
  };
  return bot;
}

describe('qualified fixed-lot completed-hour signals', () => {
  it('returns an immutable fixed input and exact completed boundary without mutating source state', () => {
    const input = fixture();
    const before = clone(input);
    const result = evaluateGoalCompletedSignal(input);
    expect(result).toMatchObject({
      kind: 'decision',
      completedAtMs: HOUR,
      receivedAtMs: HOUR + 1000,
      state: { lastEvaluatedAt: HOUR + 1000, lastTradeAt: 0 },
      proposal: { action: 'buy', amount: '3', reason: 'bots.events.scheduled' },
      inputCodec: goalTestCodec(3),
      boundary: { completedAtMs: HOUR, arrivalTimeKnown: false },
      sourceMissingPeriods: 0,
    });
    expect(input).toEqual(before);
    if (result.kind !== 'decision') throw Error('Expected a decision');
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(Object.isFrozen(result.boundary.closing)).toBe(true);
    expect(result.boundary).not.toBe(input.history.boundaries[0]);
  });

  it('uses a fixed reverse XOR lot instead of the old inverse-price amount', () => {
    const input = fixture(bought(2, goalTestCodec(3), 1), history(['100']));
    input.bot.strategy = { ...input.bot.strategy, kind: 'threshold', direction: 'above', threshold: '2' };
    bind(input);
    expect(evaluateStrategy(input.bot, input.history.history.candles, input.now).proposal.amount).toBe('0.03');
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      proposal: { action: 'sell', amount: '1' },
      inputCodec: goalTestCodec(1),
    });
  });

  it('recovers blocked buy direction and caps at actual remaining KUSD inventory', () => {
    const input = fixture(bought(3, goalTestCodec(3)));
    expect(evaluateStrategy(input.bot, input.history.history.candles, input.now)).toMatchObject({
      proposal: { action: 'hold' },
      blockedAction: 'buy',
    });
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      proposal: { action: 'buy', amount: '1', reason: 'bots.events.scheduled' },
      inputCodec: goalTestCodec(1),
    });
  });

  it('caps XOR inventory after protecting exactly the unspent native fee allowance', () => {
    const input = fixture(bought(), history(['100']));
    input.bot.strategy = { ...input.bot.strategy, kind: 'threshold', direction: 'above', threshold: '2' };
    bind(input);
    expect(input.bot.exactGoalState.holdings.xorCodec).toBe('3960000000000000000');
    expect(input.bot.exactGoalState.feesPaidCodec).toBe('10000000000000000');
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      proposal: { action: 'sell', amount: '2.97' },
      inputCodec: '2970000000000000000',
    });
  });

  it('retains a sell signal whose legacy price-sized amount rounded to zero', () => {
    const input = fixture(bought(2, goalTestCodec(3)), history(['1000000000000000000000000000000000000']));
    input.bot.strategy = { ...input.bot.strategy, kind: 'threshold', direction: 'above', threshold: '2' };
    bind(input);
    expect(evaluateStrategy(input.bot, input.history.history.candles, input.now)).toMatchObject({
      blockedAction: 'sell',
    });
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      proposal: { action: 'sell', amount: '3', reason: 'bots.events.threshold' },
      inputCodec: goalTestCodec(3),
    });
  });

  it('holds when only the protected fee reserve is available, but consumes the hour', () => {
    const input = fixture();
    input.bot.strategy = { ...input.bot.strategy, kind: 'threshold', direction: 'above', threshold: '1' };
    bind(input);
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      kind: 'decision',
      completedAtMs: HOUR,
      proposal: { action: 'hold', amount: '0', reason: 'bots.events.noAllocation' },
      inputCodec: null,
    });
  });

  it('commits the signal through the atomic storage API and never retries after a rejected quote', async () => {
    const input = fixture();
    const first = evaluateGoalCompletedSignal(input);
    if (first.kind !== 'decision') throw Error('Expected a decision');
    let ledger: GoalStorageLedger = { bots: [clone(input.bot)], orders: [] };
    const storage = createGoalStorage(
      async (write, action) => {
        const next = clone(ledger);
        const result = action(next);
        if (write) ledger = next;
        return result;
      },
      () => input.now
    );
    input.bot = await storage.recordSignal({
      botId: input.bot.id,
      expected: goalExpected(input.bot),
      expectedCompletedAtMs: input.bot.goalSignal.completedAtMs,
      accountingAtMs: first.decisionAtMs,
      mark: goalTestMark(1000, input.now),
      completedAtMs: first.completedAtMs,
      strategyState: first.state,
      assertCurrent: () => undefined,
    });
    expect(evaluateGoalCompletedSignal(input)).toEqual({ kind: 'already-consumed', completedAtMs: HOUR });
    expect(input.bot.state.lastTradeAt).toBe(0);
    expect(ledger.orders).toEqual([]);
  });

  it('keeps the first completed boundary separate from a funded start later within that hour', () => {
    const bot = goalStorageBot();
    const startedAtMs = 2 * HOUR + 500;
    bot.exactGoalState = createGoalExactLedger(
      {
        goalId: bot.goalExecution.goalId,
        startedAtMs,
        initialKusdCodec: goalTestCodec(10),
        maxTradeKusdCodec: goalTestCodec(3),
        maxTradeXorCodec: goalTestCodec(3),
      },
      goalTestMark(100, startedAtMs)
    );
    bot.sessionExpiresAt = bot.exactGoalState.episode.endedAtMs;
    expect(evaluateGoalCompletedSignal(fixture(bot, history(['1'], [2])))).toMatchObject({
      completedAtMs: 2 * HOUR,
      decisionAtMs: 2 * HOUR + 1000,
      state: { lastEvaluatedAt: 2 * HOUR + 1000 },
    });
  });

  it('preserves interval and crossover state from causal completed candles', () => {
    const input = fixture(goalStorageBot(), history(['3', '2', '1']));
    input.bot.strategy = { ...input.bot.strategy, kind: 'sma', fastWindow: 1, slowWindow: 3 };
    input.bot.state.previousSignal = 1;
    bind(input);
    const result = evaluateGoalCompletedSignal(input);
    expect(result).toMatchObject({ state: { previousSignal: -1, lastEvaluatedAt: 3 * HOUR + 1000 } });
    input.bot.exactGoalState = markForSignal(input.bot.exactGoalState, input.now);
    input.bot.state.lastTradeAt = input.now - 1;
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      state: { previousSignal: 1, lastTradeAt: input.now - 1 },
      proposal: { action: 'hold', reason: 'bots.events.interval' },
    });
  });

  it('preserves rules consumption and exit precedence without reusing a completed signal', () => {
    const input = fixture(bought(2, goalTestCodec(3)), history(['1', '2']));
    const condition = {
      operator: 'all' as const,
      conditions: [{ kind: 'trend' as const, window: 2, direction: 'above' as const }],
    };
    input.bot.strategy = {
      ...input.bot.strategy,
      kind: 'rules',
      rules: { version: 1, entry: condition, exit: condition },
    };
    bind(input);
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      state: { lastRuleObservationAt: 2 * HOUR },
      proposal: { action: 'sell', amount: '3', reason: 'bots.rules.exitMatch' },
    });
  });

  it('preserves gaps before a sufficient contiguous tail and refuses gaps inside a required window', () => {
    const input = fixture(goalStorageBot(), history(['1', '2', '3'], [1, 3, 4]));
    input.history.history.missing = 1;
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({ sourceMissingPeriods: 1, completedAtMs: 4 * HOUR });
    input.bot.strategy = { ...input.bot.strategy, kind: 'sma', fastWindow: 1, slowWindow: 3 };
    bind(input);
    expect(() => evaluateGoalCompletedSignal(input)).toThrow('bots.errors.history');
  });

  it('waits for publication without consuming the current hour or modifying strategy state', () => {
    const input = fixture();
    input.now = 2 * HOUR + 1000;
    input.receivedAtMs = input.now;
    const before = clone(input);
    const pending = evaluateGoalCompletedSignal(input);
    expect(pending).toEqual({ kind: 'awaiting-history', completedAtMs: 2 * HOUR, lastAvailableAtMs: HOUR });
    expect(Object.isFrozen(pending)).toBe(true);
    expect(input).toEqual(before);
    input.history = history(['1', '1'], [1, 2]);
    input.now += 60_000;
    input.receivedAtMs = input.now;
    expect(evaluateGoalCompletedSignal(input)).toMatchObject({
      kind: 'decision',
      completedAtMs: 2 * HOUR,
      inputCodec: goalTestCodec(3),
      state: { lastEvaluatedAt: 2 * HOUR + 61_000, lastTradeAt: 0 },
    });
  });

  it('does not disguise invalid or insufficient prior history as pending publication', () => {
    const input = fixture();
    input.now = 2 * HOUR + 1000;
    input.receivedAtMs = input.now;
    input.history.boundaries[0].successor.height++;
    expect(() => evaluateGoalCompletedSignal(input)).toThrow('bots.errors.history');
    input.history = history(['1']);
    input.bot.strategy = { ...input.bot.strategy, kind: 'sma', fastWindow: 1, slowWindow: 3 };
    bind(input);
    expect(() => evaluateGoalCompletedSignal(input)).toThrow('bots.errors.history');
  });

  it.each([
    [
      'future receipt',
      (v: GoalCompletedSignalInput) => {
        v.receivedAtMs = v.now + 1;
      },
    ],
    [
      'missing entire completed hour',
      (v: GoalCompletedSignalInput) => {
        v.now += 2 * HOUR;
      },
    ],
    [
      'future candle',
      (v: GoalCompletedSignalInput) => {
        v.now = HOUR - 1;
        v.receivedAtMs = v.now;
      },
    ],
    [
      'wrong denomination',
      (v: GoalCompletedSignalInput) => {
        v.history.history.identity!.denominator = '2';
      },
    ],
    [
      'unverified denomination',
      (v: GoalCompletedSignalInput) => {
        v.history.history.denominationVerified = false;
      },
    ],
    [
      'missing boundary',
      (v: GoalCompletedSignalInput) => {
        (v.history.boundaries as unknown[]).pop();
      },
    ],
    [
      'mismatched boundary hour',
      (v: GoalCompletedSignalInput) => {
        (v.history.boundaries[0] as { completedAtMs: number }).completedAtMs += HOUR;
      },
    ],
    [
      'future successor',
      (v: GoalCompletedSignalInput) => {
        (v.history.boundaries[0].successor as { timestampSeconds: number }).timestampSeconds += 2;
      },
    ],
    [
      'stale strategy cursor',
      (v: GoalCompletedSignalInput) => {
        v.bot.state.lastEvaluatedAt = 1;
      },
    ],
    [
      'future trade',
      (v: GoalCompletedSignalInput) => {
        v.bot.state.lastTradeAt = v.now + 1;
      },
    ],
    [
      'legacy live observation',
      (v: GoalCompletedSignalInput) => {
        v.bot.state.lastLiveObservationAt = 0;
      },
    ],
    [
      'changed qualified lot',
      (v: GoalCompletedSignalInput) => {
        v.binding.maxTradeXorCodec = '1';
      },
    ],
    [
      'changed strategy',
      (v: GoalCompletedSignalInput) => {
        v.bot.strategy.threshold = '2';
      },
    ],
  ] as const)('rejects %s', (_name, mutate) => {
    const input = clone(fixture());
    mutate(input);
    expect(() => evaluateGoalCompletedSignal(input)).toThrow();
  });

  it.each(['ai', 'live-price', 'subhour', 'full-input-lot'] as const)('rejects unqualified %s semantics', (kind) => {
    const input = clone(fixture());
    if (kind === 'ai') input.bot.strategy.kind = 'ai';
    if (kind === 'live-price') {
      input.bot.strategy.kind = 'sma';
      input.bot.strategy.signalTiming = 'live-price';
    }
    if (kind === 'subhour') input.bot.strategy.intervalMs = 60_000;
    bind(input);
    if (kind === 'full-input-lot') input.binding.maxTradeKusdCodec = goalTestCodec(10);
    expect(() => evaluateGoalCompletedSignal(input)).toThrow();
  });

  it('rejects getters without invoking them', () => {
    const input = fixture();
    const getter = vi.fn(() => '1');
    Object.defineProperty(input.history.history.candles[0], 'close', { get: getter, enumerable: true });
    expect(() => evaluateGoalCompletedSignal(input)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects reused block hashes and nonmonotonic block identities across completed hours', () => {
    const input = fixture(goalStorageBot(), history(['1', '2']));
    const rows = input.history.boundaries as unknown as Array<{
      closing: { height: number; hash: string };
      successor: { height: number; hash: string };
    }>;
    rows[1].closing.hash = rows[0].closing.hash;
    expect(() => evaluateGoalCompletedSignal(input)).toThrow('bots.errors.history');
    rows[1].closing.hash = goalTestHash(200);
    rows[1].closing.height = 50;
    rows[1].successor.height = 51;
    expect(() => evaluateGoalCompletedSignal(input)).toThrow('bots.errors.history');
  });
});

function markForSignal(state: GoalExactLedgerState, atMs: number): GoalExactLedgerState {
  return markGoalExactLedger(state, {
    expectedRevision: state.revision,
    accountingAtMs: atMs,
    mark: goalTestMark(1000, atMs),
  });
}
