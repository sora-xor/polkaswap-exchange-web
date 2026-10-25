import { describe, expect, it } from 'vitest';
import {
  planHistoricalGoalTerminal,
  verifyHistoricalGoalTerminalClock,
} from '../../../../scripts/bots/historical-goal-terminal';

const HOUR = 3_600_000;
const episode = { startedAtMs: 100 * HOUR, endedAtMs: 124 * HOUR };
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const observed = { height: 100, hash: hash(100), parentHash: hash(99), timestampMs: episode.endedAtMs - 6_000 };
const successor = { height: 101, hash: hash(101), parentHash: hash(100), timestampMs: episode.endedAtMs + 1_000 };
const plan = () => planHistoricalGoalTerminal(episode, 12_000);

describe('historical goal terminal clock', () => {
  it('keeps the fixed deadline separate from the latest preceding state', () => {
    const result = verifyHistoricalGoalTerminalClock(plan(), observed, successor);
    expect(result.accountingAtMs).toBe(episode.endedAtMs);
    expect(result.observedStateTimestampMs).toBe(episode.endedAtMs - 6_000);
    expect(result.ageMs).toBe(6_000);
    expect(result.policy.arrivalTimeKnown).toBe(false);
    expect(result.policy.availability).toBe('retrospective-chain-state-as-of-deadline');
    expect(result.observedFill).toBe(false);
    expect(result.transactionSubmitted).toBe(false);
  });

  it('includes an exact-deadline block and the inclusive freshness boundary', () => {
    for (const age of [0, 12_000]) {
      const result = verifyHistoricalGoalTerminalClock(
        plan(),
        { ...observed, timestampMs: episode.endedAtMs - age },
        successor
      );
      expect(result.ageMs).toBe(age);
    }
  });

  it('rejects a stale or future state without choosing another deadline', () => {
    for (const age of [-1, 12_001])
      expect(() =>
        verifyHistoricalGoalTerminalClock(plan(), { ...observed, timestampMs: episode.endedAtMs - age }, successor)
      ).toThrow();
  });

  it('requires the successor strictly after the deadline, including exact timestamp ties', () => {
    for (const timestampMs of [observed.timestampMs, episode.endedAtMs])
      expect(() => verifyHistoricalGoalTerminalClock(plan(), observed, { ...successor, timestampMs })).toThrow();
  });

  it('rejects skipped heights, wrong parents and contradictory identities', () => {
    for (const update of [
      { height: 102 },
      { parentHash: hash(90) },
      { hash: observed.hash },
      { hash: observed.parentHash },
    ])
      expect(() => verifyHistoricalGoalTerminalClock(plan(), observed, { ...successor, ...update })).toThrow();
  });

  it('rejects a changed protocol, selection or availability claim', () => {
    for (const update of [
      { protocol: 'goal-episodes-v2' },
      { selection: 'first-after' },
      { availability: 'browser-observed' },
      { arrivalTimeKnown: true },
    ])
      expect(() =>
        verifyHistoricalGoalTerminalClock({ ...plan(), ...update } as ReturnType<typeof plan>, observed, successor)
      ).toThrow();
  });

  it('bounds policy ages and preserves a fixed UTC-aligned 24 hours', () => {
    for (const age of [-1, 0.5, 60_001, Number.NaN]) expect(() => planHistoricalGoalTerminal(episode, age)).toThrow();
    expect(() => planHistoricalGoalTerminal({ ...episode, endedAtMs: episode.endedAtMs + 1 }, 12_000)).toThrow();
    expect(() => planHistoricalGoalTerminal({ startedAtMs: 1, endedAtMs: 1 + 24 * HOUR }, 12_000)).toThrow();
    expect(planHistoricalGoalTerminal(episode, 0).maximumAgeMs).toBe(0);
  });

  it('rejects accessors without evaluating them', () => {
    let calls = 0;
    const bad = { ...observed };
    Object.defineProperty(bad, 'timestampMs', {
      enumerable: true,
      get: () => {
        calls++;
        return 0;
      },
    });
    expect(() => verifyHistoricalGoalTerminalClock(plan(), bad, successor)).toThrow();
    const badPlan = { ...plan() };
    Object.defineProperty(badPlan, 'episode', {
      enumerable: true,
      get: () => {
        calls++;
        return episode;
      },
    });
    expect(() => verifyHistoricalGoalTerminalClock(badPlan, observed, successor)).toThrow();
    expect(calls).toBe(0);
  });

  it('rejects extra fields, malformed identities and unsafe numbers', () => {
    for (const update of [
      { hash: '0x1234' },
      { parentHash: observed.hash },
      { height: Number.MAX_SAFE_INTEGER + 1 },
      { timestampMs: -1 },
      { secret: 'unexpected' },
    ])
      expect(() => verifyHistoricalGoalTerminalClock(plan(), { ...observed, ...update }, successor)).toThrow();
  });

  it('detaches and freezes all retained evidence', () => {
    const input = { ...observed };
    const result = verifyHistoricalGoalTerminalClock(plan(), input, successor);
    input.timestampMs = 1;
    expect(result.observed.timestampMs).toBe(observed.timestampMs);
    for (const value of [result, result.policy, result.policy.episode, result.observed, result.successor])
      expect(Object.isFrozen(value)).toBe(true);
  });
});
