/** Canonical finalized receipt reads for the explicit goal protocol. No signing or submission. */
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsHex, decodeAddress, sha256AsU8a } from '@polkadot/util-crypto';
import { canonicalizeAgentIntent } from '@/features/agent-trading/intent';
import { GOAL_EXECUTION_PROTOCOL } from './goal-execution-types';
import { GOAL_EXACT_KUSD as KUSD, GOAL_EXACT_XOR as XOR, GOAL_EXACT_POLICY } from './goal-exact-ledger';
import type { GoalExecutionFinalReceipt, GoalExecutionOrder } from './goal-execution-types';

interface HexValue {
  toHex(): string;
}
interface ReceiptHeader {
  hash: HexValue;
  number: { toNumber(): number };
}
interface ReceiptExtrinsic extends HexValue {
  hash: HexValue;
  isSigned: boolean;
  signer: { toString(): string };
}
export interface GoalReceiptEvent {
  phase: { isApplyExtrinsic: boolean; asApplyExtrinsic: { toNumber(): number } };
  event: { section: string; method: string; data: ArrayLike<unknown> };
}
/** Public SDK surface only; historical events are decoded through the block-specific API. */
export interface GoalReceiptClient {
  readonly isConnected: boolean;
  readonly genesisHash: HexValue;
  readonly runtimeVersion: HexValue;
  readonly runtimeMetadata: object;
  on(event: 'connected' | 'disconnected', listener: () => void): unknown;
  off(event: 'connected' | 'disconnected', listener: () => void): unknown;
  rpc: {
    chain: {
      getFinalizedHead(): Promise<HexValue>;
      getHeader(hash: string): Promise<ReceiptHeader>;
      getBlockHash(height: number): Promise<HexValue>;
      getBlock(hash: string): Promise<{ block: { header: ReceiptHeader; extrinsics: ArrayLike<ReceiptExtrinsic> } }>;
    };
  };
  /** Bare ApiPromise omits storage augmentations; the reader validates system.events at this boundary. */
  at(hash: string): Promise<{ query: unknown }>;
}
export interface GoalReceiptReadOptions {
  client: GoalReceiptClient;
  /** Compare the captured client with the application's current client and network. */
  isCurrent(): boolean;
  now(): number;
  order: GoalExecutionOrder;
  blockHash: string;
  signal?: AbortSignal;
}
export class GoalReceiptError extends Error {
  constructor(readonly reason: 'invalid' | 'unavailable' | 'context-changed' | 'timeout' | 'aborted') {
    super(`Goal receipt ${reason}`);
    this.name = 'GoalReceiptError';
  }
}
const fail = (reason: GoalReceiptError['reason'] = 'invalid'): never => {
  throw new GoalReceiptError(reason);
};
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const U128 = (1n << 128n) - 1n;
const TIMEOUT_MS = 30_000;
const digest = (bytes: Uint8Array) => u8aToHex(sha256AsU8a(bytes)).slice(2);
const hash = (input: unknown): string => (typeof input === 'string' && HASH.test(input) ? input : fail());
const integer = (input: number): number => (Number.isSafeInteger(input) && input >= 0 ? input : fail());
const amount = (input: unknown, positive = false): string => {
  if (typeof input !== 'string' || !/^(?:0|[1-9]\d{0,38})$/.test(input)) return fail();
  const value = BigInt(input);
  return value <= U128 && (!positive || value > 0n) ? input : fail();
};
const textValue = (input: unknown): string => {
  const value = input && typeof input === 'object' && 'code' in input ? input.code : input;
  const text = String(value);
  return text.length <= 256 ? text : fail();
};
const accountKey = (input: string): string => {
  if (typeof input !== 'string' || input.length > 256) return fail();
  try {
    const bytes = decodeAddress(input);
    return bytes.length === 32 ? u8aToHex(bytes) : fail();
  } catch {
    return fail();
  }
};

/** Hash the exact serialized signed bytes, independently of SDK object identity. */
export function goalSignedEnvelopeDigest(input: string): string {
  if (typeof input !== 'string' || input.length > 8194 || !/^0x(?:[0-9a-fA-F]{2})+$/.test(input)) return fail();
  return digest(hexToU8a(input));
}

/** Copy only required own data before any await; callers cannot change an order during receipt lookup. */
function orderSnapshot(input: GoalExecutionOrder) {
  const own = (source: unknown, key: string): unknown => {
    if (!source || typeof source !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(source)))
      return fail();
    const field = Object.getOwnPropertyDescriptor(source, key);
    return field && 'value' in field && field.enumerable ? field.value : fail();
  };
  const string = (source: unknown, key: string): string => {
    const value = own(source, key);
    return typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : fail();
  };
  const binding = own(input, 'goalExecution');
  if (own(binding, 'protocol') !== GOAL_EXECUTION_PROTOCOL) return fail();
  const phase = string(binding, 'phase');
  if (!['signed', 'submitted', 'finalized-pending', 'accounted'].includes(phase)) return fail();
  const order = {
    id: string(input, 'id'),
    goalId: string(binding, 'goalId'),
    account: string(input, 'account'),
    network: hash(own(input, 'network')),
    inputAsset: string(input, 'inputAsset'),
    outputAsset: string(input, 'outputAsset'),
    inputCodec: amount(own(input, 'inputCodec'), true),
    feeAsset: string(input, 'feeAsset'),
    txHash: hash(own(input, 'txHash')),
    signedEnvelopeDigest: string(binding, 'signedEnvelopeDigest'),
  };
  if (
    order.network !== GOAL_EXACT_POLICY.genesisHash ||
    order.feeAsset !== XOR ||
    !SHA.test(order.signedEnvelopeDigest) ||
    ![
      [KUSD, XOR],
      [XOR, KUSD],
    ].some(([a, b]) => a === order.inputAsset && b === order.outputAsset)
  )
    return fail();
  accountKey(order.account);
  return Object.freeze(order);
}

/** Decode this exact extrinsic's effects; retain actual overruns instead of applying admission limits again. */
function receiptEffects(order: ReturnType<typeof orderSnapshot>, records: ArrayLike<GoalReceiptEvent>, index: number) {
  if (!Number.isSafeInteger(records.length) || records.length > 65536 || records.length < 0) return fail();
  let success = 0;
  let failure = 0;
  let outputCodec: string | undefined;
  let actualFeeCodec: string | undefined;
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record.phase.isApplyExtrinsic || record.phase.asApplyExtrinsic.toNumber() !== index) continue;
    const { section, method, data } = record.event;
    if (section === 'system' && method === 'ExtrinsicSuccess') success++;
    if (section === 'system' && method === 'ExtrinsicFailed') failure++;
    if (section === 'xorFee' && method === 'FeeWithdrawn') {
      if (
        actualFeeCodec !== undefined ||
        ![2, 3].includes(data.length) ||
        accountKey(textValue(data[0])) !== accountKey(order.account) ||
        (data.length === 3 && textValue(data[1]) !== XOR)
      )
        return fail();
      actualFeeCodec = amount(textValue(data[data.length - 1]));
    }
    if (section === 'liquidityProxy' && method === 'Exchange') {
      if (
        outputCodec !== undefined ||
        data.length < 6 ||
        data.length > 8 ||
        accountKey(textValue(data[0])) !== accountKey(order.account) ||
        textValue(data[1]) !== '0' ||
        textValue(data[2]) !== order.inputAsset ||
        textValue(data[3]) !== order.outputAsset ||
        amount(textValue(data[4]), true) !== order.inputCodec
      )
        return fail();
      outputCodec = amount(textValue(data[5]));
    }
  }
  if (
    !((success === 1 && failure === 0) || (success === 0 && failure === 1)) ||
    actualFeeCodec === undefined ||
    (success === 1 ? outputCodec === undefined : outputCodec !== undefined)
  )
    return fail();
  return Object.freeze({ success: success === 1, outputCodec: outputCodec ?? '0', actualFeeCodec });
}

/**
 * Verify inclusion against a canonical finalized RPC block and block-specific events. This relies
 * on the connected node's finality attestation, not a cryptographic finality proof. A single total
 * deadline bounds SDK waits; abort/disconnect ignores late work without closing the shared socket.
 */
export async function readGoalFinalizedReceipt(options: GoalReceiptReadOptions): Promise<GoalExecutionFinalReceipt> {
  try {
    return await readReceipt(options);
  } catch (error) {
    if (error instanceof GoalReceiptError) throw error;
    return fail('unavailable');
  }
}

/** Keep all SDK exceptions behind the public bounded diagnostic boundary. */
async function readReceipt(options: GoalReceiptReadOptions): Promise<GoalExecutionFinalReceipt> {
  const order = orderSnapshot(options.order);
  const candidate = hash(options.blockHash);
  const { client, signal, isCurrent, now } = options;
  const startedAt = integer(now());
  const metadata = client.runtimeMetadata;
  const runtime = client.runtimeVersion;
  const runtimeHex = runtime.toHex();
  const genesis = hash(client.genesisHash.toHex());
  if (genesis !== order.network || !metadata || typeof metadata !== 'object') return fail();
  let revoked = false;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectWait: ((error: GoalReceiptError) => void) | undefined;
  const attached = new Set<'connected' | 'disconnected'>();
  const stop = (reason: GoalReceiptError['reason']) => {
    revoked = true;
    rejectWait?.(new GoalReceiptError(reason));
  };
  const disconnected = () => stop('context-changed');
  const aborted = () => stop('aborted');
  const check = () => {
    if (signal?.aborted) return fail('aborted');
    if (closed || revoked) return fail('context-changed');
    const time = integer(now());
    if (time < startedAt || time - startedAt >= TIMEOUT_MS) return fail('timeout');
    if (
      isCurrent() !== true ||
      client.isConnected !== true ||
      client.genesisHash.toHex() !== genesis ||
      client.runtimeMetadata !== metadata ||
      client.runtimeVersion !== runtime ||
      runtime.toHex() !== runtimeHex
    )
      return fail('context-changed');
  };
  const read = async <T>(action: () => Promise<T>): Promise<T> => {
    check();
    const result = await action();
    check();
    return result;
  };
  try {
    for (const event of ['connected', 'disconnected'] as const) {
      attached.add(event);
      client.on(event, disconnected);
    }
    signal?.addEventListener('abort', aborted, { once: true });
    check();
    const interrupted = new Promise<never>((_, reject) => {
      rejectWait = reject;
      timer = setTimeout(() => stop('timeout'), TIMEOUT_MS);
    });
    const work = async (): Promise<GoalExecutionFinalReceipt> => {
      const head = hash((await read(() => client.rpc.chain.getFinalizedHead())).toHex());
      const finalized = await read(() => client.rpc.chain.getHeader(head));
      const header = candidate === head ? finalized : await read(() => client.rpc.chain.getHeader(candidate));
      const finalizedHeight = integer(finalized.number.toNumber());
      const height = integer(header.number.toNumber());
      if (
        height < 1 ||
        finalizedHeight > 0xffffffff ||
        candidate === genesis ||
        hash(finalized.hash.toHex()) !== head ||
        hash(header.hash.toHex()) !== candidate ||
        height > finalizedHeight ||
        (height === finalizedHeight && candidate !== head)
      )
        return fail();
      if (hash((await read(() => client.rpc.chain.getBlockHash(finalizedHeight))).toHex()) !== head) return fail();
      if (hash((await read(() => client.rpc.chain.getBlockHash(height))).toHex()) !== candidate) return fail();
      const { block } = await read(() => client.rpc.chain.getBlock(candidate));
      if (
        block.header.number.toNumber() !== height ||
        hash(block.header.hash.toHex()) !== candidate ||
        !Number.isSafeInteger(block.extrinsics.length) ||
        block.extrinsics.length < 1 ||
        block.extrinsics.length > 65536
      )
        return fail();
      const indices = Array.from({ length: block.extrinsics.length }, (_, i) => i).filter(
        (i) => block.extrinsics[i].hash.toHex() === order.txHash
      );
      if (indices.length !== 1) return fail();
      const extrinsicIndex = indices[0];
      const tx = block.extrinsics[extrinsicIndex];
      const bytes = tx.toHex();
      if (
        !tx.isSigned ||
        accountKey(tx.signer.toString()) !== accountKey(order.account) ||
        goalSignedEnvelopeDigest(bytes) !== order.signedEnvelopeDigest ||
        blake2AsHex(hexToU8a(bytes), 256) !== order.txHash
      )
        return fail();
      const at = await read(() => client.at(candidate));
      const query = at.query as { system?: { events?: unknown } } | null;
      const system = query?.system;
      if (!system || typeof system.events !== 'function') return fail();
      const events = system.events as () => Promise<ArrayLike<GoalReceiptEvent>>;
      const effects = receiptEffects(order, await read(() => events.call(system)), extrinsicIndex);
      const receipt = {
        goalId: order.goalId,
        orderId: order.id,
        account: order.account,
        network: order.network,
        txHash: order.txHash,
        blockHash: candidate,
        blockNumber: height,
        extrinsicIndex,
        ...effects,
      };
      const evidenceDigest = digest(
        new TextEncoder().encode(
          canonicalizeAgentIntent({
            protocol: 'canonical-finalized-goal-receipt-v1',
            signedEnvelopeDigest: order.signedEnvelopeDigest,
            receipt,
          })
        )
      );
      check();
      return Object.freeze({ ...receipt, evidenceDigest });
    };
    return await Promise.race([work(), interrupted]);
  } catch (error) {
    if (error instanceof GoalReceiptError) throw error;
    return fail('unavailable');
  } finally {
    closed = true;
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', aborted);
    for (const event of attached) {
      try {
        client.off(event, disconnected);
      } catch {
        // A broken SDK listener cleanup cannot revive this closed read.
      }
    }
  }
}
