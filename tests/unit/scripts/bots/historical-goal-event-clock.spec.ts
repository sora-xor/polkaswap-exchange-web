import { describe, expect, it, vi } from 'vitest';
import {
  createHistoricalGoalEventClock,
  advanceHistoricalGoalEventClock,
  type HistoricalGoalEventClockState,
  type HistoricalGoalEventClockPolicy,
  type HistoricalGoalEventClockEvent,
} from '../../../../scripts/bots/historical-goal-event-clock';

const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
const policy = (): HistoricalGoalEventClockPolicy => ({
  version: 1,
  purpose: 'development',
  mode: 'finalized-callbacks-only',
  arrivalAssumption: 'nonnegative-chain-to-browser-delay',
  startedAtMs: 0,
  deadlineAtMs: 86_400_000,
});
const create = () => createHistoricalGoalEventClock(policy());
const arrival = (
  height: number,
  arrivedAtMs: number,
  processedAtMs = arrivedAtMs,
  timestampMs = arrivedAtMs
): HistoricalGoalEventClockEvent => ({
  kind: 'finalized-arrival',
  arrivedAtMs,
  processedAtMs,
  block: { height, hash: hash(height), parentHash: hash(height - 1), timestampMs },
});
const done = (
  atMs: number,
  checkId = 1,
  outcome: 'complete' | 'missing-rpc-evidence' | 'cancelled' = 'complete'
): HistoricalGoalEventClockEvent => ({
  kind: 'complete',
  atMs,
  checkId,
  outcome,
});
const advance = advanceHistoricalGoalEventClock;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('explicit finalized-arrival sliding event clock', () => {
  it('starts one check before work and uses actual processing time, separately from arrival and block time', () => {
    const result = advance(create(), arrival(1, 100, 200, 50));
    expect(result.action).toMatchObject({
      kind: 'start-check',
      check: { id: 1, checkedAtMs: 200, arrival: { arrivedAtMs: 100, block: { timestampMs: 50 } } },
    });
    expect(result.state).toMatchObject({
      checkedAtMs: 200,
      nextDueAtMs: 60_200,
      lastSchedulerTickAtMs: 200,
      tradingAuthority: false,
    });
  });

  it('shifts future targets after an 18s late eligible callback, without minute-grid catch-up', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, done(1)).state;
    state = advance(state, arrival(2, 54_000)).state;
    let result = advance(state, arrival(3, 78_000));
    expect(result.action.kind).toBe('start-check');
    expect(result.state.nextDueAtMs).toBe(138_000);
    state = advance(result.state, done(78_001, 2)).state;
    result = advance(state, arrival(4, 120_000));
    expect(result.action).toEqual({ kind: 'noop', reason: 'not-due' });
    result = advance(result.state, arrival(5, 138_000));
    expect(result.action).toMatchObject({ kind: 'start-check', check: { id: 3, checkedAtMs: 138_000 } });
    expect(result.state.nextDueAtMs).toBe(198_000);
  });

  it('coalesces busy arrivals to the newest height, then drains at completion time', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, arrival(2, 20_000)).state;
    let result = advance(state, arrival(3, 40_000));
    expect(result.action.kind).toBe('queued');
    expect(result.state.queued?.block.height).toBe(3);
    expect(result.state.lastSchedulerTickAtMs).toBe(0);
    result = advance(result.state, arrival(2, 50_000, 50_000, 20_000));
    expect(result.action).toEqual({ kind: 'noop', reason: 'duplicate-or-old-block' });
    expect(result.state.queued?.block.height).toBe(3);
    result = advance(result.state, done(60_000));
    expect(result.action).toMatchObject({
      kind: 'start-check',
      check: { id: 2, checkedAtMs: 60_000, arrival: { arrivedAtMs: 40_000, block: { height: 3 } } },
    });
    expect(result.state.queued).toBeNull();
    expect(result.state.nextDueAtMs).toBe(120_000);
  });

  it('drains a queued callback without starting work if it is not due', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, arrival(2, 20_000)).state;
    const result = advance(state, done(25_000));
    expect(result.action).toEqual({ kind: 'noop', reason: 'not-due' });
    expect(result.state).toMatchObject({
      lastSchedulerTickAtMs: 25_000,
      checkedAtMs: 0,
      nextDueAtMs: 60_000,
      busy: null,
      queued: null,
    });
  });

  it('does not manufacture a tick on completion without a queue', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, done(60_001)).state;
    expect(state).toMatchObject({ status: 'active', lastSchedulerTickAtMs: 0, busy: null });
    const result = advance(state, { kind: 'watchdog', atMs: 60_001 });
    expect(result.action).toEqual({ kind: 'pause', reason: 'scheduler-gap' });
  });

  it('accepts exactly60s, while watchdog at60s+1 pauses even with busy callback arrivals', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, arrival(2, 59_000)).state;
    let result = advance(state, { kind: 'watchdog', atMs: 60_000 });
    expect(result.action).toEqual({ kind: 'noop', reason: 'watchdog' });
    expect(result.state.lastSchedulerTickAtMs).toBe(0);
    result = advance(result.state, { kind: 'watchdog', atMs: 60_001 });
    expect(result.action).toEqual({ kind: 'pause', reason: 'scheduler-gap' });
    expect(result.state).toMatchObject({ busy: null, queued: null });
    result = advance(result.state, done(60_002));
    expect(result.action).toEqual({ kind: 'noop', reason: 'latched' });
    expect(result.state.status).toBe('paused');
  });

  it.each(['idle', 'drain'] as const)('updates the scheduler tick before pausing a late %s tick', (kind) => {
    let state = advance(create(), arrival(1, 0)).state;
    if (kind === 'idle') state = advance(state, done(1)).state;
    else state = advance(state, arrival(2, 59_000)).state;
    const result = advance(state, kind === 'idle' ? arrival(2, 60_001) : done(60_001));
    expect(result.action).toEqual({ kind: 'pause', reason: 'scheduler-gap' });
    expect(result.state.lastSchedulerTickAtMs).toBe(60_001);
    expect(result.state.nextDueAtMs).toBe(60_000);
  });

  it('does not interpret an adjacent canonical timestamp gap as browser silence or missing RPC', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, done(1)).state;
    const result = advance(state, arrival(2, 18_000));
    expect(result.action).toEqual({ kind: 'noop', reason: 'not-due' });
    expect(result.state).toMatchObject({ status: 'active', pauseReason: null, lastSchedulerTickAtMs: 18_000 });
  });

  it.each(['missing-rpc-evidence', 'cancelled'] as const)(
    'pauses explicitly for %s without rearming from a queued arrival',
    (outcome) => {
      let state = advance(create(), arrival(1, 0)).state;
      state = advance(state, arrival(2, 100)).state;
      const result = advance(state, done(200, 1, outcome));
      expect(result.action).toEqual({ kind: 'pause', reason: outcome });
      expect(result.state).toMatchObject({ checkedAtMs: 0, nextDueAtMs: 60_000, busy: null, queued: null });
      expect(advance(result.state, arrival(3, 60_000)).state.status).toBe('paused');
    }
  );

  it('external cancellation latches and a late completion cannot restart the session', () => {
    const busy = advance(create(), arrival(1, 0)).state;
    const cancelled = advance(busy, { kind: 'cancel', atMs: 10 });
    expect(cancelled.action).toEqual({ kind: 'pause', reason: 'cancelled' });
    const late = advance(cancelled.state, done(11));
    expect(late.state.status).toBe('paused');
    expect(late.state.nextCheckId).toBe(2);
    expect(late.action).toEqual({ kind: 'noop', reason: 'latched' });
  });

  it.each(['watchdog', 'cancel', 'complete', 'finalized-arrival'] as const)(
    'deadline wins over %s and latches expiry',
    (kind) => {
      const short = { ...policy(), deadlineAtMs: 60_000 };
      const busy = advance(createHistoricalGoalEventClock(short), arrival(1, 0)).state;
      const event =
        kind === 'complete' ? done(60_000) : kind === 'finalized-arrival' ? arrival(2, 60_000) : { kind, atMs: 60_000 };
      const result = advance(busy, event);
      expect(result.action).toEqual({ kind: 'expire' });
      expect(result.state).toMatchObject({ status: 'expired', busy: null, queued: null });
      expect(advance(result.state, done(60_001)).action).toEqual({ kind: 'noop', reason: 'latched' });
    }
  );

  it('expires an already paused session at the original deadline without restarting its clock', () => {
    let state = advance(create(), { kind: 'cancel', atMs: 5 }).state;
    state = advance(state, { kind: 'watchdog', atMs: 86_400_000 }).state;
    expect(state).toMatchObject({ status: 'expired', checkedAtMs: null, nextDueAtMs: 0 });
    expect(state.policy.startedAtMs).toBe(0);
  });

  it('rejects unknown IDs while active and ignores known completed IDs during newer work', () => {
    expect(() => advance(create(), done(0))).toThrow();
    let state = advance(create(), arrival(1, 0)).state;
    expect(() => advance(state, done(1, 2))).toThrow();
    state = advance(state, done(1)).state;
    expect(advance(state, done(2)).action).toEqual({ kind: 'noop', reason: 'stale-completion' });
    state = advance(state, arrival(2, 60_000)).state;
    const late = advance(state, done(60_001, 1, 'missing-rpc-evidence'));
    expect(late.action).toEqual({ kind: 'noop', reason: 'stale-completion' });
    expect(late.state.busy?.id).toBe(2);
  });

  it('copies/freezes nested source data and validates JSON-restored state', () => {
    const inputPolicy = policy();
    const initial = createHistoricalGoalEventClock(inputPolicy);
    inputPolicy.deadlineAtMs = 10;
    const event = arrival(1, 10, 20, 5) as Extract<HistoricalGoalEventClockEvent, { kind: 'finalized-arrival' }>;
    const result = advance(initial, event);
    event.block.timestampMs = 9;
    event.arrivedAtMs = 12;
    expect(result.state.policy.deadlineAtMs).toBe(86_400_000);
    expect(result.state.busy?.arrival.block.timestampMs).toBe(5);
    expect(Object.isFrozen(result.state.busy?.arrival.block)).toBe(true);
    expect(Object.isFrozen(result.action)).toBe(true);
    expect(advance(copy(result.state), done(21)).state.busy).toBeNull();
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid event time %s', (atMs) => {
    expect(() => advance(create(), { kind: 'watchdog', atMs })).toThrow();
  });

  it('rejects reversed processing/arrival/block clocks without filling in a timestamp', () => {
    expect(() => advance(create(), arrival(1, 20, 19))).toThrow();
    expect(() => advance(create(), arrival(1, 20, 21, 22))).toThrow();
    let state = advance(create(), arrival(1, 20, 30, 10)).state;
    expect(() => advance(state, { kind: 'watchdog', atMs: 29 })).toThrow();
    expect(() => advance(state, arrival(2, 19, 40, 11))).toThrow();
    state = advance(state, arrival(2, 25, 40, 11)).state;
    expect(state.queued?.arrivedAtMs).toBe(25);
  });

  it('rejects contradictory latest identities and an incorrect adjacent parent', () => {
    const state = advance(create(), arrival(1, 0)).state;
    const wrongHash = arrival(1, 1, 1, 0) as Extract<HistoricalGoalEventClockEvent, { kind: 'finalized-arrival' }>;
    wrongHash.block.hash = hash(7);
    expect(() => advance(state, wrongHash)).toThrow();
    const wrongParent = arrival(2, 1) as typeof wrongHash;
    wrongParent.block.parentHash = hash(8);
    expect(() => advance(state, wrongParent)).toThrow();
    expect(() => advance(state, arrival(2, 1, 1, 0))).toThrow();
  });

  it('rejects a changed identity for an older busy block after a newer callback is queued', () => {
    let state = advance(create(), arrival(1, 0)).state;
    state = advance(state, arrival(2, 10)).state;
    const changed = arrival(1, 20, 20, 0) as Extract<HistoricalGoalEventClockEvent, { kind: 'finalized-arrival' }>;
    changed.block.hash = hash(9);
    expect(() => advance(state, changed)).toThrow();
    const forged = copy(state) as unknown as Record<string, unknown>;
    forged.queued = null;
    expect(() => advance(forged as unknown as HistoricalGoalEventClockState, done(21))).toThrow();
  });

  it.each(['nextDueAtMs', 'checkedAtMs', 'nextCheckId', 'lastSchedulerTickAtMs', 'tradingAuthority'] as const)(
    'rejects corrupt restored %s',
    (field) => {
      const state = copy(advance(create(), arrival(1, 0)).state) as unknown as Record<string, unknown>;
      state[field] = field === 'tradingAuthority' ? true : 77;
      expect(() => advance(state as unknown as HistoricalGoalEventClockState, done(1))).toThrow();
    }
  );

  it('rejects accessors, extra fields, classes and unmodeled polling without invoking getters', () => {
    const getter = vi.fn();
    const input = policy();
    Object.defineProperty(input, 'deadlineAtMs', { enumerable: true, get: getter });
    expect(() => createHistoricalGoalEventClock(input)).toThrow();
    const event = { atMs: 0 };
    Object.defineProperty(event, 'kind', { enumerable: true, get: getter });
    expect(() => advance(create(), event as HistoricalGoalEventClockEvent)).toThrow();
    const state = copy(create());
    Object.defineProperty(state, 'nextDueAtMs', { enumerable: true, get: getter });
    expect(() => advance(state, { kind: 'watchdog', atMs: 0 })).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(() => advance(create(), { kind: 'poll', atMs: 0 } as unknown as HistoricalGoalEventClockEvent)).toThrow();
    expect(() =>
      advance(create(), { kind: 'watchdog', atMs: 0, price: '1' } as HistoricalGoalEventClockEvent)
    ).toThrow();
    expect(() => createHistoricalGoalEventClock(Object.assign(new (class {})(), policy()))).toThrow();
  });

  it('rejects unsupported policies and overflowing or unbounded durations', () => {
    for (const overrides of [
      { mode: 'poll' },
      { version: 2 },
      { arrivalAssumption: 'block-time-is-arrival' },
      { deadlineAtMs: 0 },
      { deadlineAtMs: 86_400_001 },
      { startedAtMs: Number.MAX_SAFE_INTEGER },
    ]) {
      expect(() =>
        createHistoricalGoalEventClock({ ...policy(), ...overrides } as HistoricalGoalEventClockPolicy)
      ).toThrow();
    }
  });
});
