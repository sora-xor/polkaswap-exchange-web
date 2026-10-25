/**
 * Metadata-only valuation location. The callback attests canonical finalized blocks and bounds its
 * transport. Sparse observations assume strictly advancing canonical timestamps; they do not prove
 * unobserved ancestry, historical arrival, executable prices, transaction inclusion or a fill.
 */
import type { HistoricalClockBlock } from './historical-execution-clock';

const MAX_READS = 64;
const HASH = /^0x[0-9a-f]{64}$/;

/** A fixed target and an independently attested strict/inclusive timestamp bracket. */
export interface HistoricalValuationLocateRequest {
  targetAtMs: number;
  maximumLagMs: number;
  lower: HistoricalClockBlock;
  upper: HistoricalClockBlock;
}

/** Return exact canonical finalized metadata at this height, or null; never select a replacement. */
export type HistoricalValuationBlockReader = (height: number) => Promise<HistoricalClockBlock | null>;

/** Ordered metadata provenance includes failed attempts without inventing block observations. */
export interface HistoricalValuationRead {
  readonly sequence: number;
  readonly height: number;
  readonly status: 'read' | 'missing' | 'failed' | 'invalid';
  readonly block?: Readonly<HistoricalClockBlock>;
}

type FailureReason =
  | 'invalid-input'
  | 'invalid-block'
  | 'invalid-bracket'
  | 'height-mismatch'
  | 'identity-mismatch'
  | 'duplicate-hash'
  | 'parent-mismatch'
  | 'nonmonotonic-timestamp'
  | 'missing-block'
  | 'read-failed'
  | 'read-limit'
  | 'lag-exceeded';

/** A bounded unavailable result retains the original request and never retries another state. */
export class HistoricalValuationLocateError extends Error {
  constructor(
    readonly diagnostic: Readonly<{
      stage: 'input' | 'anchors' | 'search' | 'verify';
      reason: FailureReason;
      request?: Readonly<HistoricalValuationLocateRequest>;
      location?: Readonly<{
        previous: Readonly<HistoricalClockBlock>;
        block: Readonly<HistoricalClockBlock>;
        lagMs: number;
      }>;
      reads: readonly HistoricalValuationRead[];
      financialActions: false;
    }>
  ) {
    super(`Historical valuation location failed: ${diagnostic.stage} (${diagnostic.reason})`);
    this.name = 'HistoricalValuationLocateError';
  }
}

class LocateFailure extends Error {
  constructor(readonly reason: FailureReason) {
    super(reason);
  }
}

/** Read only precisely declared own data fields without evaluating rejected getters. */
function fields(value: unknown, names: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw new LocateFailure('invalid-input');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== names.length ||
    names.some(
      (name) => !Object.hasOwn(descriptors, name) || !descriptors[name].enumerable || !('value' in descriptors[name])
    )
  )
    throw new LocateFailure('invalid-input');
  return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
}

/** Copy validated scalars immediately so a later callback cannot mutate retained evidence. */
function copyBlock(input: unknown): Readonly<HistoricalClockBlock> {
  const block = fields(input, ['hash', 'parentHash', 'height', 'timestampMs']);
  if (
    typeof block.hash !== 'string' ||
    typeof block.parentHash !== 'string' ||
    !HASH.test(block.hash) ||
    !HASH.test(block.parentHash) ||
    block.hash === block.parentHash ||
    !Number.isSafeInteger(block.height) ||
    (block.height as number) < 1 ||
    !Number.isSafeInteger(block.timestampMs) ||
    (block.timestampMs as number) < 0
  )
    throw new LocateFailure('invalid-block');
  return Object.freeze({
    hash: block.hash,
    parentHash: block.parentHash,
    height: block.height as number,
    timestampMs: block.timestampMs as number,
  });
}

/**
 * Re-read both supplied anchors, make one exact integer interpolation guess and inspect its neighbor,
 * then bisect the remaining bracket. At most 64 unique heights are read, with no retries or defaults.
 * The returned pair proves previous.timestamp < target <= block.timestamp under the callback's
 * canonical monotonic-chain attestation. Lag is checked only after locating this first block.
 * This forward locator is not the separate as-of terminal policy and never shifts the target.
 */
export async function locateHistoricalValuationBlock(
  input: HistoricalValuationLocateRequest,
  readBlock: HistoricalValuationBlockReader
) {
  const reads: HistoricalValuationRead[] = [];
  let stage: 'input' | 'anchors' | 'search' | 'verify' = 'input';
  let request: Readonly<HistoricalValuationLocateRequest> | undefined;
  let location:
    | Readonly<{ previous: Readonly<HistoricalClockBlock>; block: Readonly<HistoricalClockBlock>; lagMs: number }>
    | undefined;
  try {
    const provided = fields(input, ['targetAtMs', 'maximumLagMs', 'lower', 'upper']);
    if (
      typeof readBlock !== 'function' ||
      !Number.isSafeInteger(provided.targetAtMs) ||
      (provided.targetAtMs as number) < 1 ||
      !Number.isSafeInteger(provided.maximumLagMs) ||
      (provided.maximumLagMs as number) < 0
    )
      throw new LocateFailure('invalid-input');
    request = Object.freeze({
      targetAtMs: provided.targetAtMs as number,
      maximumLagMs: provided.maximumLagMs as number,
      lower: copyBlock(provided.lower),
      upper: copyBlock(provided.upper),
    });
    const { targetAtMs, maximumLagMs, lower, upper } = request;
    if (lower.height >= upper.height || lower.timestampMs >= targetAtMs || upper.timestampMs < targetAtMs)
      throw new LocateFailure('invalid-bracket');
    const known = new Map<number, Readonly<HistoricalClockBlock>>();
    const confirmed = new Map<number, Readonly<HistoricalClockBlock>>();

    /** Compare all observed identities, including known nonadjacent parent/hash contradictions. */
    const observe = (block: Readonly<HistoricalClockBlock>) => {
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
    observe(lower);
    observe(upper);

    /** Cache only completed validated reads, never supplied anchors. */
    const read = async (height: number): Promise<Readonly<HistoricalClockBlock>> => {
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
      let block: Readonly<HistoricalClockBlock>;
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
    let previous = await read(lower.height);
    let block = await read(upper.height);
    stage = 'search';
    if (block.height - previous.height > 1) {
      const offset =
        (BigInt(targetAtMs - previous.timestampMs) * BigInt(block.height - previous.height)) /
        BigInt(block.timestampMs - previous.timestampMs);
      const height = Math.max(previous.height + 1, Math.min(block.height - 1, previous.height + Number(offset)));
      const guess = await read(height);
      if (guess.timestampMs < targetAtMs) {
        previous = guess;
        const neighbor = await read(guess.height + 1);
        if (neighbor.timestampMs < targetAtMs) previous = neighbor;
        else block = neighbor;
      } else {
        block = guess;
        const neighbor = await read(guess.height - 1);
        if (neighbor.timestampMs < targetAtMs) previous = neighbor;
        else block = neighbor;
      }
    }
    while (block.height - previous.height > 1) {
      const middle = await read(previous.height + Math.floor((block.height - previous.height) / 2));
      if (middle.timestampMs < targetAtMs) previous = middle;
      else block = middle;
    }
    stage = 'verify';
    if (
      previous.height + 1 !== block.height ||
      block.parentHash !== previous.hash ||
      previous.timestampMs >= targetAtMs ||
      block.timestampMs < targetAtMs
    )
      throw new LocateFailure('invalid-bracket');
    const lagMs = block.timestampMs - targetAtMs;
    location = Object.freeze({ previous, block, lagMs });
    if (lagMs > maximumLagMs) throw new LocateFailure('lag-exceeded');
    return Object.freeze({
      kind: 'historical-valuation-block-location' as const,
      request,
      previous,
      block,
      lagMs,
      reads: Object.freeze([...reads]),
      canonicality: 'caller-attested-under-monotonic-canonical-timestamps' as const,
      observedFill: false as const,
      transactionSubmitted: false as const,
    });
  } catch (error) {
    throw new HistoricalValuationLocateError(
      Object.freeze({
        stage,
        reason: error instanceof LocateFailure ? error.reason : 'invalid-input',
        ...(request ? { request } : {}),
        ...(location ? { location } : {}),
        reads: Object.freeze([...reads]),
        financialActions: false,
      })
    );
  }
}
