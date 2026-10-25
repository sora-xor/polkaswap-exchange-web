import { describe, expect, it, vi } from 'vitest';
import { planHistoricalGoalSchedule } from '../../../../scripts/bots/historical-goal-schedule';
import type { HistoricalHourSignal } from '../../../../scripts/bots/historical-execution-clock';

const HOUR = 3_600_000;
const START = 1000 * HOUR;
const END = START + 24 * HOUR;
const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
/** Synthetic metadata only: no reserves, quotes or strategy returns can affect scheduling. */
function fixture() {
  const signals: HistoricalHourSignal[] = Array.from({ length: 24 }, (_, index) => {
    const time = START + index * HOUR;
    const height = 1000 + index * 600;
    return {
      completedAtMs: time,
      closing: { hash: hash(height), parentHash: hash(height - 1), height, timestampMs: time - 6000 },
      successor: { hash: hash(height + 1), parentHash: hash(height), height: height + 1, timestampMs: time },
    };
  });
  return {
    signals,
    clock: {
      version: 1 as const,
      purpose: 'development' as const,
      availability: 'assumed-after-successor-block' as const,
      signalDelayMs: 60000,
      executionDelayMs: 120000,
      maximumExecutionLagMs: 60000,
    },
    episode: { startedAtMs: START, endedAtMs: END },
    valuation: { cadenceMs: 60000, maximumLagMs: 12000 },
  };
}
const plan = (input = fixture()) =>
  planHistoricalGoalSchedule(input.signals, input.clock, input.episode, input.valuation);

describe('fixed historical goal schedule', () => {
  it('retains every hourly opportunity and all 1,441 minute marks through the exact funded endpoint', () => {
    const result = plan();
    expect(result.executions).toHaveLength(24);
    expect(result.executions[0].targetExecutionAtMs).toBe(START + 180000);
    expect(result.executions.at(-1)!.targetExecutionAtMs).toBe(START + 23 * HOUR + 180000);
    expect(result.valuations).toHaveLength(1441);
    expect(result.valuations[0]).toEqual({
      kind: 'funding',
      targetAtMs: START,
      maximumLagMs: 0,
      selection: 'exact-timestamp',
    });
    expect(result.valuations.at(-1)).toEqual({
      kind: 'terminal',
      targetAtMs: END,
      maximumLagMs: 0,
      selection: 'exact-timestamp',
    });
    expect(result.valuations[1]).toEqual({
      kind: 'valuation',
      targetAtMs: START + 60000,
      maximumLagMs: 12000,
      selection: 'first-canonical-at-or-after',
    });
    expect(result.valuationContinuesAfterStop).toBe(true);
    expect(result.missingEvidence).toBe('retain-incomplete-no-replacement');
  });

  it('copies and freezes inputs instead of accepting later source or policy changes', () => {
    const source = fixture();
    const result = plan(source);
    source.signals[0].successor.timestampMs++;
    source.clock.signalDelayMs++;
    source.valuation.maximumLagMs++;
    source.episode.endedAtMs++;
    expect(result.executions[0].signal.successor.timestampMs).toBe(START);
    expect(result.executions[0].policy.signalDelayMs).toBe(60000);
    expect(result.valuationPolicy.maximumLagMs).toBe(12000);
    expect(result.episode.endedAtMs).toBe(END);
    expect(Object.isFrozen(result.valuations[0])).toBe(true);
    expect(Object.isFrozen(result.executions[0].signal.successor)).toBe(true);
  });

  it('rejects a hash reused at a distant height, even when neighboring hours remain ordered', () => {
    const source = fixture();
    source.signals[4].closing.hash = source.signals[0].closing.hash;
    source.signals[4].successor.parentHash = source.signals[4].closing.hash;
    expect(() => plan(source)).toThrow('block identity');
  });

  it.each(['missing', 'duplicate', 'reordered', 'cross-hour-hash', 'nonmonotonic'] as const)(
    'rejects %s hourly evidence without moving the start',
    (kind) => {
      const source = fixture();
      if (kind === 'missing') source.signals.pop();
      if (kind === 'duplicate') source.signals[1] = source.signals[0];
      if (kind === 'reordered') [source.signals[1], source.signals[2]] = [source.signals[2], source.signals[1]];
      if (kind === 'cross-hour-hash') source.signals[1].successor.hash = source.signals[0].successor.hash;
      if (kind === 'nonmonotonic') {
        source.signals[1].closing.height = 1;
        source.signals[1].successor.height = 2;
      }
      expect(() => plan(source)).toThrow();
    }
  );

  it.each([0, 5999, 6001, HOUR + 1, NaN, Infinity, 6000.5])('rejects unsupported cadence %s', (cadenceMs) => {
    const source = fixture();
    source.valuation.cadenceMs = cadenceMs;
    expect(() => plan(source)).toThrow();
  });

  it.each([-1, 60000, NaN, 0.5])('rejects ambiguous or invalid mark lag %s', (maximumLagMs) => {
    const source = fixture();
    source.valuation.maximumLagMs = maximumLagMs;
    expect(() => plan(source)).toThrow();
  });

  it('rejects execution windows extending to the deadline instead of silently discarding the final signal', () => {
    const source = fixture();
    source.clock.executionDelayMs = HOUR - 60000 - 30000;
    expect(() => plan(source)).toThrow('fixed episode');
  });

  it('refuses accessor-backed slots and policy fields without invoking them', () => {
    const getter = vi.fn();
    const source = fixture();
    Object.defineProperty(source.signals, '0', { enumerable: true, get: getter });
    expect(() => plan(source)).toThrow();
    const other = fixture();
    Object.defineProperty(other.valuation, 'cadenceMs', { enumerable: true, get: getter });
    expect(() => plan(other)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});
