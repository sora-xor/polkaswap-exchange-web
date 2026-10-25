/** Explicit block-time assumptions for development research; never evidence of browser arrival or a fill. */
export interface HistoricalClockBlock {
  hash: string;
  parentHash: string;
  height: number;
  timestampMs: number;
}

export interface HistoricalHourSignal {
  completedAtMs: number;
  closing: HistoricalClockBlock;
  successor: HistoricalClockBlock;
}

export interface HistoricalClockPolicy {
  version: 1;
  purpose: 'development';
  availability: 'assumed-after-successor-block';
  signalDelayMs: number;
  executionDelayMs: number;
  maximumExecutionLagMs: number;
}

export interface HistoricalClockEpisode {
  startedAtMs: number;
  endedAtMs: number;
}

export interface HistoricalExecutionClockPlan {
  signal: HistoricalHourSignal;
  policy: HistoricalClockPolicy;
  episode: HistoricalClockEpisode;
  assumedDecisionAtMs: number;
  targetExecutionAtMs: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const HASH = /^0x[0-9a-f]{64}$/;

/** Reject non-data input before property reads, including getters, sparse keys and prototype objects. */
function data(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error('Historical clock requires plain data');
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key)))
    throw new Error('Unexpected historical clock fields');
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error('Historical clock accessor rejected');
  }
}

/** Bound exact timestamp/delay arithmetic without accepting fractional or overflowing clocks. */
function integer(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum)
    throw new Error('Invalid historical clock integer');
}

/** Copy only a validated canonical block identity; callers retain responsibility for RPC/finality proof. */
function block(value: HistoricalClockBlock): HistoricalClockBlock {
  data(value, ['hash', 'parentHash', 'height', 'timestampMs']);
  if (
    typeof value.hash !== 'string' ||
    typeof value.parentHash !== 'string' ||
    !HASH.test(value.hash) ||
    !HASH.test(value.parentHash) ||
    value.hash === value.parentHash
  )
    throw new Error('Invalid historical block hash');
  integer(value.height, 1);
  integer(value.timestampMs, 1);
  return Object.freeze({ ...value });
}

/** Freeze a later quote target using explicit latency assumptions fixed before reading execution outcomes. */
export function planHistoricalExecutionClock(
  signal: HistoricalHourSignal,
  policy: HistoricalClockPolicy,
  episode: HistoricalClockEpisode
): HistoricalExecutionClockPlan {
  data(signal, ['completedAtMs', 'closing', 'successor']);
  data(policy, ['version', 'purpose', 'availability', 'signalDelayMs', 'executionDelayMs', 'maximumExecutionLagMs']);
  data(episode, ['startedAtMs', 'endedAtMs']);
  integer(signal.completedAtMs, HOUR);
  integer(episode.startedAtMs, HOUR);
  integer(episode.endedAtMs, HOUR);
  if (signal.completedAtMs % HOUR || episode.startedAtMs % HOUR || episode.endedAtMs - episode.startedAtMs !== DAY)
    throw new Error('Historical clock requires complete UTC hours and a fixed 24-hour episode');
  if (signal.completedAtMs < episode.startedAtMs || signal.completedAtMs >= episode.endedAtMs)
    throw new Error('Signal is outside the funded episode');
  if (
    policy.version !== 1 ||
    policy.purpose !== 'development' ||
    policy.availability !== 'assumed-after-successor-block'
  )
    throw new Error('Unsupported historical clock policy');
  integer(policy.signalDelayMs, 0, HOUR);
  integer(policy.executionDelayMs, 1, HOUR);
  integer(policy.maximumExecutionLagMs, 0, HOUR);
  const closing = block(signal.closing);
  const successor = block(signal.successor);
  if (
    closing.height + 1 !== successor.height ||
    successor.parentHash !== closing.hash ||
    closing.timestampMs < signal.completedAtMs - HOUR ||
    closing.timestampMs >= signal.completedAtMs ||
    successor.timestampMs < signal.completedAtMs ||
    successor.timestampMs >= signal.completedAtMs + HOUR ||
    successor.timestampMs <= closing.timestampMs
  )
    throw new Error('Signal is not an adjacent completed-hour proof');
  const assumedDecisionAtMs = successor.timestampMs + policy.signalDelayMs;
  const targetExecutionAtMs = assumedDecisionAtMs + policy.executionDelayMs;
  integer(assumedDecisionAtMs, 1);
  integer(targetExecutionAtMs, 1);
  if (targetExecutionAtMs >= episode.endedAtMs) throw new Error('No execution opportunity before the goal deadline');
  return Object.freeze({
    signal: Object.freeze({ completedAtMs: signal.completedAtMs, closing, successor }),
    policy: Object.freeze({ ...policy }),
    episode: Object.freeze({ ...episode }),
    assumedDecisionAtMs,
    targetExecutionAtMs,
  });
}

/**
 * Require the first block at/after the frozen quote target, with its exact adjacent predecessor.
 * A late/missing opportunity fails; this helper never chooses a replacement block or changes the goal start.
 */
export function verifyHistoricalExecutionClock(
  plan: HistoricalExecutionClockPlan,
  previousBlock: HistoricalClockBlock,
  executionBlock: HistoricalClockBlock
): { kind: 'hypothetical-archived-quote-state'; executionAtMs: number; lagMs: number; observedFill: false } {
  data(plan, ['signal', 'policy', 'episode', 'assumedDecisionAtMs', 'targetExecutionAtMs']);
  const rebuilt = planHistoricalExecutionClock(plan.signal, plan.policy, plan.episode);
  if (
    plan.assumedDecisionAtMs !== rebuilt.assumedDecisionAtMs ||
    plan.targetExecutionAtMs !== rebuilt.targetExecutionAtMs
  )
    throw new Error('Historical clock plan changed');
  const previous = block(previousBlock);
  const execution = block(executionBlock);
  if (
    previous.height === plan.signal.successor.height &&
    (previous.hash !== plan.signal.successor.hash ||
      previous.parentHash !== plan.signal.successor.parentHash ||
      previous.timestampMs !== plan.signal.successor.timestampMs)
  )
    throw new Error('Signal successor identity changed');
  if (previous.height > plan.signal.successor.height && previous.timestampMs <= plan.signal.successor.timestampMs)
    throw new Error('Execution predecessor does not advance past the signal');
  if (
    (previous.height > plan.signal.successor.height &&
      [plan.signal.closing.hash, plan.signal.successor.hash].includes(previous.hash)) ||
    [plan.signal.closing.hash, plan.signal.successor.hash].includes(execution.hash) ||
    (previous.height === plan.signal.successor.height + 1 && previous.parentHash !== plan.signal.successor.hash)
  )
    throw new Error('Historical block identities contradict the signal');
  if (
    previous.height < plan.signal.successor.height ||
    previous.height + 1 !== execution.height ||
    execution.parentHash !== previous.hash ||
    execution.timestampMs <= previous.timestampMs ||
    previous.timestampMs >= plan.targetExecutionAtMs ||
    execution.timestampMs < plan.targetExecutionAtMs
  )
    throw new Error('Execution state is not the first advancing block at the frozen target');
  const lagMs = execution.timestampMs - plan.targetExecutionAtMs;
  if (lagMs > plan.policy.maximumExecutionLagMs || execution.timestampMs >= plan.episode.endedAtMs)
    throw new Error('Historical execution opportunity expired');
  return Object.freeze({
    kind: 'hypothetical-archived-quote-state',
    executionAtMs: execution.timestampMs,
    lagMs,
    observedFill: false,
  });
}
