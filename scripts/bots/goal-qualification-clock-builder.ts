/** Offline metadata-only modeling. No RPC, market observations, strategy selection or trading authority. */
import { createHash } from 'node:crypto';
import { GOAL_EXACT_POLICY } from '../../src/features/bot-trading/goal-exact-ledger';
import { GOAL_LIVE_CLOCK_PROTOCOL } from '../../src/features/bot-trading/goal-live-clock';
import {
  validateGoalQualificationArrivalModel,
  verifyGoalQualificationClock,
  type GoalQualificationArrivalModel,
  type GoalQualificationClockBlock,
  type GoalQualificationClockCheck,
  type GoalQualificationClockEvent,
  type GoalQualificationClockTrace,
} from '../../src/features/bot-trading/goal-qualification-clock';

export type GoalModeledCallbackParameters = Extract<
  GoalQualificationArrivalModel,
  { kind: 'modeled-finalized-callbacks' }
>;
export interface GoalCallbackSource {
  sourceId: string;
  genesisHash: string;
  manifestSha256: string;
  preregistrationSha256: string;
}
export interface GoalCallbackBuildInput {
  episode: { startAtMs: number; endAtMs: number };
  model: GoalModeledCallbackParameters;
  source: GoalCallbackSource;
  /** Exactly the immediate predecessor, all in-episode callbacks, and immediate successor. */
  blocks: readonly GoalQualificationClockBlock[];
}
export const GOAL_CALLBACK_BUILDER_POLICY = Object.freeze({
  protocol: 'goal-modeled-callback-builder-v1',
  clockProtocol: GOAL_LIVE_CLOCK_PROTOCOL,
  startup: 'block-generated-callbacks-only-no-subscription-replay',
  coincidentEvents: 'completion-before-callback-at-equal-arrival',
  processingEndCoincidence: 'callback-before-completion-when-arrival-is-earlier',
  processing: 'atomic-callback-reject-overlapping-events',
  coverage: 'immediate-arrival-predecessor-and-successor',
  maximumBlocks: 30002,
  maximumEvents: 30000,
  tradingAuthority: false,
} as const);
export type GoalCallbackBuildFailure =
  | 'invalid-input'
  | 'unsupported-model'
  | 'invalid-source'
  | 'invalid-blocks'
  | 'missing-coverage'
  | 'event-overlap'
  | 'deadline-crossing'
  | 'scheduler-gap'
  | 'event-limit'
  | 'trace-rejected';
export interface GoalCallbackBuildDiagnostic {
  reason: GoalCallbackBuildFailure;
  source: Readonly<GoalCallbackSource> | null;
  blocksSha256: string | null;
  blockIndex?: number;
  atMs?: number;
}
/** Stable retained diagnostics never include external exception text or invoke supplied accessors. */
export class GoalCallbackBuildError extends Error {
  readonly diagnostic: Readonly<GoalCallbackBuildDiagnostic>;
  constructor(diagnostic: GoalCallbackBuildDiagnostic) {
    super(`Goal callback trace unavailable: ${diagnostic.reason}`);
    this.name = 'GoalCallbackBuildError';
    this.diagnostic = Object.freeze({ ...diagnostic });
  }
}
export interface GoalCallbackBuildResult {
  policy: typeof GOAL_CALLBACK_BUILDER_POLICY;
  policySha256: string;
  episode: Readonly<GoalCallbackBuildInput['episode']>;
  model: Readonly<GoalModeledCallbackParameters>;
  source: Readonly<GoalCallbackSource>;
  blocksSha256: string;
  coverage: Readonly<{
    predecessor: Readonly<GoalQualificationClockBlock>;
    successor: Readonly<GoalQualificationClockBlock>;
    firstCallbackHeight: number;
    lastCallbackHeight: number;
    callbackCount: number;
  }>;
  trace: Readonly<GoalQualificationClockTrace>;
  traceSha256: string;
  checks: readonly GoalQualificationClockCheck[];
  checksSha256: string;
}
const DAY = 86_400_000;
const INTERVAL = 60_000;
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Only detached, already validated own-data values reach this freezer. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Build one explicitly modeled 24-hour callback trace from a complete canonical metadata sequence.
 * Source authenticity/finality and preregistration are caller attestations, not proved by these hashes.
 * Reject unsupported event interleavings rather than change callback times, completion times or limits.
 */
export function buildGoalQualificationClock(input: GoalCallbackBuildInput): GoalCallbackBuildResult {
  let source: Readonly<GoalCallbackSource> | null = null;
  let blocksSha256: string | null = null;
  const fail = (reason: GoalCallbackBuildFailure, details: { blockIndex?: number; atMs?: number } = {}): never => {
    throw new GoalCallbackBuildError({ reason, source, blocksSha256, ...details });
  };
  const fields = (raw: unknown, names: readonly string[], reason: GoalCallbackBuildFailure) => {
    if (!raw || typeof raw !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(raw)))
      return fail(reason);
    const descriptors = Object.getOwnPropertyDescriptors(raw);
    if (
      Reflect.ownKeys(descriptors).length !== names.length ||
      names.some((name) => !descriptors[name]?.enumerable || !('value' in descriptors[name]))
    )
      return fail(reason);
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value])) as Record<string, unknown>;
  };
  const integer = (value: unknown, min: number, max: number, reason: GoalCallbackBuildFailure): number => {
    if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) return fail(reason);
    return value as number;
  };
  const raw = fields(input, ['episode', 'model', 'source', 'blocks'], 'invalid-input');
  const suppliedSource = fields(
    raw.source,
    ['sourceId', 'genesisHash', 'manifestSha256', 'preregistrationSha256'],
    'invalid-source'
  );
  if (
    typeof suppliedSource.sourceId !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(suppliedSource.sourceId) ||
    suppliedSource.genesisHash !== GOAL_EXACT_POLICY.genesisHash ||
    typeof suppliedSource.manifestSha256 !== 'string' ||
    !SHA.test(suppliedSource.manifestSha256) ||
    typeof suppliedSource.preregistrationSha256 !== 'string' ||
    !SHA.test(suppliedSource.preregistrationSha256)
  )
    return fail('invalid-source');
  source = Object.freeze(suppliedSource as unknown as GoalCallbackSource);
  const suppliedEpisode = fields(raw.episode, ['startAtMs', 'endAtMs'], 'invalid-input');
  const episode = {
    startAtMs: integer(suppliedEpisode.startAtMs, 0, Number.MAX_SAFE_INTEGER - DAY - INTERVAL, 'invalid-input'),
    endAtMs: integer(suppliedEpisode.endAtMs, 0, Number.MAX_SAFE_INTEGER - INTERVAL, 'invalid-input'),
  };
  if (episode.endAtMs - episode.startAtMs !== DAY) return fail('invalid-input');
  const model = fields(
    raw.model,
    ['kind', 'model', 'finalityDelayMs', 'callbackDelayMs', 'processingDelayMs', 'checkDurationMs'],
    'unsupported-model'
  ) as unknown as GoalModeledCallbackParameters;
  if (model.kind !== 'modeled-finalized-callbacks') return fail('unsupported-model');
  try {
    validateGoalQualificationArrivalModel(model);
  } catch {
    return fail('unsupported-model');
  }
  const delay = model.finalityDelayMs + model.callbackDelayMs;
  if (
    !Array.isArray(raw.blocks) ||
    Object.getPrototypeOf(raw.blocks) !== Array.prototype ||
    raw.blocks.length < 3 ||
    raw.blocks.length > GOAL_CALLBACK_BUILDER_POLICY.maximumBlocks
  )
    return fail('invalid-blocks');
  const array = Object.getOwnPropertyDescriptors(raw.blocks);
  if (Reflect.ownKeys(array).length !== raw.blocks.length + 1) return fail('invalid-blocks');
  const blocks: GoalQualificationClockBlock[] = [];
  const hashes = new Map<string, number>();
  for (let index = 0; index < raw.blocks.length; index++) {
    if (!array[index]?.enumerable || !('value' in array[index])) return fail('invalid-blocks', { blockIndex: index });
    const b = fields(array[index].value, ['height', 'hash', 'parentHash', 'timestampMs'], 'invalid-blocks');
    const height = integer(b.height, 1, 0xffffffff, 'invalid-blocks');
    const timestampMs = integer(
      b.timestampMs,
      0,
      Number.MAX_SAFE_INTEGER - delay - model.processingDelayMs,
      'invalid-blocks'
    );
    if (
      typeof b.hash !== 'string' ||
      !HASH.test(b.hash) ||
      typeof b.parentHash !== 'string' ||
      !HASH.test(b.parentHash) ||
      b.hash === b.parentHash ||
      b.hash === source.genesisHash ||
      (height === 1) !== (b.parentHash === source.genesisHash) ||
      hashes.has(b.hash)
    )
      return fail('invalid-blocks', { blockIndex: index });
    const previous = blocks.at(-1);
    if (
      previous &&
      (height !== previous.height + 1 || b.parentHash !== previous.hash || timestampMs <= previous.timestampMs)
    )
      return fail('invalid-blocks', { blockIndex: index });
    const block = { height, hash: b.hash, parentHash: b.parentHash, timestampMs };
    blocks.push(block);
    hashes.set(block.hash, block.height);
  }
  // The predecessor's parent must not point forward into the retained canonical sequence.
  if (hashes.has(blocks[0].parentHash)) return fail('invalid-blocks', { blockIndex: 0 });
  blocksSha256 = digest(blocks);
  const arrivalAt = (block: GoalQualificationClockBlock) => block.timestampMs + delay;
  const predecessor = blocks[0],
    successor = blocks.at(-1)!;
  if (
    arrivalAt(predecessor) >= episode.startAtMs ||
    arrivalAt(blocks[1]) < episode.startAtMs ||
    arrivalAt(blocks.at(-2)!) >= episode.endAtMs ||
    arrivalAt(successor) < episode.endAtMs
  )
    return fail('missing-coverage');

  const events: GoalQualificationClockEvent[] = [];
  let nextId = 1,
    nextDueAtMs = episode.startAtMs,
    lastTickAtMs = episode.startAtMs;
  let busy: { id: number; completesAtMs: number } | undefined;
  let queued: Extract<GoalQualificationClockEvent, { kind: 'callback' }> | undefined;
  let previousProcessedAtMs = episode.startAtMs;
  const emit = (event: GoalQualificationClockEvent) => {
    if (events.length >= GOAL_CALLBACK_BUILDER_POLICY.maximumEvents) return fail('event-limit');
    events.push(event);
  };
  const tick = (atMs: number) => {
    if (atMs - lastTickAtMs > INTERVAL) return fail('scheduler-gap', { atMs });
    lastTickAtMs = atMs;
    if (atMs < nextDueAtMs) return;
    const completesAtMs = atMs + model.checkDurationMs;
    if (!Number.isSafeInteger(completesAtMs) || completesAtMs >= episode.endAtMs)
      return fail('deadline-crossing', { atMs: completesAtMs });
    busy = { id: nextId++, completesAtMs };
    nextDueAtMs = atMs + INTERVAL;
  };
  const complete = () => {
    const current = busy!;
    emit({ kind: 'complete', checkId: current.id, atMs: current.completesAtMs });
    busy = undefined;
    if (queued) {
      queued = undefined;
      tick(current.completesAtMs);
    }
  };
  for (let index = 1; index < blocks.length - 1; index++) {
    const block = blocks[index];
    const arrivedAtMs = arrivalAt(block),
      processedAtMs = arrivedAtMs + model.processingDelayMs;
    if (arrivedAtMs < previousProcessedAtMs) return fail('event-overlap', { blockIndex: index, atMs: arrivedAtMs });
    if (processedAtMs >= episode.endAtMs) return fail('deadline-crossing', { blockIndex: index, atMs: processedAtMs });
    // Equal arrival/completion is resolved by the declared completion-first modeled tie rule.
    while (busy && busy.completesAtMs <= arrivedAtMs) complete();
    if (busy && busy.completesAtMs < processedAtMs)
      return fail('event-overlap', { blockIndex: index, atMs: busy.completesAtMs });
    const callback = { kind: 'callback' as const, arrivedAtMs, processedAtMs, block };
    emit(callback);
    if (busy) queued = callback;
    else tick(processedAtMs);
    previousProcessedAtMs = processedAtMs;
  }
  while (busy) complete();
  if (episode.endAtMs - lastTickAtMs > INTERVAL) return fail('scheduler-gap', { atMs: episode.endAtMs });
  emit({ kind: 'deadline', atMs: episode.endAtMs });
  const trace = { protocol: GOAL_LIVE_CLOCK_PROTOCOL, events };
  let checks: readonly GoalQualificationClockCheck[];
  try {
    checks = verifyGoalQualificationClock(trace, model, episode);
  } catch {
    return fail('trace-rejected');
  }
  return freeze({
    policy: GOAL_CALLBACK_BUILDER_POLICY,
    policySha256: digest(GOAL_CALLBACK_BUILDER_POLICY),
    episode,
    model,
    source,
    blocksSha256,
    coverage: {
      predecessor,
      successor,
      firstCallbackHeight: blocks[1].height,
      lastCallbackHeight: blocks.at(-2)!.height,
      callbackCount: blocks.length - 2,
    },
    trace,
    traceSha256: digest(trace),
    checks,
    checksSha256: digest(checks),
  });
}
