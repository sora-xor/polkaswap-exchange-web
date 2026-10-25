import { describe, expect, it, vi } from 'vitest';
import {
  createHistoricalGoalSignalState,
  consumeHistoricalGoalSignal,
  type HistoricalGoalSignalState,
} from '../../../../scripts/bots/historical-goal-signals';
import {
  createHistoricalGoalLedger,
  markHistoricalGoalLedger,
  applyHistoricalGoalFill,
  type HistoricalGoalLedgerState,
} from '../../../../scripts/bots/historical-goal-ledger';
import { planHistoricalGoalSchedule } from '../../../../scripts/bots/historical-goal-schedule';
import type { BotCandle, StrategyConfig } from '../../../../src/features/bot-trading/types';
import { botFixture } from '../../features/bot-trading/fixtures';

const HOUR = 3_600_000;
const START = 500_000 * HOUR;
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const UNIT = 10n ** 18n;
const units = (whole: number) => String(BigInt(whole) * UNIT);
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const candle = (index: number, close = '1'): BotCandle => ({ timestamp: START + index * HOUR, close });
const mark = (offset = 0, xor = units(1000)) => ({
  timestampMs: START + offset,
  blockHash: hash(offset + 1),
  kusdReserveCodec: units(1000),
  xorReserveCodec: xor,
});

function fixture(strategy: Partial<StrategyConfig> = {}) {
  const bot = botFixture();
  bot.assetIn = { address: KUSD, symbol: 'KUSD', decimals: 18 };
  bot.assetOut = { address: XOR, symbol: 'XOR', decimals: 18 };
  bot.strategy = { ...bot.strategy, amount: '2.5', intervalMs: 1000, ...strategy };
  bot.policy = {
    maxTradeCodec: { [KUSD]: units(10), [XOR]: units(10) },
    slippagePercent: '0.5',
    maxPriceImpactPercent: '1',
    feeAsset: { ...bot.assetOut },
    feeBudgetCodec: units(1),
    sessionDurationMs: 24 * HOUR,
  };
  bot.portfolio = {
    initial: { [KUSD]: units(10), [XOR]: units(1) },
    holdings: { [KUSD]: units(10), [XOR]: units(1) },
    feesPaidCodec: '0',
    trades: 0,
  };
  bot.goal = {
    title: 'Grow XOR',
    durationMs: 24 * HOUR,
    targetReturnPercent: '5',
    maxLossPercent: '5',
    valuationAsset: 'output',
    lossMetric: 'drawdown',
  };
  const episode = { startedAtMs: START, endedAtMs: START + 24 * HOUR };
  const signals = Array.from({ length: 24 }, (_, i) => {
    const height = 1000 + i * 600;
    return {
      completedAtMs: START + i * HOUR,
      closing: { height, hash: hash(height), parentHash: hash(height - 1), timestampMs: START + i * HOUR - 6000 },
      successor: {
        height: height + 1,
        hash: hash(height + 1),
        parentHash: hash(height),
        timestampMs: START + i * HOUR,
      },
    };
  });
  const clock = {
    version: 1 as const,
    purpose: 'development' as const,
    availability: 'assumed-after-successor-block' as const,
    signalDelayMs: 60_000,
    executionDelayMs: 120_000,
    maximumExecutionLagMs: 60_000,
  };
  const schedule = planHistoricalGoalSchedule(signals, clock, episode, { cadenceMs: 60_000, maximumLagMs: 12_000 });
  const ledger = createHistoricalGoalLedger(bot, episode, mark());
  return { bot, episode, signals, clock, schedule, ledger };
}

const buy = (
  ledger: HistoricalGoalLedgerState,
  offset = 180_000,
  amount = '2500000000000000000',
  fee = '10000000000000000'
) =>
  applyHistoricalGoalFill(
    ledger,
    { inputAsset: KUSD, inputCodec: amount, outputAsset: XOR, outputCodec: amount, feeAsset: XOR, feeCodec: fee },
    mark(offset),
    'minimum-output-success'
  ).state;

describe('historical goal signal consumption', () => {
  it('copies the configuration and warmup and produces an immutable exact pending order bound to its fixed plan', () => {
    const f = fixture();
    const warmup = [candle(-2), candle(-1)];
    const initial = createHistoricalGoalSignalState(f.ledger, f.schedule, warmup);
    warmup[0].close = '999';
    const result = consumeHistoricalGoalSignal(initial, f.ledger, candle(0));
    expect(result.pending).toMatchObject({
      signalIndex: 0,
      signalCompletedAtMs: START,
      decidedAtMs: START + 60_000,
      targetExecutionAtMs: START + 180_000,
      maximumExecutionLagMs: 60_000,
      assetIn: KUSD,
      assetOut: XOR,
      amountInCodec: '2500000000000000000',
    });
    expect(result.pending!.plan).toEqual(f.schedule.executions[0]);
    expect(result.state.nextIndex).toBe(1);
    expect(initial.nextIndex).toBe(0);
    expect(initial.candles[0].close).toBe('1');
    expect(Object.isFrozen(result.pending)).toBe(true);
    expect(Object.isFrozen(result.state.binding.policy.maxTradeCodec)).toBe(true);
    expect(f.ledger.bot.portfolio.trades).toBe(0);
  });

  it('does not manufacture a first SMA crossover by evaluating pre-funding warmup', () => {
    const f = fixture({ kind: 'sma', fastWindow: 1, slowWindow: 3 });
    const initial = createHistoricalGoalSignalState(f.ledger, f.schedule, [
      candle(-3, '4'),
      candle(-2, '3'),
      candle(-1, '2'),
    ]);
    expect(initial.strategyState.previousSignal).toBeUndefined();
    const first = consumeHistoricalGoalSignal(initial, f.ledger, candle(0, '5'));
    expect(first.proposal.action).toBe('hold');
    expect(first.pending).toBeUndefined();
    expect(first.state.strategyState.previousSignal).toBe(1);
    const second = consumeHistoricalGoalSignal(first.state, f.ledger, candle(1, '1'));
    expect(second.blockedAction).toBe('sell');
    expect(second.proposal.reason).toBe('bots.events.noAllocation');
    const third = consumeHistoricalGoalSignal(second.state, f.ledger, candle(2, '6'));
    expect(third.proposal.action).toBe('buy');
    expect(third.pending!.signalIndex).toBe(2);
  });

  it('consumes all 24 slots, including hold and warmup outcomes, without dropping, reordering or appending another hour', () => {
    const f = fixture({ kind: 'sma', fastWindow: 2, slowWindow: 3 });
    let state = createHistoricalGoalSignalState(f.ledger, f.schedule);
    for (let index = 0; index < 24; index++) {
      const result = consumeHistoricalGoalSignal(state, f.ledger, candle(index));
      expect(result.proposal.action).toBe('hold');
      if (index < 2) expect(result.proposal.reason).toBe('bots.events.warmup');
      expect(result.state.nextIndex).toBe(index + 1);
      state = result.state;
    }
    expect(state.candles).toHaveLength(24);
    expect(() => consumeHistoricalGoalSignal(state, f.ledger, candle(24))).toThrow();
    const fresh = createHistoricalGoalSignalState(f.ledger, f.schedule);
    expect(() => consumeHistoricalGoalSignal(fresh, f.ledger, candle(1))).toThrow();
    const first = consumeHistoricalGoalSignal(fresh, f.ledger, candle(0));
    expect(() => consumeHistoricalGoalSignal(first.state, f.ledger, candle(0))).toThrow();
    expect(() => consumeHistoricalGoalSignal(first.state, f.ledger, candle(2))).toThrow();
  });

  it('retains the same event prefix when later candles are provided, without looking ahead', () => {
    const f = fixture({ kind: 'sma', fastWindow: 1, slowWindow: 2 });
    const state = createHistoricalGoalSignalState(f.ledger, f.schedule);
    const first = consumeHistoricalGoalSignal(state, f.ledger, candle(0, '2'));
    const before = JSON.stringify(first);
    consumeHistoricalGoalSignal(first.state, f.ledger, candle(1, '999'));
    expect(JSON.stringify(first)).toBe(before);
  });

  it('consumes a rejected quote hour once; rejection cannot retry that hour or grant an invented cooldown', () => {
    const f = fixture();
    const first = consumeHistoricalGoalSignal(
      createHistoricalGoalSignalState(f.ledger, f.schedule),
      f.ledger,
      candle(0)
    );
    expect(() => consumeHistoricalGoalSignal(first.state, f.ledger, candle(0))).toThrow();
    // Driver rejects the quote: unchanged ledger remains authoritative at the next hour.
    const next = consumeHistoricalGoalSignal(first.state, f.ledger, candle(1));
    expect(next.pending!.amountInCodec).toBe(first.pending!.amountInCodec);
    expect(next.state.strategyState.lastTradeAt).toBe(0);
  });

  it('uses the authoritative successful-fill timestamp for cooldown while still consuming blocked hours', () => {
    const f = fixture({ intervalMs: 2 * HOUR });
    const first = consumeHistoricalGoalSignal(
      createHistoricalGoalSignalState(f.ledger, f.schedule),
      f.ledger,
      candle(0)
    );
    const filled = buy(f.ledger);
    const second = consumeHistoricalGoalSignal(first.state, filled, candle(1));
    expect(second.proposal.reason).toBe('bots.events.interval');
    expect(second.pending).toBeUndefined();
    expect(second.state.strategyState.lastTradeAt).toBe(START + 180_000);
    const third = consumeHistoricalGoalSignal(second.state, filled, candle(2));
    expect(third.pending).toBeUndefined(); // 2h minus 120s since actual fill.
    expect(consumeHistoricalGoalSignal(third.state, filled, candle(3)).pending).toBeDefined();
  });

  it('freezes sell units from the signal close and spendable acquired XOR, never using the later quote or fee reserve', () => {
    const f = fixture({ kind: 'threshold', direction: 'above', threshold: '1' });
    const initial = createHistoricalGoalSignalState(f.ledger, f.schedule);
    const filled = buy(f.ledger, 1000);
    const close = candle(0, '3');
    const result = consumeHistoricalGoalSignal(initial, filled, close);
    expect(result.pending).toMatchObject({ assetIn: XOR, assetOut: KUSD, amountInCodec: '833333333333333333' });
    close.close = '1';
    expect(result.pending!.amountInCodec).toBe('833333333333333333');
    const small = buy(f.ledger, 1000, '100000000000000000', '1000000000000000');
    expect(consumeHistoricalGoalSignal(initial, small, candle(0)).pending!.amountInCodec).toBe('100000000000000000');
    expect(consumeHistoricalGoalSignal(initial, f.ledger, candle(0)).proposal.reason).toBe('bots.events.noAllocation');
  });

  it('does not clip an order above a fixed policy cap, and still consumes its signal', () => {
    const f = fixture();
    f.bot.policy.maxTradeCodec[KUSD] = units(2);
    const limited = createHistoricalGoalLedger(f.bot, f.episode, mark());
    const result = consumeHistoricalGoalSignal(
      createHistoricalGoalSignalState(limited, f.schedule),
      limited,
      candle(0)
    );
    expect(result).toMatchObject({ proposal: { action: 'hold', reason: 'bots.errors.policy' }, blockedAction: 'buy' });
    expect(result.pending).toBeUndefined();
    expect(result.state.nextIndex).toBe(1);
  });

  it('consumes stopped hours without another order or resetting the strategy and ledger', () => {
    const f = fixture();
    const initial = createHistoricalGoalSignalState(f.ledger, f.schedule);
    const stopped = markHistoricalGoalLedger(f.ledger, mark(1000, units(945)));
    const first = consumeHistoricalGoalSignal(initial, stopped, candle(0));
    expect(first.proposal.reason).toBe('bots.errors.goalComplete');
    expect(first.pending).toBeUndefined();
    expect(first.state.nextIndex).toBe(1);
    expect(consumeHistoricalGoalSignal(first.state, stopped, candle(1)).pending).toBeUndefined();
    expect(stopped.outcome).toBe('loss');
  });

  it('binds strategy, policy, initial allocation, episode and identity across detached ledger transitions', () => {
    const f = fixture();
    const state = createHistoricalGoalSignalState(f.ledger, f.schedule);
    const mutate: ((ledger: HistoricalGoalLedgerState) => void)[] = [
      (ledger) => {
        ledger.bot.strategy.amount = '3';
      },
      (ledger) => {
        ledger.bot.policy.maxTradeCodec[KUSD] = units(9);
      },
      (ledger) => {
        ledger.bot.portfolio.initial[KUSD] = units(9);
      },
      (ledger) => {
        (ledger.episode as { startedAtMs: number }).startedAtMs += HOUR;
      },
      (ledger) => {
        (ledger.bot as { id: string }).id = 'different';
      },
    ];
    for (const change of mutate) {
      const altered = JSON.parse(JSON.stringify(f.ledger)) as HistoricalGoalLedgerState;
      change(altered);
      expect(() => consumeHistoricalGoalSignal(state, altered, candle(0))).toThrow();
    }
    const copied = JSON.parse(JSON.stringify(f.ledger)) as HistoricalGoalLedgerState;
    expect(consumeHistoricalGoalSignal(state, copied, candle(0)).pending).toBeDefined(); // Upstream provenance is an explicit contract, not object identity.
  });

  it('rejects a later or regressed ledger, and cannot reuse older fee/trade state after a filled signal', () => {
    const f = fixture();
    const state = createHistoricalGoalSignalState(f.ledger, f.schedule);
    expect(() =>
      consumeHistoricalGoalSignal(state, markHistoricalGoalLedger(f.ledger, mark(60_001)), candle(0))
    ).toThrow();
    const first = consumeHistoricalGoalSignal(state, f.ledger, candle(0));
    const filled = buy(f.ledger);
    const second = consumeHistoricalGoalSignal(first.state, filled, candle(1));
    expect(() => consumeHistoricalGoalSignal(second.state, f.ledger, candle(2))).toThrow();
  });

  it('supports deterministic rule signals without consuming pre-funding rules or accepting a reused completed close', () => {
    const f = fixture({
      kind: 'rules',
      rules: {
        version: 1,
        entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
        exit: null,
      },
    });
    const state = createHistoricalGoalSignalState(f.ledger, f.schedule, [candle(-1, '1')]);
    expect(state.strategyState.lastRuleObservationAt).toBeUndefined();
    const first = consumeHistoricalGoalSignal(state, f.ledger, candle(0, '2'));
    expect(first.proposal.action).toBe('buy');
    expect(first.state.strategyState.lastRuleObservationAt).toBe(START);
    expect(() => consumeHistoricalGoalSignal(first.state, f.ledger, candle(0, '2'))).toThrow();
  });

  it('bounds warmup at200 exact consecutive pre-funding hours without substituting gaps or future closes', () => {
    const f = fixture();
    expect(
      createHistoricalGoalSignalState(
        f.ledger,
        f.schedule,
        Array.from({ length: 200 }, (_, i) => candle(i - 200))
      ).candles
    ).toHaveLength(200);
    for (const warmup of [
      [candle(0)],
      [candle(-2)],
      [candle(-3), candle(-1)],
      [candle(-1), candle(-2)],
      Array.from({ length: 201 }, (_, i) => candle(i - 201)),
    ])
      expect(() => createHistoricalGoalSignalState(f.ledger, f.schedule, warmup)).toThrow();
  });

  it('keeps a longer valid lookback unready until enough funded closes arrive instead of expanding warmup', () => {
    const f = fixture({ kind: 'sma', fastWindow: 1, slowWindow: 202 });
    const warmup = Array.from({ length: 200 }, (_, i) => candle(i - 200));
    const state = createHistoricalGoalSignalState(f.ledger, f.schedule, warmup);
    const first = consumeHistoricalGoalSignal(state, f.ledger, candle(0, '2'));
    expect(first.proposal.reason).toBe('bots.events.warmup');
    expect(first.state.strategyState.previousSignal).toBeUndefined();
    const second = consumeHistoricalGoalSignal(first.state, f.ledger, candle(1, '2'));
    expect(second.proposal.action).toBe('hold');
    expect(second.proposal.reason).toBe('bots.events.noSignal');
    expect(second.state.strategyState.previousSignal).toBe(1);
  });

  it('rejects AI/live-price strategies and a changed or incomplete fixed schedule', () => {
    for (const strategy of [
      { kind: 'ai' },
      { kind: 'sma', signalTiming: 'live-price', fastWindow: 1, slowWindow: 2 },
    ] as Partial<StrategyConfig>[]) {
      const f = fixture(strategy);
      expect(() => createHistoricalGoalSignalState(f.ledger, f.schedule)).toThrow();
    }
    const f = fixture();
    const changed = JSON.parse(JSON.stringify(f.schedule));
    changed.executions[0].assumedDecisionAtMs++;
    expect(() => createHistoricalGoalSignalState(f.ledger, changed)).toThrow();
    const missing = JSON.parse(JSON.stringify(f.schedule));
    missing.executions.pop();
    expect(() => createHistoricalGoalSignalState(f.ledger, missing)).toThrow();
    expect(() => createHistoricalGoalSignalState(buy(f.ledger), f.schedule)).toThrow();
  });

  it('refuses accessors, inherited/sparse data, invalid prices and forged signal states before evaluation', () => {
    const f = fixture();
    const getter = vi.fn(() => '1');
    const source = candle(-1);
    Object.defineProperty(source, 'close', { enumerable: true, get: getter });
    expect(() => createHistoricalGoalSignalState(f.ledger, f.schedule, [source])).toThrow();
    expect(() => createHistoricalGoalSignalState(f.ledger, f.schedule, new Array(1))).toThrow();
    const state = createHistoricalGoalSignalState(f.ledger, f.schedule);
    const bad = candle(0);
    Object.defineProperty(bad, 'close', { enumerable: true, get: getter });
    expect(() => consumeHistoricalGoalSignal(state, f.ledger, bad)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    for (const close of ['0', '-1', '1e3', 'NaN', ' 1', '0.' + '1'.repeat(37)])
      expect(() => consumeHistoricalGoalSignal(state, f.ledger, candle(0, close))).toThrow();
    expect(() => consumeHistoricalGoalSignal(state, f.ledger, Object.create(candle(0)))).toThrow();
    expect(() =>
      consumeHistoricalGoalSignal(JSON.parse(JSON.stringify(state)) as HistoricalGoalSignalState, f.ledger, candle(0))
    ).toThrow();
  });
});
