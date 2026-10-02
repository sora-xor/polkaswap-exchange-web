/** Metadata-only as-of terminal policy. This does not retrieve prices or prove historical browser availability. */
import type { HistoricalClockEpisode, HistoricalHourSignal } from './historical-execution-clock';

type Block = HistoricalHourSignal['closing'];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PROTOCOL = 'goal-terminal-asof-v1-development';

/** Detach only exact own plain fields, rejecting accessors without invoking them. */
function fields(input: unknown, names: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype)
    throw new Error('Invalid historical terminal evidence');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (
    Reflect.ownKeys(descriptors).length !== names.length ||
    names.some((name) => !descriptors[name]?.enumerable || !('value' in descriptors[name]))
  )
    throw new Error('Invalid historical terminal evidence');
  return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
}

function block(input: Block): Readonly<Block> {
  const value = fields(input, ['height', 'hash', 'parentHash', 'timestampMs']);
  if (
    !Number.isSafeInteger(value.height) ||
    (value.height as number) < 1 ||
    !Number.isSafeInteger(value.timestampMs) ||
    (value.timestampMs as number) < 0 ||
    typeof value.hash !== 'string' ||
    !/^0x[0-9a-f]{64}$/.test(value.hash) ||
    typeof value.parentHash !== 'string' ||
    !/^0x[0-9a-f]{64}$/.test(value.parentHash) ||
    value.hash === value.parentHash
  )
    throw new Error('Invalid historical terminal block');
  return Object.freeze(value) as Readonly<Block>;
}

/**
 * Freeze the deadline and freshness bound before reading terminal market values. This additive policy
 * supersedes the exact-timestamp terminal requirement only in a separately bound development protocol.
 */
export function planHistoricalGoalTerminal(episode: HistoricalClockEpisode, maximumAgeMs: number) {
  const times = fields(episode, ['startedAtMs', 'endedAtMs']);
  const start = times.startedAtMs as number;
  const end = times.endedAtMs as number;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < HOUR ||
    start % HOUR !== 0 ||
    end - start !== DAY ||
    !Number.isSafeInteger(maximumAgeMs) ||
    maximumAgeMs < 0 ||
    maximumAgeMs > 60_000
  )
    throw new Error('Invalid historical terminal policy');
  return Object.freeze({
    protocol: PROTOCOL,
    episode: Object.freeze({ startedAtMs: start, endedAtMs: end }),
    maximumAgeMs,
    selection: 'latest-canonical-at-or-before-deadline' as const,
    availability: 'retrospective-chain-state-as-of-deadline' as const,
    arrivalTimeKnown: false as const,
  });
}

export type HistoricalGoalTerminalPolicy = ReturnType<typeof planHistoricalGoalTerminal>;

/**
 * Verify the adjacent pair straddling the unchanged deadline. The successor proves maximality only:
 * its state must never supply terminal prices. Canonical/finalized ancestry remains the reader's duty.
 */
export function verifyHistoricalGoalTerminalClock(
  inputPolicy: HistoricalGoalTerminalPolicy,
  inputObserved: Block,
  inputSuccessor: Block
) {
  const provided = fields(inputPolicy, [
    'protocol',
    'episode',
    'maximumAgeMs',
    'selection',
    'availability',
    'arrivalTimeKnown',
  ]);
  const policy = planHistoricalGoalTerminal(
    provided.episode as HistoricalClockEpisode,
    provided.maximumAgeMs as number
  );
  if (
    provided.protocol !== policy.protocol ||
    provided.selection !== policy.selection ||
    provided.availability !== policy.availability ||
    provided.arrivalTimeKnown !== false
  )
    throw new Error('Contradictory historical terminal policy');
  const observed = block(inputObserved);
  const successor = block(inputSuccessor);
  const accountingAtMs = policy.episode.endedAtMs;
  const ageMs = accountingAtMs - observed.timestampMs;
  if (
    successor.height !== observed.height + 1 ||
    successor.parentHash !== observed.hash ||
    successor.hash === observed.hash ||
    successor.hash === observed.parentHash ||
    observed.timestampMs > accountingAtMs ||
    successor.timestampMs <= accountingAtMs ||
    ageMs > policy.maximumAgeMs
  )
    throw new Error('Incomplete or contradictory historical terminal clock');
  return Object.freeze({
    policy,
    accountingAtMs,
    observedStateTimestampMs: observed.timestampMs,
    ageMs,
    observed,
    successor,
    observedFill: false as const,
    transactionSubmitted: false as const,
  });
}
