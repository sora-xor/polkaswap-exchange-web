/** Pure trace verification for the finalized callback scheduler; no timers, RPC or market reads. */
import { GOAL_LIVE_CLOCK_PROTOCOL } from './goal-live-clock';
export const GOAL_QUALIFICATION_CLOCK_V2 = 'goal-finalized-arrival-sliding-clock-v2' as const;
import {
  verifyGoalQualificationClock,
  type GoalQualificationClockTrace,
  type GoalQualificationClockCheck,
  type GoalQualificationArrivalModel,
  type GoalQualificationClockBlock,
} from './goal-qualification-clock';
export type { GoalQualificationArrivalModel, GoalQualificationClockBlock } from './goal-qualification-clock';
import { GOAL_EXACT_POLICY } from './goal-exact-ledger';
export type GoalQualificationClockEventV2 =
  | { kind: 'callback'; arrivedAtMs: number; processedAtMs: number; block: GoalQualificationClockBlock }
  | { kind: 'complete'; checkId: number; atMs: number }
  | { kind: 'deadline-cancel'; checkId: number; atMs: number }
  | { kind: 'deadline'; atMs: number };
export interface GoalQualificationClockTraceV2 {
  protocol: typeof GOAL_QUALIFICATION_CLOCK_V2;
  events: readonly GoalQualificationClockEventV2[];
}
export interface GoalQualificationCancelledCheck {
  id: number;
  checkedAtMs: number;
  arrival: Extract<GoalQualificationClockEventV2, { kind: 'callback' }>;
  cancelledAtMs: number;
  /** Fixed modeled finish, including time beyond the deadline; null for observed traces. */
  plannedCompletedAtMs: number | null;
}
export type GoalEpisodeClockCheck = GoalQualificationClockCheck | GoalQualificationCancelledCheck;
export type GoalEpisodeClockTrace = GoalQualificationClockTrace | GoalQualificationClockTraceV2;
/** Cutoff is not completion: cancellation admits only receipts strictly before it. */
export function goalClockCheckCutoff(check: GoalEpisodeClockCheck): number {
  return 'cancelledAtMs' in check ? check.cancelledAtMs : check.completedAtMs;
}
/** Version dispatcher preserves the original v1 verifier and its stricter completion contract. */
export function verifyGoalEpisodeClock(
  input: GoalEpisodeClockTrace,
  model: GoalQualificationArrivalModel,
  episode: { startAtMs: number; endAtMs: number }
): readonly GoalEpisodeClockCheck[] {
  return input.protocol === GOAL_LIVE_CLOCK_PROTOCOL
    ? verifyGoalQualificationClock(input, model, episode)
    : verifyGoalQualificationClockV2(input as GoalQualificationClockTraceV2, model, episode);
}
/** Retained stage receipt for work aborted at the fixed deadline; never a completed read. */
export interface GoalEpisodeDeadlineReceipt {
  checkId: number;
  stage: 'history' | 'valuation' | 'quote';
  startedAtMs: number;
  plannedReceivedAtMs: number;
  cancelledAtMs: number;
  evidenceSha256: string;
}
/** Only the owned source emits this explicit partial-prefix termination. */
export class GoalEpisodeDeadlineCancellation extends Error {
  constructor(readonly receipt: Readonly<GoalEpisodeDeadlineReceipt>) {
    super('Goal episode stage cancelled at deadline');
    Object.freeze(receipt);
  }
}
const fail = (): never => {
  throw Error('bots.errors.research');
};
function check(v: unknown): asserts v {
  if (!v) fail();
}
function integer(v: unknown) {
  check(Number.isSafeInteger(v) && Number(v) >= 0);
}
function fields(v: unknown, names: string[]) {
  check(v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v)));
  const d = Object.getOwnPropertyDescriptors(v);
  check(Reflect.ownKeys(d).length === names.length && names.every((n) => d[n]?.enumerable && 'value' in d[n]));
}
/** Exact declared arrival model; historical block time is never called an observed receipt. */
export function validateGoalQualificationArrivalModel(model: GoalQualificationArrivalModel): void {
  check(model && typeof model === 'object');
  const d = Object.getOwnPropertyDescriptor(model, 'kind');
  check(d && 'value' in d);
  if (d.value === 'observed-finalized-callbacks') {
    fields(model, ['kind', 'recorderSha256']);
    check('recorderSha256' in model && /^[0-9a-f]{64}$/.test(model.recorderSha256));
    return;
  }
  fields(model, ['kind', 'model', 'finalityDelayMs', 'callbackDelayMs', 'processingDelayMs', 'checkDurationMs']);
  check(model.kind === 'modeled-finalized-callbacks' && model.model === 'fixed-nonnegative-delays-v1');
  for (const value of [model.finalityDelayMs, model.callbackDelayMs, model.processingDelayMs, model.checkDurationMs])
    integer(value);
  check(
    model.finalityDelayMs + model.callbackDelayMs + model.processingDelayMs <= 60000 &&
      model.checkDurationMs > 0 &&
      model.checkDurationMs <= 60000
  );
}
/** Reproduce callback coalescing and sliding checks; any incomplete/revoked scheduler is ineligible. */
export function verifyGoalQualificationClockV2(
  input: GoalQualificationClockTraceV2,
  model: GoalQualificationArrivalModel,
  episode: { startAtMs: number; endAtMs: number }
): readonly GoalEpisodeClockCheck[] {
  validateGoalQualificationArrivalModel(model);
  fields(input, ['protocol', 'events']);
  check(input.protocol === GOAL_QUALIFICATION_CLOCK_V2);
  fields(episode, ['startAtMs', 'endAtMs']);
  integer(episode.startAtMs);
  integer(episode.endAtMs);
  check(episode.endAtMs - episode.startAtMs === 86400000);
  const array = Object.getOwnPropertyDescriptors(input.events);
  check(
    Array.isArray(input.events) &&
      Object.getPrototypeOf(input.events) === Array.prototype &&
      input.events.length >= 2 &&
      input.events.length <= 30000 &&
      Reflect.ownKeys(array).length === input.events.length + 1
  );
  let lastAt = episode.startAtMs,
    lastTick = episode.startAtMs,
    nextDue = episode.startAtMs,
    nextId = 1;
  let latest: Extract<GoalQualificationClockEventV2, { kind: 'callback' }> | undefined, queued: typeof latest;
  let busy: Omit<GoalQualificationClockCheck, 'completedAtMs'> | undefined;
  const checks: GoalEpisodeClockCheck[] = [],
    byHeight = new Map<number, GoalQualificationClockBlock>(),
    byHash = new Map<string, number>(),
    children = new Map<string, number>(),
    heights: number[] = [];
  const now = (at: number) => {
    integer(at);
    check(at >= lastAt && at < episode.endAtMs);
    lastAt = at;
  };
  const tick = (arrival: NonNullable<typeof latest>, at: number) => {
    check(at - lastTick <= 60000);
    lastTick = at;
    if (at < nextDue) return;
    busy = { id: nextId++, checkedAtMs: at, arrival };
    nextDue = at + 60000;
  };
  for (let index = 0; index < input.events.length; index++) {
    check(array[index]?.enumerable && 'value' in array[index]);
    const event = array[index].value as GoalQualificationClockEventV2;
    const kind = Object.getOwnPropertyDescriptor(event, 'kind');
    check(kind && 'value' in kind);
    if (kind.value === 'deadline-cancel') {
      fields(event, ['kind', 'checkId', 'atMs']);
      check(
        event.kind === 'deadline-cancel' &&
          index === input.events.length - 2 &&
          event.atMs === episode.endAtMs &&
          busy &&
          event.checkId === busy.id &&
          episode.endAtMs - lastTick <= 60000
      );
      const plannedCompletedAtMs =
        model.kind === 'modeled-finalized-callbacks' ? busy.checkedAtMs + model.checkDurationMs : null;
      check(plannedCompletedAtMs === null || plannedCompletedAtMs >= episode.endAtMs);
      checks.push(Object.freeze({ ...busy, cancelledAtMs: event.atMs, plannedCompletedAtMs }));
      busy = undefined;
      queued = undefined;
      continue;
    }
    if (kind.value === 'deadline') {
      fields(event, ['kind', 'atMs']);
      check(
        index === input.events.length - 1 &&
          'atMs' in event &&
          event.atMs === episode.endAtMs &&
          !busy &&
          episode.endAtMs - lastTick <= 60000
      );
      continue;
    }
    check(index < input.events.length - 1);
    if (kind.value === 'callback') {
      fields(event, ['kind', 'arrivedAtMs', 'processedAtMs', 'block']);
      check(event.kind === 'callback');
      fields(event.block, ['height', 'hash', 'parentHash', 'timestampMs']);
      const b = event.block;
      integer(b.height);
      integer(b.timestampMs);
      check(
        b.height > 0 &&
          b.height <= 0xffffffff &&
          /^0x[0-9a-f]{64}$/.test(b.hash) &&
          /^0x[0-9a-f]{64}$/.test(b.parentHash) &&
          b.hash !== b.parentHash &&
          b.hash !== GOAL_EXACT_POLICY.genesisHash &&
          (b.height === 1) === (b.parentHash === GOAL_EXACT_POLICY.genesisHash)
      );
      now(event.arrivedAtMs);
      now(event.processedAtMs);
      check(b.timestampMs <= event.arrivedAtMs && event.processedAtMs - b.timestampMs <= 60000);
      if (model.kind === 'modeled-finalized-callbacks') {
        check(
          event.arrivedAtMs === b.timestampMs + model.finalityDelayMs + model.callbackDelayMs &&
            event.processedAtMs === event.arrivedAtMs + model.processingDelayMs
        );
        if (latest) check(b.height === latest.block.height + 1);
      }
      const known = byHeight.get(b.height),
        knownHeight = byHash.get(b.hash),
        parentHeight = byHash.get(b.parentHash);
      check(
        (!known ||
          (known.hash === b.hash && known.parentHash === b.parentHash && known.timestampMs === b.timestampMs)) &&
          (knownHeight === undefined || knownHeight === b.height) &&
          (parentHeight === undefined || parentHeight === b.height - 1)
      );
      const knownChild = children.get(b.hash),
        siblingHeight = children.get(b.parentHash);
      check(
        (knownChild === undefined || knownChild === b.height + 1) &&
          (siblingHeight === undefined || siblingHeight === b.height)
      );
      let lo = 0,
        hi = heights.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (heights[mid] < b.height) lo = mid + 1;
        else hi = mid;
      }
      const earlier = byHeight.get(heights[lo - 1]),
        later = byHeight.get(heights[lo] === b.height ? heights[lo + 1] : heights[lo]);
      check((!earlier || earlier.timestampMs < b.timestampMs) && (!later || later.timestampMs > b.timestampMs));
      if (!known) heights.splice(lo, 0, b.height);
      children.set(b.parentHash, b.height);
      const parent = byHeight.get(b.height - 1);
      if (parent) check(parent.hash === b.parentHash);
      byHeight.set(b.height, b);
      byHash.set(b.hash, b.height);
      if (latest && b.height <= latest.block.height) continue;
      const arrival = Object.freeze({ ...event, block: Object.freeze({ ...b }) });
      latest = arrival;
      if (busy) queued = arrival;
      else tick(arrival, event.processedAtMs);
    } else {
      fields(event, ['kind', 'checkId', 'atMs']);
      check(event.kind === 'complete');
      now(event.atMs);
      check(busy && event.checkId === busy.id && event.atMs - busy.checkedAtMs <= 60000);
      if (model.kind === 'modeled-finalized-callbacks') check(event.atMs === busy.checkedAtMs + model.checkDurationMs);
      checks.push(Object.freeze({ ...busy, completedAtMs: event.atMs }));
      busy = undefined;
      if (queued) {
        const arrival = queued;
        queued = undefined;
        tick(arrival, event.atMs);
      }
    }
  }
  check(checks.filter((c) => 'cancelledAtMs' in c).length <= 1);
  check(checks.length > 0 && checks.length <= 1440 && input.events.at(-1)?.kind === 'deadline');
  return Object.freeze(checks);
}
