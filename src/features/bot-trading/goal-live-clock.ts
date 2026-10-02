/** Finalized callback scheduling only. This module grants no observation, session or trading authority. */
export const GOAL_LIVE_CLOCK_PROTOCOL = 'goal-finalized-arrival-sliding-clock-v1' as const;
const INTERVAL_MS = 60_000;
const DAY_MS = 86_400_000;
const HASH = /^0x[0-9a-f]{64}$/;

/** Public SDK header surface; finalized headers do not contain Timestamp.Now. */
export interface GoalLiveClockHeader {
  number: { toNumber(): number };
  hash: { toHex(): string };
  parentHash: { toHex(): string };
}
export interface GoalLiveClockArrival {
  readonly arrivedAtMs: number;
  readonly block: Readonly<{ height: number; hash: string; parentHash: string }>;
}
export interface GoalLiveClockCheck {
  readonly id: number;
  readonly checkedAtMs: number;
  readonly arrival: GoalLiveClockArrival;
}
export type GoalLiveClockPauseReason =
  | 'cancelled'
  | 'context-changed'
  | 'scheduler-gap'
  | 'missing-rpc-evidence'
  | 'subscription-unavailable'
  | 'invalid-callback'
  | 'invalid-clock';
export interface GoalLiveClockSnapshot {
  readonly protocol: typeof GOAL_LIVE_CLOCK_PROTOCOL;
  readonly mode: 'finalized-callbacks-only';
  readonly startedAtMs: number;
  readonly deadlineAtMs: number;
  readonly status: 'active' | 'paused' | 'expired';
  readonly pauseReason: GoalLiveClockPauseReason | null;
  readonly lastProcessedAtMs: number;
  readonly lastSchedulerTickAtMs: number;
  readonly lastArrivalAtMs: number | null;
  readonly checkedAtMs: number | null;
  readonly nextDueAtMs: number;
  readonly latest: GoalLiveClockArrival | null;
  readonly busy: GoalLiveClockCheck | null;
  readonly queued: GoalLiveClockArrival | null;
  readonly tradingAuthority: false;
}
export type GoalLiveClockStop = Readonly<{
  kind: 'pause' | 'expire';
  reason: GoalLiveClockPauseReason | null;
  atMs: number;
}>;
export interface GoalLiveClockOptions {
  /** Start of this scheduler instance, including a newly authorized resume. */
  startedAtMs: number;
  /** The original funded epoch's deadline. Resuming must not extend it. */
  deadlineAtMs: number;
  now(): number;
  /** Synchronous guard; a Promise or any value other than true revokes this instance. */
  isCurrent(): boolean;
  /** Pass cb => client.rpc.chain.subscribeFinalizedHeads(cb), preserving the public SDK receiver. */
  subscribeFinalizedHeads(callback: (header: GoalLiveClockHeader) => void): Promise<() => void>;
  /** Must retain independent provider state identity and recheck admission after every await. */
  onCheck(check: GoalLiveClockCheck, signal: AbortSignal): Promise<'complete' | 'missing-rpc-evidence'>;
  /** Notification only; throwing or rejected persistence cannot revive this instance. */
  onStop(stop: GoalLiveClockStop): void;
  signal?: AbortSignal;
}

/** Stable diagnostics contain no callback, SDK or provider error text. */
export class GoalLiveClockError extends Error {
  constructor(readonly reason: GoalLiveClockPauseReason | 'expired' | 'inactive-check' | 'invalid-options') {
    super(`Goal live clock ${reason}`);
    this.name = 'GoalLiveClockError';
  }
}
const validTime = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const invalid = (): never => {
  throw new GoalLiveClockError('invalid-options');
};

/** Validate configuration without invoking property accessors; the SDK and callbacks remain caller-owned. */
function optionsCopy(input: GoalLiveClockOptions): GoalLiveClockOptions {
  if (!input || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const fields = Object.getOwnPropertyDescriptors(input);
  const required = ['startedAtMs', 'deadlineAtMs', 'now', 'isCurrent', 'subscribeFinalizedHeads', 'onCheck', 'onStop'];
  if (
    Reflect.ownKeys(fields).some((key) => typeof key !== 'string' || ![...required, 'signal'].includes(key)) ||
    required.some((key) => !fields[key]) ||
    Object.values(fields).some((field) => !field.enumerable || !('value' in field))
  )
    return invalid();
  const options = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  if (
    !validTime(options.startedAtMs) ||
    options.startedAtMs > Number.MAX_SAFE_INTEGER - DAY_MS - INTERVAL_MS ||
    !validTime(options.deadlineAtMs) ||
    options.deadlineAtMs <= options.startedAtMs ||
    options.deadlineAtMs - options.startedAtMs > DAY_MS ||
    ['now', 'isCurrent', 'subscribeFinalizedHeads', 'onCheck', 'onStop'].some(
      (key) => typeof options[key] !== 'function'
    ) ||
    (options.signal !== undefined && !(options.signal instanceof AbortSignal))
  )
    return invalid();
  return options as unknown as GoalLiveClockOptions;
}

/** Reject contradictions among retained callback identities, without claiming a finality proof. */
function compatible(a: GoalLiveClockArrival['block'], b: GoalLiveClockArrival['block']): boolean {
  if (a.height === b.height) return a.hash === b.hash && a.parentHash === b.parentHash;
  const [earlier, later] = a.height < b.height ? [a, b] : [b, a];
  return (
    earlier.hash !== later.hash &&
    earlier.parentHash !== later.hash &&
    (later.parentHash === earlier.hash) === (later.height === earlier.height + 1)
  );
}

/**
 * Subscribe once, coalesce busy callbacks by canonical height, and schedule from actual processing
 * time. The one-second watchdog can only revoke: it never polls state or schedules an observation.
 * Cancellation aborts local work and eventually removes only this subscription, never the socket.
 */
export function createGoalLiveClock(input: GoalLiveClockOptions) {
  const options = optionsCopy(input);
  const { now, isCurrent, signal } = options;
  let state: GoalLiveClockSnapshot = Object.freeze({
    protocol: GOAL_LIVE_CLOCK_PROTOCOL,
    mode: 'finalized-callbacks-only',
    startedAtMs: options.startedAtMs,
    deadlineAtMs: options.deadlineAtMs,
    status: 'active',
    pauseReason: null,
    lastProcessedAtMs: options.startedAtMs,
    lastSchedulerTickAtMs: options.startedAtMs,
    lastArrivalAtMs: null,
    checkedAtMs: null,
    nextDueAtMs: options.startedAtMs,
    latest: null,
    busy: null,
    queued: null,
    tradingAuthority: false,
  });
  const lifetime = new AbortController();
  let nextCheckId = 1;
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let resolveReady!: () => void;
  let rejectReady!: (error: GoalLiveClockError) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // A caller may create and synchronously cancel without awaiting subscription setup.
  void ready.catch(() => undefined);
  const patch = (change: Partial<GoalLiveClockSnapshot>) => {
    state = Object.freeze({ ...state, ...change });
  };
  const release = (stop: () => void) => {
    try {
      // Public SDK unsubscribe is normally synchronous; consume any adapter's rejected completion.
      void Promise.resolve(stop()).catch(() => undefined);
    } catch {
      // Cleanup failure does not grant the closed callback any authority.
    }
  };
  const stop = (reason: GoalLiveClockPauseReason | 'expired', atMs = state.lastProcessedAtMs) => {
    if (state.status !== 'active') return;
    const expired = reason === 'expired';
    patch({
      status: expired ? 'expired' : 'paused',
      pauseReason: expired ? null : reason,
      lastProcessedAtMs: atMs,
      busy: null,
      queued: null,
    });
    lifetime.abort();
    if (timer !== undefined) clearInterval(timer);
    signal?.removeEventListener('abort', cancel);
    if (unsubscribe) {
      const owned = unsubscribe;
      unsubscribe = undefined;
      release(owned);
    }
    rejectReady(new GoalLiveClockError(reason));
    try {
      void Promise.resolve(
        options.onStop(Object.freeze({ kind: expired ? 'expire' : 'pause', reason: state.pauseReason, atMs }))
      ).catch(() => undefined);
    } catch {
      // A failed external notification cannot undo the synchronous revocation.
    }
  };
  const readTime = (): number | undefined => {
    try {
      const time = now();
      if (!validTime(time) || time < state.lastProcessedAtMs) throw new Error();
      return time;
    } catch {
      stop('invalid-clock');
      return undefined;
    }
  };
  const current = (atMs: number): boolean => {
    if (state.status !== 'active') return false;
    patch({ lastProcessedAtMs: atMs });
    if (atMs >= options.deadlineAtMs) stop('expired', atMs);
    else if (signal?.aborted) stop('cancelled', atMs);
    else {
      try {
        const guarded: unknown = isCurrent();
        if (guarded !== true) {
          // An accidentally async guard is rejected, including a rejected Promise with private error text.
          void Promise.resolve(guarded).catch(() => undefined);
          stop('context-changed', atMs);
        }
      } catch {
        stop('context-changed', atMs);
      }
    }
    return state.status === 'active';
  };
  const watchdog = () => {
    if (state.status !== 'active') return;
    const atMs = readTime();
    if (atMs !== undefined && current(atMs) && atMs - state.lastSchedulerTickAtMs > INTERVAL_MS)
      stop('scheduler-gap', atMs);
  };
  function cancel(): void {
    if (state.status !== 'active') return;
    const atMs = readTime();
    if (atMs !== undefined) stop(atMs >= options.deadlineAtMs ? 'expired' : 'cancelled', atMs);
  }

  const complete = (check: GoalLiveClockCheck, outcome: unknown) => {
    if (state.status !== 'active' || state.busy !== check) return;
    const atMs = readTime();
    if (atMs === undefined || !current(atMs)) return;
    if (outcome !== 'complete') return stop('missing-rpc-evidence', atMs);
    const queued = state.queued;
    patch({ busy: null, queued: null });
    if (queued) tick(queued, atMs);
  };
  const tick = (arrival: GoalLiveClockArrival, atMs: number) => {
    const gap = atMs - state.lastSchedulerTickAtMs > INTERVAL_MS;
    patch({ lastSchedulerTickAtMs: atMs });
    if (gap) return stop('scheduler-gap', atMs);
    if (atMs < state.nextDueAtMs) return;
    const check = Object.freeze({ id: nextCheckId++, checkedAtMs: atMs, arrival });
    patch({ checkedAtMs: atMs, nextDueAtMs: atMs + INTERVAL_MS, busy: check });
    try {
      void Promise.resolve(options.onCheck(check, lifetime.signal)).then(
        (outcome) => complete(check, outcome),
        () => complete(check, 'missing-rpc-evidence')
      );
    } catch {
      complete(check, 'missing-rpc-evidence');
    }
  };
  const callback = (header: GoalLiveClockHeader) => {
    if (state.status !== 'active') return;
    // Capture at entry, before SDK decoding, processing, promise continuations or any provider work.
    const arrivedAtMs = readTime();
    if (arrivedAtMs === undefined || !current(arrivedAtMs)) return;
    let block: GoalLiveClockArrival['block'];
    try {
      const height = header.number.toNumber();
      const hash = header.hash.toHex();
      const parentHash = header.parentHash.toHex();
      if (
        !Number.isInteger(height) ||
        height < 1 ||
        height > 0xffffffff ||
        typeof hash !== 'string' ||
        typeof parentHash !== 'string' ||
        !HASH.test(hash) ||
        !HASH.test(parentHash)
      )
        throw new Error();
      if (hash === parentHash) throw new Error();
      block = Object.freeze({ height, hash, parentHash });
    } catch {
      return stop('invalid-callback', arrivedAtMs);
    }
    const processedAtMs = readTime();
    if (processedAtMs === undefined || !current(processedAtMs)) return;
    const arrival = Object.freeze({ arrivedAtMs, block });
    patch({ lastArrivalAtMs: arrivedAtMs });
    if ([state.latest, state.busy?.arrival].some((known) => known && !compatible(block, known.block)))
      return stop('invalid-callback', processedAtMs);
    if (state.latest && block.height <= state.latest.block.height) return;
    patch({ latest: arrival });
    if (state.busy) patch({ queued: arrival });
    else tick(arrival, processedAtMs);
  };

  signal?.addEventListener('abort', cancel, { once: true });
  watchdog();
  if (state.status === 'active') {
    timer = setInterval(watchdog, 1000);
    try {
      void Promise.resolve(options.subscribeFinalizedHeads(callback)).then(
        (owned) => {
          if (typeof owned !== 'function') return stop('subscription-unavailable');
          if (state.status !== 'active') return release(owned);
          unsubscribe = owned;
          watchdog();
          if (state.status === 'active') resolveReady();
        },
        () => {
          const atMs = readTime();
          if (atMs !== undefined && current(atMs)) stop('subscription-unavailable', atMs);
        }
      );
    } catch {
      stop('subscription-unavailable');
    }
  }

  return Object.freeze({
    ready,
    snapshot: (): GoalLiveClockSnapshot => state,
    cancel,
    /** Scheduling liveness only; the caller must separately verify fresh owned execution evidence. */
    assertCurrent(checkId: number): void {
      watchdog();
      if (state.status !== 'active') throw new GoalLiveClockError(state.pauseReason ?? 'expired');
      if (!Number.isSafeInteger(checkId) || state.busy?.id !== checkId) throw new GoalLiveClockError('inactive-check');
    },
  });
}
