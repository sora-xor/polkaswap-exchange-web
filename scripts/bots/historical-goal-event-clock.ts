/** Development scheduling only: explicit browser events, no prices, funds, RPC or trading authority. */
import type { HistoricalClockBlock } from './historical-execution-clock';

const INTERVAL = 60_000;
const DAY = 86_400_000;
const PROTOCOL = 'goal-finalized-arrival-sliding-clock-v1-development';

/** Arrival times are supplied evidence/assumptions; block timestamps never substitute for them. */
export interface HistoricalGoalEventClockPolicy {
  version: 1;
  purpose: 'development';
  mode: 'finalized-callbacks-only';
  arrivalAssumption: 'nonnegative-chain-to-browser-delay';
  startedAtMs: number;
  deadlineAtMs: number;
}

interface Arrival {
  readonly arrivedAtMs: number;
  readonly block: Readonly<HistoricalClockBlock>;
}
interface Check {
  readonly id: number;
  readonly checkedAtMs: number;
  readonly arrival: Arrival;
}
type PauseReason = 'scheduler-gap' | 'missing-rpc-evidence' | 'cancelled';

/** Constant-size serializable state. Callers own event logging and exactly-once consumption. */
export interface HistoricalGoalEventClockState {
  readonly protocol: typeof PROTOCOL;
  readonly policy: Readonly<HistoricalGoalEventClockPolicy>;
  readonly status: 'active' | 'paused' | 'expired';
  readonly pauseReason: PauseReason | null;
  readonly lastProcessedAtMs: number;
  readonly lastSchedulerTickAtMs: number;
  readonly lastArrivalAtMs: number | null;
  readonly checkedAtMs: number | null;
  readonly nextDueAtMs: number;
  readonly nextCheckId: number;
  readonly latest: Arrival | null;
  readonly busy: Check | null;
  readonly queued: Arrival | null;
  readonly tradingAuthority: false;
}

/** Poll fallback is deliberately excluded; completion does not assert successful market observation. */
export type HistoricalGoalEventClockEvent =
  | { kind: 'finalized-arrival'; arrivedAtMs: number; processedAtMs: number; block: HistoricalClockBlock }
  | { kind: 'watchdog' | 'cancel'; atMs: number }
  | { kind: 'complete'; atMs: number; checkId: number; outcome: 'complete' | 'missing-rpc-evidence' | 'cancelled' };

export type HistoricalGoalEventClockAction =
  | { kind: 'start-check'; check: Check }
  | { kind: 'queued'; arrival: Arrival }
  | {
      kind: 'noop';
      reason: 'not-due' | 'duplicate-or-old-block' | 'completed' | 'watchdog' | 'stale-completion' | 'latched';
    }
  | { kind: 'pause'; reason: PauseReason }
  | { kind: 'expire' };

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new Error('Invalid historical goal event clock');
}
function fields(input: unknown, names: readonly string[]): Record<string, unknown> {
  requireValue(input && typeof input === 'object' && Object.getPrototypeOf(input) === Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  requireValue(
    Reflect.ownKeys(descriptors).length === names.length &&
      names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])
  );
  return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
}
function integer(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  requireValue(Number.isSafeInteger(input) && (input as number) >= min && (input as number) <= max);
  return input as number;
}
/** Only freshly validated own-data copies reach this recursive freezer. */
function freeze<T>(input: T): T {
  if (input && typeof input === 'object') {
    for (const child of Object.values(input)) freeze(child);
    Object.freeze(input);
  }
  return input;
}
function policyCopy(input: unknown): HistoricalGoalEventClockPolicy {
  const p = fields(input, ['version', 'purpose', 'mode', 'arrivalAssumption', 'startedAtMs', 'deadlineAtMs']);
  requireValue(
    p.version === 1 &&
      p.purpose === 'development' &&
      p.mode === 'finalized-callbacks-only' &&
      p.arrivalAssumption === 'nonnegative-chain-to-browser-delay'
  );
  const startedAtMs = integer(p.startedAtMs, 0, Number.MAX_SAFE_INTEGER - DAY - INTERVAL);
  const deadlineAtMs = integer(p.deadlineAtMs, startedAtMs + 1, startedAtMs + DAY);
  return {
    version: 1,
    purpose: 'development',
    mode: 'finalized-callbacks-only',
    arrivalAssumption: 'nonnegative-chain-to-browser-delay',
    startedAtMs,
    deadlineAtMs,
  };
}
function blockCopy(input: unknown): HistoricalClockBlock {
  const b = fields(input, ['height', 'hash', 'parentHash', 'timestampMs']);
  const height = integer(b.height, 1);
  const timestampMs = integer(b.timestampMs);
  requireValue(
    typeof b.hash === 'string' &&
      /^0x[0-9a-f]{64}$/.test(b.hash) &&
      typeof b.parentHash === 'string' &&
      /^0x[0-9a-f]{64}$/.test(b.parentHash) &&
      b.hash !== b.parentHash
  );
  return { height, hash: b.hash, parentHash: b.parentHash, timestampMs };
}
function arrivalCopy(input: unknown, policy: HistoricalGoalEventClockPolicy, now: number): Arrival {
  const a = fields(input, ['arrivedAtMs', 'block']);
  const arrivedAtMs = integer(a.arrivedAtMs, policy.startedAtMs, now);
  const block = blockCopy(a.block);
  requireValue(block.timestampMs <= arrivedAtMs);
  return { arrivedAtMs, block };
}
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Detect contradictions among the at-most-two retained identities; this is not a canonicality proof. */
function compatible(a: Readonly<HistoricalClockBlock>, b: Readonly<HistoricalClockBlock>): void {
  if (a.height === b.height) {
    requireValue(same(a, b));
    return;
  }
  const [earlier, later] = a.height < b.height ? [a, b] : [b, a];
  requireValue(earlier.hash !== later.hash && earlier.timestampMs < later.timestampMs);
  requireValue(earlier.parentHash !== later.hash);
  requireValue((later.parentHash === earlier.hash) === (later.height === earlier.height + 1));
}

/** Validate detached state, including redundant clocks, before accepting a restored event journal. */
function stateCopy(input: HistoricalGoalEventClockState): HistoricalGoalEventClockState {
  const s = fields(input, [
    'protocol',
    'policy',
    'status',
    'pauseReason',
    'lastProcessedAtMs',
    'lastSchedulerTickAtMs',
    'lastArrivalAtMs',
    'checkedAtMs',
    'nextDueAtMs',
    'nextCheckId',
    'latest',
    'busy',
    'queued',
    'tradingAuthority',
  ]);
  const policy = policyCopy(s.policy);
  const now = integer(s.lastProcessedAtMs, policy.startedAtMs);
  const tick = integer(s.lastSchedulerTickAtMs, policy.startedAtMs, Math.min(now, policy.deadlineAtMs - 1));
  const checked = s.checkedAtMs === null ? null : integer(s.checkedAtMs, policy.startedAtMs, tick);
  const nextDueAtMs = integer(s.nextDueAtMs);
  const nextCheckId = integer(s.nextCheckId, 1, 1442);
  requireValue(nextDueAtMs === (checked === null ? policy.startedAtMs : checked + INTERVAL));
  requireValue((checked === null) === (nextCheckId === 1));
  if (checked !== null) requireValue(nextCheckId - 1 <= Math.floor((checked - policy.startedAtMs) / INTERVAL) + 1);
  const lastArrivalAtMs = s.lastArrivalAtMs === null ? null : integer(s.lastArrivalAtMs, policy.startedAtMs, now);
  const latest = s.latest === null ? null : arrivalCopy(s.latest, policy, now);
  requireValue((latest === null) === (lastArrivalAtMs === null));
  requireValue(checked === null || latest);
  if (latest) requireValue(latest.arrivedAtMs <= lastArrivalAtMs!);
  let busy: Check | null = null;
  if (s.busy !== null) {
    const b = fields(s.busy, ['id', 'checkedAtMs', 'arrival']);
    const arrival = arrivalCopy(b.arrival, policy, now);
    requireValue(b.id === nextCheckId - 1 && b.checkedAtMs === checked && checked !== null);
    requireValue(arrival.arrivedAtMs <= checked && latest && arrival.block.height <= latest.block.height);
    requireValue(tick === checked);
    if (latest) compatible(arrival.block, latest.block);
    busy = { id: b.id as number, checkedAtMs: checked!, arrival };
  }
  const queued = s.queued === null ? null : arrivalCopy(s.queued, policy, now);
  if (queued) requireValue(busy && latest && same(queued, latest) && queued.block.height > busy.arrival.block.height);
  if (busy && latest && latest.block.height > busy.arrival.block.height) requireValue(queued);
  requireValue(s.protocol === PROTOCOL && s.tradingAuthority === false);
  requireValue(['active', 'paused', 'expired'].includes(s.status as string));
  if (s.status === 'paused')
    requireValue(['scheduler-gap', 'missing-rpc-evidence', 'cancelled'].includes(s.pauseReason as string));
  else requireValue(s.pauseReason === null);
  if (s.status !== 'active') requireValue(!busy && !queued);
  if (s.status === 'expired') requireValue(now >= policy.deadlineAtMs);
  else requireValue(now < policy.deadlineAtMs);
  return {
    protocol: PROTOCOL,
    policy,
    status: s.status as HistoricalGoalEventClockState['status'],
    pauseReason: s.pauseReason as PauseReason | null,
    lastProcessedAtMs: now,
    lastSchedulerTickAtMs: tick,
    lastArrivalAtMs,
    checkedAtMs: checked,
    nextDueAtMs,
    nextCheckId,
    latest,
    busy,
    queued,
    tradingAuthority: false,
  };
}

/** Start a bounded development clock with no implied opening price, completed check or authorization. */
export function createHistoricalGoalEventClock(input: HistoricalGoalEventClockPolicy): HistoricalGoalEventClockState {
  const policy = policyCopy(input);
  return freeze({
    protocol: PROTOCOL,
    policy,
    status: 'active',
    pauseReason: null,
    lastProcessedAtMs: policy.startedAtMs,
    lastSchedulerTickAtMs: policy.startedAtMs,
    lastArrivalAtMs: null,
    checkedAtMs: null,
    nextDueAtMs: policy.startedAtMs,
    nextCheckId: 1,
    latest: null,
    busy: null,
    queued: null,
    tradingAuthority: false,
  });
}

/**
 * Apply one explicit event. An idle callback or completion's queued drain is a scheduler tick; busy
 * callbacks only queue. Watchdogs do not refresh liveness. Eligible checks advance due time before work.
 * No price freshness, canonical/finality proof, fee admission or trading permission is supplied here.
 */
export function advanceHistoricalGoalEventClock(
  input: HistoricalGoalEventClockState,
  eventInput: HistoricalGoalEventClockEvent
): Readonly<{ state: HistoricalGoalEventClockState; action: HistoricalGoalEventClockAction }> {
  let state = stateCopy(input);
  const kindDescriptor =
    eventInput && typeof eventInput === 'object' ? Object.getOwnPropertyDescriptor(eventInput, 'kind') : undefined;
  requireValue(kindDescriptor?.enumerable && 'value' in kindDescriptor);
  const kind = kindDescriptor.value;
  requireValue(['finalized-arrival', 'watchdog', 'cancel', 'complete'].includes(kind));
  const event = fields(
    eventInput,
    kind === 'finalized-arrival'
      ? ['kind', 'arrivedAtMs', 'processedAtMs', 'block']
      : kind === 'complete'
        ? ['kind', 'atMs', 'checkId', 'outcome']
        : ['kind', 'atMs']
  );
  const atMs = integer(kind === 'finalized-arrival' ? event.processedAtMs : event.atMs, state.lastProcessedAtMs);
  let arrival: Arrival | null = null;
  if (kind === 'finalized-arrival') {
    arrival = arrivalCopy({ arrivedAtMs: event.arrivedAtMs, block: event.block }, state.policy, atMs);
    requireValue(arrival.arrivedAtMs >= (state.lastArrivalAtMs ?? state.policy.startedAtMs));
  }
  if (kind === 'complete') {
    integer(event.checkId, 1);
    requireValue(['complete', 'missing-rpc-evidence', 'cancelled'].includes(event.outcome as string));
  }
  state = { ...state, lastProcessedAtMs: atMs };
  const result = (action: HistoricalGoalEventClockAction) => freeze({ state, action });
  const pause = (reason: PauseReason) => {
    state = { ...state, status: 'paused', pauseReason: reason, busy: null, queued: null };
    return result({ kind: 'pause', reason });
  };
  if (atMs >= state.policy.deadlineAtMs && state.status !== 'expired') {
    state = { ...state, status: 'expired', pauseReason: null, busy: null, queued: null };
    return result({ kind: 'expire' });
  }
  if (state.status !== 'active') return result({ kind: 'noop', reason: 'latched' });
  if (kind === 'cancel') return pause('cancelled');
  if (kind === 'watchdog')
    return atMs - state.lastSchedulerTickAtMs > INTERVAL
      ? pause('scheduler-gap')
      : result({ kind: 'noop', reason: 'watchdog' });

  const tick = (selected: Arrival) => {
    const suspended = atMs - state.lastSchedulerTickAtMs > INTERVAL;
    state = { ...state, lastSchedulerTickAtMs: atMs };
    if (suspended) return pause('scheduler-gap');
    if (atMs < state.nextDueAtMs) return result({ kind: 'noop', reason: 'not-due' });
    const check: Check = { id: state.nextCheckId, checkedAtMs: atMs, arrival: selected };
    state = {
      ...state,
      checkedAtMs: atMs,
      nextDueAtMs: atMs + INTERVAL,
      nextCheckId: state.nextCheckId + 1,
      busy: check,
    };
    return result({ kind: 'start-check', check });
  };
  if (kind === 'complete') {
    requireValue((event.checkId as number) < state.nextCheckId);
    if (!state.busy || state.busy.id !== event.checkId) return result({ kind: 'noop', reason: 'stale-completion' });
    if (event.outcome !== 'complete') return pause(event.outcome as PauseReason);
    const queued = state.queued;
    state = { ...state, busy: null, queued: null };
    return queued ? tick(queued) : result({ kind: 'noop', reason: 'completed' });
  }
  const next = arrival!;
  state = { ...state, lastArrivalAtMs: next.arrivedAtMs };
  const latest = state.latest;
  for (const known of [latest, state.busy?.arrival]) if (known) compatible(next.block, known.block);
  if (latest) {
    if (next.block.height <= latest.block.height) return result({ kind: 'noop', reason: 'duplicate-or-old-block' });
  }
  state = { ...state, latest: next };
  if (state.busy) {
    state = { ...state, queued: next };
    return result({ kind: 'queued', arrival: next });
  }
  return tick(next);
}
