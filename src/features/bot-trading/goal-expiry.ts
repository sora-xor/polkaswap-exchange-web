/** Complete finalized lifetime scans. Only a privately owned, current result can release a signed order. */
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsHex, decodeAddress, sha256AsU8a } from '@polkadot/util-crypto';
import { canonicalizeAgentIntent } from '@/features/agent-trading/intent';
import { copyGoalStorageData, readGoalExecutionOrder } from './goal-storage';
import {
  GoalReceiptError,
  goalSignedEnvelopeDigest,
  readGoalFinalizedReceipt,
  type GoalReceiptReadOptions,
} from './goal-receipt';
import type { GoalExecutionFinalReceipt, GoalExecutionOrder } from './goal-execution-types';

export const GOAL_EXPIRY_LIMITS = Object.freeze({ blocks: 65, extrinsics: 65536, timeoutMs: 30000 });
export interface GoalExpiryEvidence {
  readonly protocol: 'goal-canonical-expiry-v1';
  readonly orderId: string;
  readonly orderSha256: string;
  readonly orderRevision: number;
  readonly orderPhase: 'signed' | 'submitted';
  readonly controlRevision: number;
  readonly txHash: string;
  readonly signedEnvelopeDigest: string;
  readonly checkpointHash: string;
  readonly birthBlockNumber: number;
  readonly deathBlockNumber: number;
  readonly finalizedBlockHash: string;
  readonly finalizedBlockNumber: number;
  readonly scannedBlocks: number;
  readonly checkedAtMs: number;
  readonly evidenceSha256: string;
}
export type GoalExpiryResult =
  | { status: 'included'; receipt: GoalExecutionFinalReceipt }
  | { status: 'expired'; evidence: GoalExpiryEvidence }
  | { status: 'unresolved' };
export type GoalExpiryOptions = Omit<GoalReceiptReadOptions, 'blockHash'> & { controlRevision: number };
const owned = new WeakMap<object, { guard(): void; dispose(): void }>();
const fail = (reason: GoalReceiptError['reason'] = 'invalid'): never => {
  throw new GoalReceiptError(reason);
};
const check = (condition: unknown): void => {
  if (!condition) fail();
};
const hash = (v: string): string => (/^0x[0-9a-f]{64}$/.test(v) ? v : fail());
const integer = (v: number, max = Number.MAX_SAFE_INTEGER): number =>
  Number.isSafeInteger(v) && v >= 0 && v <= max ? v : fail();
/** Bind the entire validated order, including the actual persisted signing payload. */
export const goalExpiryOrderDigest = (order: GoalExecutionOrder): string =>
  u8aToHex(sha256AsU8a(new TextEncoder().encode(canonicalizeAgentIntent(order)))).slice(2);
const digest = (body: unknown): string =>
  u8aToHex(sha256AsU8a(new TextEncoder().encode(canonicalizeAgentIntent(body)))).slice(2);
/** Parse public audit evidence; a valid digest does not grant cancellation authority. */
export function readGoalExpiryEvidence(raw: unknown): GoalExpiryEvidence {
  const e = copyGoalStorageData(raw) as GoalExpiryEvidence;
  const fields = [
    'protocol',
    'orderId',
    'orderSha256',
    'orderRevision',
    'orderPhase',
    'controlRevision',
    'txHash',
    'signedEnvelopeDigest',
    'checkpointHash',
    'birthBlockNumber',
    'deathBlockNumber',
    'finalizedBlockHash',
    'finalizedBlockNumber',
    'scannedBlocks',
    'checkedAtMs',
    'evidenceSha256',
  ];
  check(e && Object.keys(e).length === fields.length && fields.every((key) => Object.hasOwn(e, key)));
  check(
    e.protocol === 'goal-canonical-expiry-v1' &&
      /^[A-Za-z0-9_.:-]{1,256}$/.test(e.orderId) &&
      ['signed', 'submitted'].includes(e.orderPhase)
  );
  for (const s of [e.orderSha256, e.signedEnvelopeDigest, e.evidenceSha256]) check(/^[0-9a-f]{64}$/.test(s));
  for (const h of [e.txHash, e.checkpointHash, e.finalizedBlockHash]) hash(h);
  for (const n of [e.orderRevision, e.controlRevision, e.checkedAtMs]) integer(n);
  for (const n of [e.birthBlockNumber, e.deathBlockNumber, e.finalizedBlockNumber]) integer(n, 0xffffffff);
  check(
    e.birthBlockNumber > 0 &&
      e.deathBlockNumber === e.birthBlockNumber + 64 &&
      e.finalizedBlockNumber > e.deathBlockNumber &&
      e.scannedBlocks === 65
  );
  const { evidenceSha256, ...body } = e;
  check(digest(body) === evidenceSha256);
  return Object.freeze(e);
}
/** Validate a current private capability against the exact atomic order/control snapshot. */
export function assertGoalExpiryEvidence(
  evidence: GoalExpiryEvidence,
  order: GoalExecutionOrder,
  controlRevision: number
): void {
  const proof = owned.get(evidence);
  if (!proof) return fail();
  proof.guard();
  check(
    evidence.orderSha256 === goalExpiryOrderDigest(order) &&
      evidence.controlRevision === controlRevision &&
      evidence.orderRevision === order.goalExecution.orderRevision &&
      evidence.orderPhase === order.goalExecution.phase
  );
}
/** Consume once immediately before an atomic mutation returns; a failed commit requires a fresh scan. */
export function consumeGoalExpiryEvidence(
  evidence: GoalExpiryEvidence,
  order: GoalExecutionOrder,
  controlRevision: number
): void {
  assertGoalExpiryEvidence(evidence, order, controlRevision);
  const proof = owned.get(evidence)!;
  owned.delete(evidence);
  proof.dispose();
}
/** Release an unused capability after a failed CAS or abandoned local recovery attempt. */
export function discardGoalExpiryEvidence(evidence: GoalExpiryEvidence): void {
  const proof = owned.get(evidence);
  owned.delete(evidence);
  proof?.dispose();
}

/** Verify captured signatures again, then inspect every canonical block in the signed lifetime, including death. */
export async function discoverGoalExpiry(options: GoalExpiryOptions): Promise<GoalExpiryResult> {
  const order = readGoalExecutionOrder(options.order);
  check(['signed', 'submitted'].includes(order.goalExecution.phase));
  const controlRevision = integer(options.controlRevision);
  if (!order.signingEvidence) return Object.freeze({ status: 'unresolved' });
  const { verifyGoalPersistedSigning } = await import('./goal-mortality');
  const mortality = verifyGoalPersistedSigning(order.signingEvidence, {
    account: order.account,
    network: order.network,
    txHash: order.txHash!,
    signedEnvelopeDigest: order.goalExecution.signedEnvelopeDigest!,
  });
  const { client, signal, now, isCurrent } = options;
  const runtime = client.runtimeVersion,
    runtimeHex = runtime.toHex(),
    metadata = client.runtimeMetadata;
  const startedAt = integer(now()),
    genesis = hash(client.genesisHash.toHex());
  check(genesis === order.network);
  let reason: GoalReceiptError['reason'] | undefined;
  let readClosed = false,
    disposed = false,
    retained = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectWait: ((error: GoalReceiptError) => void) | undefined;
  const attached = new Set<'connected' | 'disconnected'>();
  const lifetime = new AbortController();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', aborted);
    for (const event of attached) {
      try {
        client.off(event, disconnected);
      } catch {
        /* Closed proof cannot regain authority. */
      }
    }
  };
  const stop = (next: GoalReceiptError['reason']) => {
    reason ??= next;
    rejectWait?.(new GoalReceiptError(reason));
    dispose();
  };
  const aborted = () => stop('aborted'),
    disconnected = () => stop('context-changed');
  const guard = () => {
    if (signal?.aborted) fail('aborted');
    if (reason) fail(reason);
    if (disposed) fail('context-changed');
    const time = integer(now());
    if (time < startedAt || time - startedAt >= GOAL_EXPIRY_LIMITS.timeoutMs) fail('timeout');
    if (
      isCurrent() !== true ||
      !client.isConnected ||
      client.genesisHash.toHex() !== genesis ||
      client.runtimeVersion !== runtime ||
      runtime.toHex() !== runtimeHex ||
      client.runtimeMetadata !== metadata
    )
      fail('context-changed');
  };
  const read = async <T>(work: () => Promise<T>): Promise<T> => {
    guard();
    if (readClosed) fail();
    const value = await work();
    guard();
    if (readClosed) fail();
    return value;
  };
  try {
    guard();
    for (const event of ['connected', 'disconnected'] as const) {
      attached.add(event);
      client.on(event, disconnected);
    }
    signal?.addEventListener('abort', aborted, { once: true });
    const interrupted = new Promise<never>((_, reject) => {
      rejectWait = reject;
      timer = setTimeout(() => stop('timeout'), GOAL_EXPIRY_LIMITS.timeoutMs);
    });
    const work = async (): Promise<GoalExpiryResult> => {
      const finalizedBlockHash = hash((await read(() => client.rpc.chain.getFinalizedHead())).toHex());
      const header = await read(() => client.rpc.chain.getHeader(finalizedBlockHash));
      const finalizedBlockNumber = integer(header.number.toNumber(), 0xffffffff);
      check(
        hash(header.hash.toHex()) === finalizedBlockHash &&
          hash((await read(() => client.rpc.chain.getBlockHash(finalizedBlockNumber))).toHex()) === finalizedBlockHash
      );
      if (finalizedBlockNumber < mortality.birthBlockNumber) return Object.freeze({ status: 'unresolved' });
      const first = mortality.birthBlockNumber,
        last = Math.min(mortality.deathBlockNumber, finalizedBlockNumber);
      check(last - first + 1 <= GOAL_EXPIRY_LIMITS.blocks);
      let previous: string | undefined,
        scanned = 0,
        extrinsics = 0;
      for (let height = first; height <= last; height++) {
        const blockHash = hash((await read(() => client.rpc.chain.getBlockHash(height))).toHex());
        if (height === first) check(blockHash === mortality.checkpoint.hash);
        const { block } = await read(() => client.rpc.chain.getBlock(blockHash));
        check(
          integer(block.header.number.toNumber(), 0xffffffff) === height &&
            hash(block.header.hash.toHex()) === blockHash
        );
        const parent = (block.header as unknown as { parentHash?: { toHex(): string } }).parentHash;
        check(parent && typeof parent.toHex === 'function');
        if (previous) check(hash(parent!.toHex()) === previous);
        else hash(parent!.toHex());
        previous = blockHash;
        scanned++;
        const count = integer(block.extrinsics.length);
        extrinsics += count;
        check(extrinsics <= GOAL_EXPIRY_LIMITS.extrinsics);
        let match = false;
        for (let i = 0; i < count; i++) {
          const tx = block.extrinsics[i];
          if (hash(tx.hash.toHex()) !== order.txHash) continue;
          check(!match);
          match = true;
          const bytes = tx.toHex();
          check(
            tx.isSigned &&
              u8aToHex(decodeAddress(tx.signer.toString())) === mortality.account &&
              goalSignedEnvelopeDigest(bytes) === mortality.signedEnvelopeDigest &&
              blake2AsHex(hexToU8a(bytes), 256) === mortality.txHash
          );
        }
        if (match) {
          const receipt = await read(() =>
            readGoalFinalizedReceipt({ client, order, blockHash, now, isCurrent, signal: lifetime.signal })
          );
          return Object.freeze({ status: 'included', receipt });
        }
      }
      // The pinned finalized anchor and both range anchors must still name the same canonical chain.
      check(
        hash((await read(() => client.rpc.chain.getBlockHash(finalizedBlockNumber))).toHex()) === finalizedBlockHash
      );
      check(hash((await read(() => client.rpc.chain.getBlockHash(first))).toHex()) === mortality.checkpoint.hash);
      check(hash((await read(() => client.rpc.chain.getBlockHash(last))).toHex()) === previous);
      guard();
      if (finalizedBlockNumber <= mortality.deathBlockNumber) return Object.freeze({ status: 'unresolved' });
      const body = {
        protocol: 'goal-canonical-expiry-v1' as const,
        orderId: order.id,
        orderSha256: goalExpiryOrderDigest(order),
        orderRevision: order.goalExecution.orderRevision,
        orderPhase: order.goalExecution.phase as 'signed' | 'submitted',
        controlRevision,
        txHash: order.txHash!,
        signedEnvelopeDigest: order.goalExecution.signedEnvelopeDigest!,
        checkpointHash: mortality.checkpoint.hash,
        birthBlockNumber: first,
        deathBlockNumber: last,
        finalizedBlockHash,
        finalizedBlockNumber,
        scannedBlocks: scanned,
        checkedAtMs: integer(now()),
      };
      const evidence = readGoalExpiryEvidence({ ...body, evidenceSha256: digest(body) });
      owned.set(evidence, { guard, dispose });
      retained = true;
      return Object.freeze({ status: 'expired', evidence });
    };
    return await Promise.race([work(), interrupted]);
  } catch (error) {
    if (error instanceof GoalReceiptError) throw error;
    return fail('unavailable');
  } finally {
    readClosed = true;
    if (!retained) dispose();
  }
}
