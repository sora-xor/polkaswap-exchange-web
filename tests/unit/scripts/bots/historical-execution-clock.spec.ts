import { describe, expect, it } from 'vitest';
import {
  planHistoricalExecutionClock,
  verifyHistoricalExecutionClock,
  type HistoricalClockBlock,
  type HistoricalClockPolicy,
} from '../../../../scripts/bots/historical-execution-clock';

const HOUR = 3_600_000;
const start = 500_000 * HOUR;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const block = (height: number, timestampMs: number): HistoricalClockBlock => ({
  hash: hash(height),
  parentHash: hash(height - 1),
  height,
  timestampMs,
});
const signal = () => ({ completedAtMs: start, closing: block(10, start - 6_000), successor: block(11, start) });
const policy = (): HistoricalClockPolicy => ({
  version: 1,
  purpose: 'development',
  availability: 'assumed-after-successor-block',
  signalDelayMs: 60_000,
  executionDelayMs: 12_000,
  maximumExecutionLagMs: 6_000,
});
const episode = () => ({ startedAtMs: start, endedAtMs: start + 24 * HOUR });
const plan = () => planHistoricalExecutionClock(signal(), policy(), episode());

describe('historical execution clocks', () => {
  it('keeps the funded baseline while explicitly separating signal, decision and later quote state', () => {
    const p = plan();
    expect(p.episode.startedAtMs).toBe(start);
    expect(p.assumedDecisionAtMs).toBe(start + 60_000);
    expect(p.targetExecutionAtMs).toBe(start + 72_000);
    expect(verifyHistoricalExecutionClock(p, block(22, start + 66_000), block(23, start + 72_000))).toEqual({
      kind: 'hypothetical-archived-quote-state',
      executionAtMs: start + 72_000,
      lagMs: 0,
      observedFill: false,
    });
  });

  it('uses the real successor time when proving the hour was delayed', () => {
    const s = signal();
    s.successor.timestampMs += 30_000;
    expect(planHistoricalExecutionClock(s, policy(), episode()).targetExecutionAtMs).toBe(start + 102_000);
  });

  it('rejects same-state, earlier, nonadjacent, or selectively later execution observations', () => {
    const p = plan();
    for (const pair of [
      [block(10, start - 6_000), block(11, start)],
      [block(22, start + 66_000), block(23, start + 70_000)],
      [block(21, start + 66_000), block(23, start + 72_000)],
      [block(22, start - 1), block(23, start + 72_000)],
      [block(23, start + 72_000), block(24, start + 78_000)],
      [block(22, start + 66_000), { ...block(23, start + 72_000), parentHash: hash(99) }],
    ])
      expect(() => verifyHistoricalExecutionClock(p, pair[0], pair[1])).toThrow();
  });

  it('accepts exact lag equality and preserves an expired opportunity as a failure', () => {
    const p = plan();
    expect(verifyHistoricalExecutionClock(p, block(22, start + 66_000), block(23, start + 78_000)).lagMs).toBe(6_000);
    expect(() => verifyHistoricalExecutionClock(p, block(22, start + 66_000), block(23, start + 78_001))).toThrow(
      'expired'
    );
  });

  it('rejects reused block hashes and contradictory parents among supplied adjacent headers', () => {
    const p = plan();
    const reused = { ...block(22, start + 66_000), hash: p.signal.successor.hash };
    expect(() =>
      verifyHistoricalExecutionClock(p, reused, { ...block(23, start + 72_000), parentHash: reused.hash })
    ).toThrow('contradict');
    expect(() =>
      verifyHistoricalExecutionClock(p, block(22, start + 66_000), {
        ...block(23, start + 72_000),
        hash: p.signal.closing.hash,
      })
    ).toThrow('contradict');
    expect(() =>
      verifyHistoricalExecutionClock(
        p,
        { ...block(12, start + 6_000), parentHash: hash(99) },
        block(13, start + 72_000)
      )
    ).toThrow('contradict');
    expect(verifyHistoricalExecutionClock(p, block(12, start + 6_000), block(13, start + 72_000)).observedFill).toBe(
      false
    );
  });

  it('rejects malformed hour proofs and never changes the fixed 24-hour start or endpoint', () => {
    for (const s of [
      { ...signal(), completedAtMs: start + 1 },
      { ...signal(), closing: block(10, start) },
      { ...signal(), closing: block(10, start - HOUR - 1) },
      { ...signal(), successor: block(12, start) },
      { ...signal(), successor: block(11, start + HOUR) },
      { ...signal(), successor: { ...block(11, start), parentHash: hash(99) } },
    ])
      expect(() => planHistoricalExecutionClock(s, policy(), episode())).toThrow();
    expect(() =>
      planHistoricalExecutionClock(signal(), policy(), { ...episode(), endedAtMs: start + 23 * HOUR })
    ).toThrow();
    expect(() =>
      planHistoricalExecutionClock({ ...signal(), completedAtMs: start + 24 * HOUR }, policy(), episode())
    ).toThrow();
    const last = {
      completedAtMs: start + 23 * HOUR,
      closing: block(10, start + 23 * HOUR - 1),
      successor: block(11, start + 24 * HOUR - 12_000),
    };
    expect(() => planHistoricalExecutionClock(last, { ...policy(), signalDelayMs: 0 }, episode())).toThrow('deadline');
  });

  it('rejects tampered plans, getters, non-data fields and invalid numeric limits', () => {
    const p = plan();
    expect(() =>
      verifyHistoricalExecutionClock(
        { ...p, targetExecutionAtMs: p.targetExecutionAtMs - 1 },
        block(22, start + 66_000),
        block(23, start + 72_000)
      )
    ).toThrow('changed');
    let called = false;
    const evil = Object.defineProperty({ ...signal() }, 'completedAtMs', {
      enumerable: true,
      get() {
        called = true;
        return start;
      },
    });
    expect(() => planHistoricalExecutionClock(evil, policy(), episode())).toThrow('accessor');
    expect(called).toBe(false);
    const coercedHash = {
      toString() {
        called = true;
        return hash(10);
      },
    };
    expect(() =>
      planHistoricalExecutionClock(
        { ...signal(), closing: { ...signal().closing, hash: coercedHash as unknown as string } },
        policy(),
        episode()
      )
    ).toThrow('hash');
    expect(called).toBe(false);
    expect(() =>
      planHistoricalExecutionClock({ ...signal(), hidden: true } as ReturnType<typeof signal>, policy(), episode())
    ).toThrow('fields');
    for (const executionDelayMs of [0, -1, NaN, Infinity, 1.5, HOUR + 1])
      expect(() => planHistoricalExecutionClock(signal(), { ...policy(), executionDelayMs }, episode())).toThrow();
  });

  it('copies and freezes source inputs without retaining mutable caller references', () => {
    const s = signal();
    const p = policy();
    const e = episode();
    const frozen = planHistoricalExecutionClock(s, p, e);
    s.successor.timestampMs += HOUR;
    p.executionDelayMs = 1;
    e.endedAtMs += HOUR;
    expect(frozen.targetExecutionAtMs).toBe(start + 72_000);
    expect(frozen.signal.successor.timestampMs).toBe(start);
    expect(Object.isFrozen(frozen.signal.successor)).toBe(true);
    expect(Object.isFrozen(frozen.policy)).toBe(true);
  });
});
