/**
 * Metadata-only location of a hypothetical historical quote state. The caller's
 * reader must attest canonical finalized blocks and bound its own transport.
 * Sparse reads assume canonical timestamps advance; they do not prove ancestry,
 * finality, browser arrival, transaction inclusion, or a fill.
 */
import {
  planHistoricalExecutionClock,
  verifyHistoricalExecutionClock,
  type HistoricalClockBlock,
  type HistoricalExecutionClockPlan,
} from './historical-execution-clock';

const MAX_READS = 64;
const HASH = /^0x[0-9a-f]{64}$/;
type FailureReason =
  | 'invalid-input'
  | 'invalid-block'
  | 'height-mismatch'
  | 'identity-mismatch'
  | 'duplicate-hash'
  | 'parent-mismatch'
  | 'nonmonotonic-timestamp'
  | 'target-after-upper'
  | 'missing-block'
  | 'read-failed'
  | 'read-limit'
  | 'clock-rejected';

/** The callback must return canonical finalized metadata at the exact requested height, or null. */
export type HistoricalBlockReader = (height: number) => Promise<HistoricalClockBlock | null>;

/** Ordered provenance contains only block identities/timestamps, never market values. */
export interface HistoricalBlockRead {
  readonly sequence: number;
  readonly height: number;
  readonly status: 'read' | 'missing' | 'failed' | 'invalid';
  readonly block?: HistoricalClockBlock;
}

/** A retained failure never replaces a missing block or changes the original target. */
export class HistoricalExecutionLocateError extends Error {
  constructor(
    readonly diagnostic: Readonly<{
      stage: 'input' | 'anchors' | 'search' | 'verify';
      reason: FailureReason;
      reads: readonly HistoricalBlockRead[];
      financialActions: false;
    }>
  ) {
    super(`Historical execution location failed: ${diagnostic.stage} (${diagnostic.reason})`);
    this.name = 'HistoricalExecutionLocateError';
  }
}

class LocateFailure extends Error {
  constructor(readonly reason: FailureReason) {
    super(reason);
  }
}

/** Reject accessors and unexpected fields without executing caller code. */
function data(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw new LocateFailure('invalid-input');
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key)))
    throw new LocateFailure('invalid-input');
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new LocateFailure('invalid-input');
  }
  return value as Record<string, unknown>;
}

/** Copy block scalars immediately; caller mutation cannot alter retained observations. */
function copyBlock(value: unknown): HistoricalClockBlock {
  const block = data(value, ['hash', 'parentHash', 'height', 'timestampMs']);
  if (
    typeof block.hash !== 'string' ||
    typeof block.parentHash !== 'string' ||
    !HASH.test(block.hash) ||
    !HASH.test(block.parentHash) ||
    block.hash === block.parentHash ||
    !Number.isSafeInteger(block.height) ||
    Number(block.height) < 1 ||
    !Number.isSafeInteger(block.timestampMs) ||
    Number(block.timestampMs) < 1
  )
    throw new LocateFailure('invalid-block');
  return Object.freeze({
    hash: block.hash,
    parentHash: block.parentHash,
    height: block.height as number,
    timestampMs: block.timestampMs as number,
  });
}

/** Reject tampered computed times and rebuild a detached, deeply frozen clock plan. */
function copyPlan(value: HistoricalExecutionClockPlan): HistoricalExecutionClockPlan {
  data(value, ['signal', 'policy', 'episode', 'assumedDecisionAtMs', 'targetExecutionAtMs']);
  const plan = planHistoricalExecutionClock(value.signal, value.policy, value.episode);
  if (value.assumedDecisionAtMs !== plan.assumedDecisionAtMs || value.targetExecutionAtMs !== plan.targetExecutionAtMs)
    throw new LocateFailure('invalid-input');
  return plan;
}

/**
 * Revalidate the supplied hour proof and finalized upper bound, then bisect the
 * original bracket for its first block at/after the explicit target. No retry,
 * substitute block, RPC implementation, or default timing policy is provided.
 */
export async function locateHistoricalExecutionBlock(
  inputPlan: HistoricalExecutionClockPlan,
  finalizedUpperBlock: HistoricalClockBlock,
  readBlock: HistoricalBlockReader
) {
  const reads: HistoricalBlockRead[] = [];
  let stage: 'input' | 'anchors' | 'search' | 'verify' = 'input';
  try {
    const plan = copyPlan(inputPlan);
    const upper = copyBlock(finalizedUpperBlock);
    if (typeof readBlock !== 'function') throw new LocateFailure('invalid-input');
    if (upper.height <= plan.signal.successor.height || upper.timestampMs < plan.targetExecutionAtMs)
      throw new LocateFailure('target-after-upper');
    const known = new Map<number, HistoricalClockBlock>();
    const confirmed = new Map<number, HistoricalClockBlock>();

    /** Check all known identities, including nonadjacent parent/hash contradictions. */
    const observe = (block: HistoricalClockBlock) => {
      for (const other of known.values()) {
        if (other.height === block.height) {
          if (
            other.hash !== block.hash ||
            other.parentHash !== block.parentHash ||
            other.timestampMs !== block.timestampMs
          )
            throw new LocateFailure('identity-mismatch');
          continue;
        }
        if (other.hash === block.hash) throw new LocateFailure('duplicate-hash');
        if (
          (other.height < block.height && other.timestampMs >= block.timestampMs) ||
          (other.height > block.height && other.timestampMs <= block.timestampMs)
        )
          throw new LocateFailure('nonmonotonic-timestamp');
        if (
          (block.parentHash === other.hash && other.height !== block.height - 1) ||
          (other.parentHash === block.hash && block.height !== other.height - 1) ||
          (other.height === block.height - 1 && block.parentHash !== other.hash) ||
          (block.height === other.height - 1 && other.parentHash !== block.hash)
        )
          throw new LocateFailure('parent-mismatch');
      }
      known.set(block.height, block);
    };
    observe(plan.signal.closing);
    observe(plan.signal.successor);
    observe(upper);

    /** Cache only completed reads, never merely supplied anchor identities. */
    const read = async (height: number): Promise<HistoricalClockBlock> => {
      const cached = confirmed.get(height);
      if (cached) return cached;
      if (reads.length >= MAX_READS) throw new LocateFailure('read-limit');
      const index = reads.length;
      const entry = { sequence: index + 1, height };
      reads.push(Object.freeze({ ...entry, status: 'failed' }));
      let raw: HistoricalClockBlock | null;
      try {
        raw = await readBlock(height);
      } catch {
        throw new LocateFailure('read-failed');
      }
      if (raw === null) {
        reads[index] = Object.freeze({ ...entry, status: 'missing' });
        throw new LocateFailure('missing-block');
      }
      let block: HistoricalClockBlock;
      try {
        block = copyBlock(raw);
      } catch {
        reads[index] = Object.freeze({ ...entry, status: 'invalid' });
        throw new LocateFailure('invalid-block');
      }
      reads[index] = Object.freeze({ ...entry, status: 'read', block });
      if (block.height !== height) throw new LocateFailure('height-mismatch');
      observe(block);
      confirmed.set(height, block);
      return block;
    };

    stage = 'anchors';
    await read(plan.signal.closing.height);
    let previous = await read(plan.signal.successor.height);
    let execution = await read(upper.height);
    stage = 'search';
    while (execution.height - previous.height > 1) {
      const middleHeight = previous.height + Math.floor((execution.height - previous.height) / 2);
      const middle = await read(middleHeight);
      if (middle.timestampMs < plan.targetExecutionAtMs) previous = middle;
      else execution = middle;
    }
    stage = 'verify';
    const clock = verifyHistoricalExecutionClock(plan, previous, execution);
    return Object.freeze({
      kind: 'hypothetical-historical-execution-location' as const,
      plan,
      finalizedUpperBlock: upper,
      previous,
      execution,
      clock,
      reads: Object.freeze([...reads]),
      canonicality: 'caller-attested-under-monotonic-canonical-timestamps' as const,
      observedFill: false as const,
      transactionSubmitted: false as const,
    });
  } catch (error) {
    const reason =
      error instanceof LocateFailure ? error.reason : stage === 'verify' ? 'clock-rejected' : 'invalid-input';
    throw new HistoricalExecutionLocateError(
      Object.freeze({ stage, reason, reads: Object.freeze([...reads]), financialActions: false })
    );
  }
}
