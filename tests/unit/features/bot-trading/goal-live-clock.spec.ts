// @vitest-environment node
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { ApiPromise } from '@polkadot/api';
import {
  createGoalLiveClock,
  type GoalLiveClockCheck,
  type GoalLiveClockHeader,
  type GoalLiveClockOptions,
} from '@/features/bot-trading/goal-live-clock';
import {
  advanceHistoricalGoalEventClock,
  createHistoricalGoalEventClock,
} from '../../../../scripts/bots/historical-goal-event-clock';

const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
const header = (height: number): GoalLiveClockHeader => ({
  number: { toNumber: () => height },
  hash: { toHex: () => hash(height) },
  parentHash: { toHex: () => hash(height - 1) },
});
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
function harness(change: Partial<GoalLiveClockOptions> = {}) {
  let time = 0;
  let current = true;
  let callback!: (value: GoalLiveClockHeader) => void;
  const checks: GoalLiveClockCheck[] = [];
  const signals: AbortSignal[] = [];
  const finish: Array<(value: 'complete' | 'missing-rpc-evidence') => void> = [];
  const unsub = vi.fn();
  const options: GoalLiveClockOptions = {
    startedAtMs: 0,
    deadlineAtMs: 86_400_000,
    now: () => time,
    isCurrent: () => current,
    subscribeFinalizedHeads: vi.fn(async (cb) => {
      callback = cb;
      return unsub;
    }),
    onCheck: vi.fn((check, signal) => {
      checks.push(check);
      signals.push(signal);
      return new Promise<'complete' | 'missing-rpc-evidence'>((resolve) => finish.push(resolve));
    }),
    onStop: vi.fn(),
    ...change,
  };
  const clock = createGoalLiveClock(options);
  return {
    clock,
    checks,
    signals,
    finish,
    unsub,
    options,
    setTime: (value: number) => {
      time = value;
    },
    setCurrent: (value: boolean) => {
      current = value;
    },
    emit: (height: number, atMs: number, value = header(height)) => {
      time = atMs;
      callback(value);
    },
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('finalized callback live goal clock', () => {
  it('accepts the installed public SDK subscription interface without private APIs', () => {
    expectTypeOf<ApiPromise['rpc']['chain']['subscribeFinalizedHeads']>().toMatchTypeOf<
      GoalLiveClockOptions['subscribeFinalizedHeads']
    >();
  });

  it('captures arrival before decoding and preserves callback identity separately from processing', async () => {
    const h = harness();
    await h.clock.ready;
    const input = header(10);
    input.number.toNumber = () => {
      h.setTime(18);
      return 10;
    };
    h.emit(10, 12, input);
    expect(h.checks).toEqual([
      {
        id: 1,
        checkedAtMs: 18,
        arrival: { arrivedAtMs: 12, block: { height: 10, hash: hash(10), parentHash: hash(9) } },
      },
    ]);
    input.hash.toHex = () => hash(11);
    expect(h.checks[0].arrival.block.hash).toBe(hash(10));
    expect(Object.isFrozen(h.checks[0].arrival.block)).toBe(true);
    expect(h.clock.snapshot().nextDueAtMs).toBe(60_018);
    expect(h.clock.snapshot().tradingAuthority).toBe(false);
    expect(h.checks[0].arrival.block).not.toHaveProperty('timestampMs');
    h.clock.cancel();
  });

  it('uses actual check time for an 18-second drift and matches the declared historical timing model', async () => {
    const h = harness();
    await h.clock.ready;
    let historic = createHistoricalGoalEventClock({
      version: 1,
      purpose: 'development',
      mode: 'finalized-callbacks-only',
      arrivalAssumption: 'nonnegative-chain-to-browser-delay',
      startedAtMs: 0,
      deadlineAtMs: 86_400_000,
    });
    for (const [height, time] of [
      [10, 0],
      [11, 42_000],
      [12, 78_000],
      [13, 120_000],
      [14, 138_000],
    ]) {
      h.emit(height, time);
      historic = advanceHistoricalGoalEventClock(historic, {
        kind: 'finalized-arrival',
        arrivedAtMs: time,
        processedAtMs: time,
        block: { height, hash: hash(height), parentHash: hash(height - 1), timestampMs: time },
      }).state;
      if (historic.busy) {
        historic = advanceHistoricalGoalEventClock(historic, {
          kind: 'complete',
          atMs: time,
          checkId: historic.busy.id,
          outcome: 'complete',
        }).state;
        h.finish.at(-1)!('complete');
        await flush();
      }
      expect(h.clock.snapshot()).toMatchObject({
        checkedAtMs: historic.checkedAtMs,
        nextDueAtMs: historic.nextDueAtMs,
        lastSchedulerTickAtMs: historic.lastSchedulerTickAtMs,
        status: historic.status,
      });
    }
    expect(h.checks.map((check) => check.checkedAtMs)).toEqual([0, 78_000, 138_000]);
    h.clock.cancel();
  });

  it('coalesces the newest height and drains with completion time, keeping original arrival', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 0);
    h.emit(11, 20_000);
    h.emit(12, 40_000);
    h.emit(11, 50_000);
    expect(h.clock.snapshot().queued?.block.height).toBe(12);
    expect(h.clock.snapshot().lastSchedulerTickAtMs).toBe(0);
    expect(h.checks).toHaveLength(1);
    h.setTime(60_000);
    h.finish[0]('complete');
    await flush();
    expect(h.checks[1]).toMatchObject({
      id: 2,
      checkedAtMs: 60_000,
      arrival: { arrivedAtMs: 40_000, block: { height: 12 } },
    });
    expect(h.clock.snapshot().nextDueAtMs).toBe(120_000);
    h.clock.cancel();
  });

  it('does not make a completion without queued callbacks a scheduler tick', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 0);
    h.setTime(40_000);
    h.finish[0]('complete');
    await flush();
    expect(h.clock.snapshot().lastSchedulerTickAtMs).toBe(0);
    h.setTime(60_001);
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.clock.snapshot().pauseReason).toBe('scheduler-gap');
  });

  it('allows exactly 60 seconds but the watchdog pauses a busy operation after that boundary', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 0);
    h.emit(11, 59_000);
    h.setTime(60_000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.clock.snapshot().status).toBe('active');
    h.setTime(60_001);
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.clock.snapshot()).toMatchObject({
      status: 'paused',
      pauseReason: 'scheduler-gap',
      busy: null,
      queued: null,
    });
    expect(h.signals[0].aborted).toBe(true);
    h.finish[0]('complete');
    await flush();
    expect(h.checks).toHaveLength(1);
    expect(h.unsub).toHaveBeenCalledTimes(1);
  });

  it('rejects a delayed queued drain after 60 seconds even if the watchdog has not run', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 0);
    h.emit(11, 20_000);
    h.setTime(60_001);
    h.finish[0]('complete');
    await flush();
    expect(h.clock.snapshot().pauseReason).toBe('scheduler-gap');
    expect(h.checks).toHaveLength(1);
  });

  it('never polls or checks on watchdog ticks without a finalized callback', async () => {
    const h = harness();
    await h.clock.ready;
    h.setTime(60_000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.options.onCheck).not.toHaveBeenCalled();
    expect(h.options.subscribeFinalizedHeads).toHaveBeenCalledTimes(1);
    h.setTime(60_001);
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.clock.snapshot().pauseReason).toBe('scheduler-gap');
  });

  it.each(['callback', 'completion', 'cancel', 'watchdog'] as const)(
    'gives the fixed deadline precedence on %s',
    async (event) => {
      const h = harness({ deadlineAtMs: 30_000 });
      await h.clock.ready;
      h.emit(10, 0);
      h.setTime(30_000);
      if (event === 'callback') h.emit(11, 30_000);
      if (event === 'completion') h.finish[0]('missing-rpc-evidence');
      if (event === 'cancel') h.clock.cancel();
      if (event === 'watchdog') await vi.advanceTimersByTimeAsync(1000);
      await flush();
      expect(h.clock.snapshot()).toMatchObject({ status: 'expired', pauseReason: null, deadlineAtMs: 30_000 });
      expect(h.options.onStop).toHaveBeenCalledWith({ kind: 'expire', reason: null, atMs: 30_000 });
      expect(h.signals[0].aborted).toBe(true);
      expect(h.checks).toHaveLength(1);
    }
  );

  it('allows a new authorized instance against an existing deadline without extending it', async () => {
    const h = harness({ startedAtMs: 50_000, deadlineAtMs: 80_000, now: () => 50_000 });
    await h.clock.ready;
    h.emit(10, 50_000);
    expect(h.clock.snapshot()).toMatchObject({ checkedAtMs: 50_000, deadlineAtMs: 80_000 });
    h.clock.cancel();
  });

  it.each(['missing', 'reject', 'throw', 'malformed'] as const)(
    'pauses separately on %s observation evidence',
    async (mode) => {
      const h = harness({
        onCheck: () => {
          if (mode === 'throw') throw Error('private provider text');
          if (mode === 'reject') return Promise.reject(Error('private provider text'));
          return Promise.resolve(mode === 'missing' ? 'missing-rpc-evidence' : (undefined as never));
        },
      });
      await h.clock.ready;
      h.emit(10, 0);
      await flush();
      expect(h.clock.snapshot().pauseReason).toBe('missing-rpc-evidence');
      expect(h.options.onStop).toHaveBeenCalledTimes(1);
      h.emit(11, 60_000);
      expect(h.clock.snapshot().status).toBe('paused');
    }
  );

  it('latches an observed context change and ignores later restored guard values', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 0);
    h.setCurrent(false);
    expect(() => h.clock.assertCurrent(1)).toThrow('Goal live clock context-changed');
    h.setCurrent(true);
    h.finish[0]('complete');
    h.emit(11, 60_000);
    await flush();
    expect(h.clock.snapshot().pauseReason).toBe('context-changed');
    expect(h.checks).toHaveLength(1);
  });

  it.each(['resolve', 'reject'] as const)(
    'rejects asynchronous isCurrent (%s) instead of treating its Promise as authorization',
    async (kind) => {
      const h = harness({
        isCurrent: (() =>
          kind === 'resolve'
            ? Promise.resolve(true)
            : Promise.reject(Error('private guard text'))) as unknown as () => boolean,
      });
      await expect(h.clock.ready).rejects.toMatchObject({ reason: 'context-changed' });
      expect(h.options.subscribeFinalizedHeads).not.toHaveBeenCalled();
    }
  );

  it('checks the current operation ID and liveness without refreshing the scheduler tick', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 0);
    h.setTime(50_000);
    expect(() => h.clock.assertCurrent(1)).not.toThrow();
    expect(() => h.clock.assertCurrent(2)).toThrow('inactive-check');
    expect(h.clock.snapshot().lastSchedulerTickAtMs).toBe(0);
    h.finish[0]('complete');
    await flush();
    expect(() => h.clock.assertCurrent(1)).toThrow('inactive-check');
    h.clock.cancel();
  });

  it('revokes pending work on abort, removes only its subscription, and ignores late callbacks', async () => {
    const controller = new AbortController();
    const h = harness({ signal: controller.signal });
    await h.clock.ready;
    h.emit(10, 0);
    controller.abort();
    expect(h.signals[0].aborted).toBe(true);
    expect(h.unsub).toHaveBeenCalledTimes(1);
    h.finish[0]('complete');
    h.emit(11, 60_000);
    await flush();
    expect(h.checks).toHaveLength(1);
    expect(h.options.onStop).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe for an already-aborted lifetime', async () => {
    const controller = new AbortController();
    controller.abort();
    const h = harness({ signal: controller.signal });
    await expect(h.clock.ready).rejects.toMatchObject({ reason: 'cancelled' });
    expect(h.options.subscribeFinalizedHeads).not.toHaveBeenCalled();
  });

  it('cleans up an unsubscribe handle that arrives after cancellation', async () => {
    let resolve!: (stop: () => void) => void;
    const h = harness({
      subscribeFinalizedHeads: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    h.clock.cancel();
    await expect(h.clock.ready).rejects.toMatchObject({ reason: 'cancelled' });
    const unsub = vi.fn();
    resolve(unsub);
    await flush();
    expect(unsub).toHaveBeenCalledTimes(1);
    expect(h.options.onCheck).not.toHaveBeenCalled();
  });

  it('bounds silent subscription setup with scheduler-gap revocation', async () => {
    const h = harness({ subscribeFinalizedHeads: () => new Promise(() => undefined) });
    h.setTime(60_001);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(h.clock.ready).rejects.toMatchObject({ reason: 'scheduler-gap' });
  });

  it.each(['throw', 'reject', 'malformed'] as const)('sanitizes %s subscription failures', async (mode) => {
    const h = harness({
      subscribeFinalizedHeads: () => {
        if (mode === 'throw') throw Error('private SDK text');
        return mode === 'reject' ? Promise.reject(Error('private SDK text')) : Promise.resolve(undefined as never);
      },
    });
    await expect(h.clock.ready).rejects.toEqual(
      expect.objectContaining({ message: 'Goal live clock subscription-unavailable' })
    );
    expect(h.options.onStop).toHaveBeenCalledTimes(1);
  });

  it.each([-1, NaN, Infinity, 1.5] as const)('rejects invalid initial clock %s without subscribing', async (value) => {
    const h = harness({ now: () => value });
    await expect(h.clock.ready).rejects.toMatchObject({ reason: 'invalid-clock' });
    expect(h.options.subscribeFinalizedHeads).not.toHaveBeenCalled();
  });

  it('latches backward clocks rather than calculating a new schedule', async () => {
    const h = harness();
    await h.clock.ready;
    h.emit(10, 20);
    h.setTime(19);
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.clock.snapshot()).toMatchObject({ pauseReason: 'invalid-clock', lastProcessedAtMs: 20 });
  });

  it.each(['hash', 'parent', 'reuse', 'height'] as const)(
    'rejects contradictory %s callback identity',
    async (kind) => {
      const h = harness();
      await h.clock.ready;
      h.emit(10, 0);
      const bad = header(kind === 'hash' ? 10 : 11);
      if (kind === 'hash') bad.hash.toHex = () => hash(12);
      if (kind === 'parent') bad.parentHash.toHex = () => hash(9);
      if (kind === 'reuse') {
        bad.hash.toHex = () => hash(10);
        bad.parentHash.toHex = () => hash(9);
      }
      if (kind === 'height') bad.number.toNumber = () => 0x100000000;
      h.emit(11, 1, bad);
      expect(h.clock.snapshot().pauseReason).toBe('invalid-callback');
      expect(h.signals[0].aborted).toBe(true);
    }
  );

  it('rejects configuration accessors without invoking them', () => {
    const getter = vi.fn(() => 0);
    const options = { startedAtMs: 0 };
    Object.defineProperty(options, 'now', { get: getter, enumerable: true });
    expect(() => createGoalLiveClock(options as GoalLiveClockOptions)).toThrow('invalid-options');
    expect(getter).not.toHaveBeenCalled();
  });

  it('keeps revocation effective when external cleanup and notification throw', async () => {
    const h = harness({
      onStop: () => {
        throw Error('private persistence text');
      },
    });
    await h.clock.ready;
    h.unsub.mockImplementation(() => {
      throw Error('private SDK text');
    });
    h.clock.cancel();
    h.clock.cancel();
    expect(h.clock.snapshot().pauseReason).toBe('cancelled');
    expect(h.unsub).toHaveBeenCalledTimes(1);
  });
});
