/** Bounded recent finalized inclusion discovery. A miss never proves expiry or non-inclusion. */
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsHex, decodeAddress } from '@polkadot/util-crypto';
import { readGoalExecutionOrder } from './goal-storage';
import {
  GoalReceiptError,
  goalSignedEnvelopeDigest,
  readGoalFinalizedReceipt,
  type GoalReceiptReadOptions,
} from './goal-receipt';
import type { GoalExecutionFinalReceipt } from './goal-execution-types';

export const GOAL_RECOVERY_LIMITS = Object.freeze({ blocks: 128, extrinsics: 65536, timeoutMs: 30000 });
export type GoalInclusionDiscovery =
  | { status: 'included'; receipt: GoalExecutionFinalReceipt }
  | {
      status: 'not-found';
      finalizedBlockHash: string;
      firstScannedBlock: number;
      lastScannedBlock: number;
      scannedBlocks: number;
      expiryProven: false;
    };
export type GoalInclusionDiscoveryOptions = Omit<GoalReceiptReadOptions, 'blockHash'>;
const HASH = /^0x[0-9a-f]{64}$/;
const fail = (reason: GoalReceiptError['reason'] = 'invalid'): never => {
  throw new GoalReceiptError(reason);
};
const hash = (value: string): string => (typeof value === 'string' && HASH.test(value) ? value : fail());
const integer = (value: number): number => (Number.isSafeInteger(value) && value >= 0 ? value : fail());
const account = (value: string): string => {
  const bytes = decodeAddress(value);
  return bytes.length === 32 ? u8aToHex(bytes) : fail();
};

/**
 * Search at most 128 blocks backwards from one pinned canonical finalized head. signedAtBlock
 * does not establish the signed mortality checkpoint and is deliberately not an expiry bound.
 * A hit must pass the ordinary canonical receipt reader before any caller can settle it. Missing
 * blocks, changed connections, malformed data, aborts and exhausted time leave the order unresolved.
 */
export async function discoverGoalFinalizedReceipt(
  options: GoalInclusionDiscoveryOptions
): Promise<GoalInclusionDiscovery> {
  let closed = false;
  let reason: GoalReceiptError['reason'] | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectWait: ((error: GoalReceiptError) => void) | undefined;
  const attached = new Set<'connected' | 'disconnected'>();
  const lifetime = new AbortController();
  const { client, signal, isCurrent, now } = options;
  const stop = (next: GoalReceiptError['reason']) => {
    reason ??= next;
    lifetime.abort();
    rejectWait?.(new GoalReceiptError(reason));
  };
  const disconnected = () => stop('context-changed');
  const aborted = () => stop('aborted');
  try {
    const order = readGoalExecutionOrder(options.order);
    if (!['signed', 'submitted'].includes(order.goalExecution.phase)) return fail();
    const owner = account(order.account);
    const startedAt = integer(now());
    const runtime = client.runtimeVersion;
    const runtimeHex = runtime.toHex();
    const metadata = client.runtimeMetadata;
    const genesis = hash(client.genesisHash.toHex());
    if (genesis !== order.network || !metadata || typeof metadata !== 'object') return fail();
    const check = () => {
      if (signal?.aborted) return fail('aborted');
      if (reason) return fail(reason);
      if (closed) return fail('context-changed');
      const time = integer(now());
      if (time < startedAt || time - startedAt >= GOAL_RECOVERY_LIMITS.timeoutMs) return fail('timeout');
      if (
        isCurrent() !== true ||
        client.isConnected !== true ||
        client.genesisHash.toHex() !== genesis ||
        client.runtimeVersion !== runtime ||
        runtime.toHex() !== runtimeHex ||
        client.runtimeMetadata !== metadata
      )
        return fail('context-changed');
    };
    const read = async <T>(work: () => Promise<T>): Promise<T> => {
      check();
      const result = await work();
      check();
      return result;
    };
    for (const event of ['connected', 'disconnected'] as const) {
      attached.add(event);
      client.on(event, disconnected);
    }
    signal?.addEventListener('abort', aborted, { once: true });
    check();
    const interrupted = new Promise<never>((_, reject) => {
      rejectWait = reject;
      timer = setTimeout(() => stop('timeout'), GOAL_RECOVERY_LIMITS.timeoutMs);
    });
    const work = async (): Promise<GoalInclusionDiscovery> => {
      const finalizedBlockHash = hash((await read(() => client.rpc.chain.getFinalizedHead())).toHex());
      const header = await read(() => client.rpc.chain.getHeader(finalizedBlockHash));
      const lastScannedBlock = integer(header.number.toNumber());
      if (
        lastScannedBlock < 1 ||
        lastScannedBlock > 0xffffffff ||
        hash(header.hash.toHex()) !== finalizedBlockHash ||
        hash((await read(() => client.rpc.chain.getBlockHash(lastScannedBlock))).toHex()) !== finalizedBlockHash
      )
        return fail();
      const firstScannedBlock = Math.max(1, lastScannedBlock - GOAL_RECOVERY_LIMITS.blocks + 1);
      let extrinsics = 0;
      for (let height = lastScannedBlock; height >= firstScannedBlock; height--) {
        const blockHash =
          height === lastScannedBlock
            ? finalizedBlockHash
            : hash((await read(() => client.rpc.chain.getBlockHash(height))).toHex());
        const { block } = await read(() => client.rpc.chain.getBlock(blockHash));
        const count = integer(block.extrinsics.length);
        extrinsics += count;
        if (
          block.header.number.toNumber() !== height ||
          hash(block.header.hash.toHex()) !== blockHash ||
          extrinsics > GOAL_RECOVERY_LIMITS.extrinsics
        )
          return fail();
        const matches: number[] = [];
        for (let i = 0; i < count; i++) {
          if (hash(block.extrinsics[i].hash.toHex()) === order.txHash) matches.push(i);
        }
        if (!matches.length) continue;
        if (matches.length !== 1) return fail();
        const tx = block.extrinsics[matches[0]],
          bytes = tx.toHex();
        if (
          !tx.isSigned ||
          account(tx.signer.toString()) !== owner ||
          goalSignedEnvelopeDigest(bytes) !== order.goalExecution.signedEnvelopeDigest ||
          blake2AsHex(hexToU8a(bytes), 256) !== order.txHash
        )
          return fail();
        const receipt = await read(() =>
          readGoalFinalizedReceipt({ client, order, blockHash, now, isCurrent, signal: lifetime.signal })
        );
        return Object.freeze({ status: 'included', receipt });
      }
      check();
      return Object.freeze({
        status: 'not-found',
        finalizedBlockHash,
        firstScannedBlock,
        lastScannedBlock,
        scannedBlocks: lastScannedBlock - firstScannedBlock + 1,
        expiryProven: false,
      });
    };
    return await Promise.race([work(), interrupted]);
  } catch (error) {
    if (error instanceof GoalReceiptError) throw error;
    return fail('unavailable');
  } finally {
    closed = true;
    lifetime.abort();
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', aborted);
    for (const event of attached) {
      try {
        client.off(event, disconnected);
      } catch {
        // Cleanup failure cannot revive a closed discovery operation.
      }
    }
  }
}
