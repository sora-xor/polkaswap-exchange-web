/** Read-only, context-owned finalized-state estimates for the browser. No wallet or submission surface. */
import {
  assertHistoricalFeeDetailsMatchesQueryInfo,
  createHistoricalExecutionCodec,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './execution-codecs/execution';
import { createHistoricalExecutionPoolCodec } from './execution-codecs/pool';
import { createHistoricalGoalFeeCodec, HISTORICAL_GOAL_FEE_POLICY } from './execution-codecs/fee';

export type ExecutionRpcMethod =
  | 'chain_getBlockHash'
  | 'chain_getFinalizedHead'
  | 'chain_getHeader'
  | 'state_getRuntimeVersion'
  | 'state_getMetadata'
  | 'state_getStorageHash'
  | 'state_queryStorageAt'
  | 'liquidityProxy_quote'
  | 'state_call';

export interface ExecutionStateDependencies {
  request(method: ExecutionRpcMethod, params: readonly unknown[], signal: AbortSignal): Promise<unknown>;
  /** A private stable object for this connection epoch; replace it on reconnection. */
  connection(): { identity: object; connected: boolean };
  now(): number;
}

export const EXECUTION_STATE_POLICY = Object.freeze({
  id: 'finalized-browser-execution-state-v1',
  operationTimeoutMs: 5000,
  maximumContextAgeMsExclusive: 5000,
  maximumFinalizedBlockAgeMs: 60000,
  futureBlockAllowanceMs: 0,
  captureRpcLimit: 8,
  quoteRpcLimit: 3,
  envelopeFeeRpcLimit: 2,
  maximumParsedResponseCharacters: 4_300_000,
  maximumTotalParsedResponseCharacters: 4_500_000,
} as const);

type FailureReason =
  | 'invalid-input'
  | 'invalid-response'
  | 'rpc-unavailable'
  | 'response-limit'
  | 'disconnected'
  | 'connection-changed'
  | 'timeout'
  | 'aborted'
  | 'stale-context'
  | 'stale-block'
  | 'future-block';

/** Bounded diagnostic deliberately excludes provider Error messages and connection credentials. */
export class ExecutionStateError extends Error {
  constructor(readonly reason: FailureReason) {
    super(`Execution state unavailable: ${reason}`);
    this.name = 'ExecutionStateError';
  }
}
const fail = (reason: FailureReason = 'invalid-response'): never => {
  throw new ExecutionStateError(reason);
};
const labels = ['timestamp', 'denominator', 'kusd', 'xor', 'dex0', 'properties', 'reserves'] as const;
const MAX_U128 = (1n << 128n) - 1n;
type PoolCodec = ReturnType<typeof createHistoricalExecutionPoolCodec>;
type ExecutionCodec = ReturnType<typeof createHistoricalExecutionCodec>;
type FeeCodec = ReturnType<typeof createHistoricalGoalFeeCodec>;

export interface ExecutionStateContext {
  readonly kind: 'finalized-browser-execution-context';
  readonly policy: typeof EXECUTION_STATE_POLICY;
  readonly genesisHash: string;
  readonly block: Readonly<{ hash: string; height: number; parentHash: string; timestampMs: number }>;
  readonly checkedAtMs: number;
  readonly receivedAtMs: number;
  readonly expectedDenominator: string;
  readonly codecBinding: ExecutionCodec['binding'];
  readonly codeHash: string;
  readonly pool: ReturnType<PoolCodec['decodeStorage']>;
  readonly finalityAttestation: 'rpc-canonical-finalized';
  readonly rpcCalls: number;
  readonly observedFill: false;
  readonly transactionSubmitted: false;
}
export interface ExecutionStateRequest {
  readonly assetIn: string;
  readonly assetOut: string;
  readonly amountInCodec: string;
}

/** Exact reviewed call and serialized envelope; the caller separately verifies signer authority. */
export interface ExecutionEnvelopeFeeRequest extends ExecutionStateRequest {
  readonly quotedAmountOutCodec: string;
  readonly envelopeHex: string;
}

/** Bounded own-data JSON copy: rejects accessors, sparse arrays, symbols and custom prototypes. */
function snapshot(value: unknown, limit: number = EXECUTION_STATE_POLICY.maximumParsedResponseCharacters): unknown {
  let nodes = 0;
  let characters = 0;
  const visit = (item: unknown, depth: number): unknown => {
    if (++nodes > 4096 || depth > 16) return fail('response-limit');
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'number') return Number.isFinite(item) ? item : fail();
    if (typeof item === 'string') {
      characters += item.length;
      return characters <= limit ? item : fail('response-limit');
    }
    if (!item || typeof item !== 'object') return fail();
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (Array.isArray(item)) {
      if (Object.getPrototypeOf(item) !== Array.prototype || item.length > 256) return fail('response-limit');
      if (Reflect.ownKeys(descriptors).length !== item.length + 1) return fail();
      return Object.freeze(
        Array.from({ length: item.length }, (_, index) => {
          const descriptor = descriptors[String(index)];
          if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return fail();
          return visit(descriptor.value, depth + 1);
        })
      );
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(item))) return fail();
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length > 64) return fail('response-limit');
    return Object.freeze(
      Object.fromEntries(
        keys.map((key) => {
          if (typeof key !== 'string' || key.length > 1026) return fail();
          characters += key.length;
          const descriptor = descriptors[key];
          if (!('value' in descriptor) || !descriptor.enumerable || characters > limit) return fail();
          return [key, visit(descriptor.value, depth + 1)];
        })
      )
    );
  };
  return visit(value, 0);
}
function record(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const fields = value as Record<string, unknown>;
  if (keys && (Object.keys(fields).length !== keys.length || keys.some((key) => !Object.hasOwn(fields, key))))
    return fail();
  return fields;
}
function hash(value: unknown): string {
  return typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value) ? value : fail();
}
function unsigned(value: unknown, positive = false): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,38})$/.test(value)) return fail();
  const number = BigInt(value);
  return number <= MAX_U128 && (!positive || number > 0n) ? value : fail();
}
function time(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : fail('invalid-input');
}
function header(value: unknown) {
  const item = record(value, ['number', 'parentHash', 'stateRoot', 'extrinsicsRoot', 'digest']);
  if (typeof item.number !== 'string' || !/^0x[0-9a-f]{1,8}$/.test(item.number)) return fail();
  const height = Number(BigInt(item.number));
  if (!height) return fail();
  hash(item.stateRoot);
  hash(item.extrinsicsRoot);
  const digest = record(item.digest, ['logs']);
  if (
    !Array.isArray(digest.logs) ||
    digest.logs.length > 128 ||
    digest.logs.some((log) => typeof log !== 'string' || log.length > 65538 || !/^0x(?:[0-9a-f]{2})*$/.test(log))
  )
    return fail();
  return { height, parentHash: hash(item.parentHash) };
}
function runtime(value: unknown) {
  const item = record(value);
  if (item.specName !== 'sora-substrate' || !Array.isArray(item.apis)) return fail();
  for (const key of ['specVersion', 'transactionVersion'])
    if (!Number.isSafeInteger(item[key]) || Number(item[key]) <= 0 || Number(item[key]) > 0xffffffff) return fail();
  for (const api of item.apis)
    if (
      !Array.isArray(api) ||
      api.length !== 2 ||
      typeof api[0] !== 'string' ||
      !/^0x[0-9a-f]{16}$/.test(api[0]) ||
      !Number.isSafeInteger(api[1]) ||
      api[1] < 0 ||
      api[1] > 0xffffffff
    )
      return fail();
  return { specVersion: Number(item.specVersion), transactionVersion: Number(item.transactionVersion) };
}
function swapRequest(value: unknown): ExecutionStateRequest {
  const request = record(snapshot(value), ['assetIn', 'assetOut', 'amountInCodec']);
  if (
    !((request.assetIn === KUSD && request.assetOut === XOR) || (request.assetIn === XOR && request.assetOut === KUSD))
  )
    return fail('invalid-input');
  return Object.freeze({
    assetIn: String(request.assetIn),
    assetOut: String(request.assetOut),
    amountInCodec: unsigned(request.amountInCodec, true),
  });
}

/**
 * Each operation bounds its entire elapsed wait, even when an SDK request ignores AbortSignal.
 * Cancellation only retires this read; it never disconnects or changes the shared SDK connection.
 * RPC responses are node attestations, not independently verified storage proofs or observed fills.
 */
export function createExecutionStateProvider(dependencies: ExecutionStateDependencies) {
  const descriptors = Object.getOwnPropertyDescriptors(dependencies);
  for (const key of ['request', 'connection', 'now'])
    if (!descriptors[key] || !('value' in descriptors[key]) || typeof descriptors[key].value !== 'function')
      return fail('invalid-input');
  const requestRpc = descriptors.request.value as ExecutionStateDependencies['request'];
  const connection = descriptors.connection.value as ExecutionStateDependencies['connection'];
  const now = descriptors.now.value as ExecutionStateDependencies['now'];
  const privateContexts = new WeakMap<
    ExecutionStateContext,
    { epoch: object; execution: ExecutionCodec; fee: FeeCodec }
  >();
  const epoch = () => {
    const state = connection();
    const fields = Object.getOwnPropertyDescriptors(state);
    if (!fields.connected || !('value' in fields.connected) || fields.connected.value !== true)
      return fail('disconnected');
    const identity = fields.identity;
    if (!identity || !('value' in identity) || !identity.value || typeof identity.value !== 'object')
      return fail('invalid-input');
    return identity.value as object;
  };
  const operation = async <T>(
    limit: number,
    signal: AbortSignal | undefined,
    work: (op: {
      epoch: object;
      checkedAtMs: number;
      check(): number;
      rpc(method: ExecutionRpcMethod, params: readonly unknown[]): Promise<unknown>;
      count(): number;
    }) => Promise<T>
  ): Promise<T> => {
    const checkedAtMs = time(now());
    const identity = epoch();
    const controller = new AbortController();
    let ended = false;
    let calls = 0;
    let totalCharacters = 0;
    let cancellation: FailureReason | undefined;
    let rejectCancelled!: (error: ExecutionStateError) => void;
    const cancelled = new Promise<never>((_, reject) => {
      rejectCancelled = reject;
    });
    const cancel = (reason: FailureReason) => {
      if (ended || cancellation) return;
      cancellation = reason;
      controller.abort();
      rejectCancelled(new ExecutionStateError(reason));
    };
    const abort = () => cancel('aborted');
    const timer = setTimeout(() => cancel('timeout'), EXECUTION_STATE_POLICY.operationTimeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    const check = () => {
      if (cancellation) return fail(cancellation);
      if (ended || signal?.aborted) return fail('aborted');
      if (epoch() !== identity) return fail('connection-changed');
      const current = time(now());
      if (current < checkedAtMs || current - checkedAtMs >= EXECUTION_STATE_POLICY.operationTimeoutMs)
        return fail('timeout');
      return current;
    };
    const rpc = async (method: ExecutionRpcMethod, params: readonly unknown[]) => {
      check();
      if (++calls > limit) return fail('invalid-input');
      let raw: unknown;
      try {
        raw = await requestRpc(method, snapshot(params) as readonly unknown[], controller.signal);
      } catch {
        check();
        return fail('rpc-unavailable');
      }
      check();
      const result = snapshot(raw);
      totalCharacters += JSON.stringify(result).length;
      if (totalCharacters > EXECUTION_STATE_POLICY.maximumTotalParsedResponseCharacters) return fail('response-limit');
      check();
      return result;
    };
    try {
      check();
      return await Promise.race([work({ epoch: identity, checkedAtMs, check, rpc, count: () => calls }), cancelled]);
    } catch (error) {
      if (error instanceof ExecutionStateError) throw error;
      return fail('invalid-response');
    } finally {
      ended = true;
      controller.abort();
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
  const checkBlockAge = (timestampMs: number, current: number) => {
    if (timestampMs > current) return fail('future-block');
    if (current - timestampMs > EXECUTION_STATE_POLICY.maximumFinalizedBlockAgeMs) return fail('stale-block');
  };
  /** Recheck ownership, connection epoch and strict context/block freshness without network access. */
  const assertCurrent = (context: ExecutionStateContext): void => {
    const owned = privateContexts.get(context);
    if (!owned) return fail('invalid-input');
    if (epoch() !== owned.epoch) return fail('connection-changed');
    const current = time(now());
    if (
      current < context.receivedAtMs ||
      current - context.receivedAtMs >= EXECUTION_STATE_POLICY.maximumContextAgeMsExclusive
    )
      return fail('stale-context');
    checkBlockAge(context.block.timestampMs, current);
  };
  /** Capture the connected node's current canonical finalized state once, without endpoint fallback. */
  const capture = (input: { expectedDenominator: string }, signal?: AbortSignal): Promise<ExecutionStateContext> =>
    operation(EXECUTION_STATE_POLICY.captureRpcLimit, signal, async (op) => {
      const fields = record(snapshot(input), ['expectedDenominator']);
      const expectedDenominator = unsigned(fields.expectedDenominator, true);
      const [genesis, finalized] = await Promise.all([
        op.rpc('chain_getBlockHash', [0]),
        op.rpc('chain_getFinalizedHead', []),
      ]);
      if (genesis !== GENESIS) return fail();
      const blockHash = hash(finalized);
      if (blockHash === GENESIS) return fail();
      const [rawHeader, rawRuntime, metadataHex, rawCodeHash] = await Promise.all([
        op.rpc('chain_getHeader', [blockHash]),
        op.rpc('state_getRuntimeVersion', [blockHash]),
        op.rpc('state_getMetadata', [blockHash]),
        op.rpc('state_getStorageHash', ['0x3a636f6465', blockHash]),
      ]);
      const blockHeader = header(rawHeader);
      if (
        blockHeader.parentHash === blockHash ||
        (blockHeader.height === 1 && blockHeader.parentHash !== GENESIS) ||
        (blockHeader.height > 1 && blockHeader.parentHash === GENESIS)
      )
        return fail();
      const identity = { genesisHash: GENESIS, blockHash, metadataHex, runtimeVersion: runtime(rawRuntime) };
      const execution = createHistoricalExecutionCodec(identity);
      const poolCodec = createHistoricalExecutionPoolCodec(identity);
      const fee = createHistoricalGoalFeeCodec(identity);
      op.check();
      const keys = poolCodec.storageKeys();
      const [canonical, changesets] = await Promise.all([
        op.rpc('chain_getBlockHash', [blockHeader.height]),
        op.rpc('state_queryStorageAt', [labels.map((label) => keys[label]), blockHash]),
      ]);
      if (canonical !== blockHash || !Array.isArray(changesets) || changesets.length !== 1) return fail();
      const changeset = record(changesets[0], ['block', 'changes']);
      if (
        changeset.block !== blockHash ||
        !Array.isArray(changeset.changes) ||
        changeset.changes.length !== labels.length
      )
        return fail();
      const proof = {} as Record<(typeof labels)[number], string | null>;
      for (const [index, label] of labels.entries()) {
        const pair = changeset.changes[index];
        if (!Array.isArray(pair) || pair.length !== 2 || pair[0] !== keys[label]) return fail();
        if (
          pair[1] !== null &&
          (typeof pair[1] !== 'string' || pair[1].length > 65538 || !/^0x(?:[0-9a-f]{2})*$/.test(pair[1]))
        )
          return fail();
        proof[label] = pair[1];
      }
      const pool = poolCodec.decodeStorage(proof);
      if (pool.state.denominator !== expectedDenominator) return fail();
      const receivedAtMs = op.check();
      checkBlockAge(pool.state.timestampMs, receivedAtMs);
      const context: ExecutionStateContext = Object.freeze({
        kind: 'finalized-browser-execution-context',
        policy: EXECUTION_STATE_POLICY,
        genesisHash: GENESIS,
        block: Object.freeze({ hash: blockHash, ...blockHeader, timestampMs: pool.state.timestampMs }),
        checkedAtMs: op.checkedAtMs,
        receivedAtMs,
        expectedDenominator,
        codecBinding: execution.binding,
        codeHash: hash(rawCodeHash),
        pool,
        finalityAttestation: 'rpc-canonical-finalized',
        rpcCalls: op.count(),
        observedFill: false,
        transactionSubmitted: false,
      });
      checkBlockAge(context.block.timestampMs, op.check());
      privateContexts.set(context, { epoch: op.epoch, execution, fee });
      return context;
    });
  /** Quote exactly one requested lot and its bounded native-XOR fee at the captured hash. No admission decision. */
  const quote = (context: ExecutionStateContext, input: ExecutionStateRequest, signal?: AbortSignal) =>
    operation(EXECUTION_STATE_POLICY.quoteRpcLimit, signal, async (op) => {
      const owned = privateContexts.get(context);
      if (!owned) return fail('invalid-input');
      const fresh = () => {
        const current = op.check();
        if (owned.epoch !== op.epoch) return fail('connection-changed');
        if (
          current < context.receivedAtMs ||
          current - context.receivedAtMs >= EXECUTION_STATE_POLICY.maximumContextAgeMsExclusive
        )
          return fail('stale-context');
        checkBlockAge(context.block.timestampMs, current);
        return current;
      };
      fresh();
      const request = swapRequest(input);
      const unavailable = (
        reason: 'pool-absent' | 'pool-missing-reserves' | 'pool-zero-reserves' | 'quote-unavailable'
      ) =>
        Object.freeze({
          status: 'unavailable' as const,
          reason,
          context,
          request,
          checkedAtMs: op.checkedAtMs,
          receivedAtMs: fresh(),
          rpcCalls: op.count(),
          observedFill: false as const,
          transactionSubmitted: false as const,
        });
      if (context.pool.status !== 'present') return unavailable(`pool-${context.pool.status}`);
      const rawQuote = await op.rpc('liquidityProxy_quote', [
        0,
        request.assetIn,
        request.assetOut,
        request.amountInCodec,
        'WithDesiredInput',
        ['XYKPool'],
        'AllowSelected',
        context.block.hash,
      ]);
      fresh();
      if (rawQuote === null) return unavailable('quote-unavailable');
      const raw = record(rawQuote);
      const amountOutCodec = unsigned(raw.amount, true);
      const amountWithoutImpactCodec = unsigned(raw.amount_without_impact, true);
      if (
        BigInt(amountWithoutImpactCodec) < BigInt(amountOutCodec) ||
        !Array.isArray(raw.route) ||
        raw.route.length !== 2 ||
        raw.route[0] !== request.assetIn ||
        raw.route[1] !== request.assetOut
      )
        return fail();
      const poolFees = record(raw.fee, [XOR]);
      const poolFeeCodec = unsigned(poolFees[XOR]);
      const envelope = owned.fee.buildBoundSwapEnvelope(
        { ...request, quotedAmountOutCodec: amountOutCodec },
        { blockNumber: context.block.height }
      );
      fresh();
      const rawInfo = await op.rpc('state_call', [
        'TransactionPaymentApi_query_info',
        envelope.feeQueryDataHex,
        context.block.hash,
      ]);
      fresh();
      const rawDetails = await op.rpc('state_call', [
        'TransactionPaymentApi_query_fee_details',
        envelope.feeQueryDataHex,
        context.block.hash,
      ]);
      fresh();
      const info = owned.execution.decodeQueryInfo(rawInfo);
      const details = assertHistoricalFeeDetailsMatchesQueryInfo(rawDetails, info.partialFeeCodec, '0');
      const result = {
        status: 'available' as const,
        context,
        request,
        checkedAtMs: op.checkedAtMs,
        receivedAtMs: fresh(),
        rpcCalls: op.count(),
        quote: {
          amountOutCodec,
          amountWithoutImpactCodec,
          minimumAmountOutCodec: envelope.minimumCodec,
          poolFeeCodec,
          feeAssetAddress: XOR,
          route: [request.assetIn, request.assetOut],
          dexId: 0,
          liquiditySource: 'XYKPool',
          slippageBps: 50,
        },
        fee: {
          assetId: XOR,
          amountCodec: details.finalFee,
          policy: HISTORICAL_GOAL_FEE_POLICY,
          policySha256: envelope.policySha256,
          envelope,
          info,
          details,
        },
        raw: { quote: rawQuote, info: rawInfo, details: rawDetails },
        feeAdequacyVerified: false as const,
        observedFill: false as const,
        transactionSubmitted: false as const,
      };
      // Codecs return only plain JSON here; the final copy also deeply freezes arrays and nested fee fields.
      const detached = snapshot(result, EXECUTION_STATE_POLICY.maximumTotalParsedResponseCharacters) as typeof result;
      return Object.freeze({ ...detached, context, receivedAtMs: fresh() });
    });
  /**
   * Estimate the supplied envelope's native fee at an owned, fresh finalized state. Structural
   * inspection binds its call, minimum, mortality layout, zero tip and supported signature/nonce
   * length. This neither verifies the signature/account nor authorizes or broadcasts a transaction.
   * The original reviewed output defines the signed minimum; no fresh quote can replace that bound.
   */
  const estimateEnvelopeFee = (
    context: ExecutionStateContext,
    input: ExecutionEnvelopeFeeRequest,
    signal?: AbortSignal
  ) =>
    operation(EXECUTION_STATE_POLICY.envelopeFeeRpcLimit, signal, async (op) => {
      const owned = privateContexts.get(context);
      if (!owned) return fail('invalid-input');
      const fresh = () => {
        op.check();
        if (owned.epoch !== op.epoch) return fail('connection-changed');
        assertCurrent(context);
        return op.check();
      };
      fresh();
      const fields = record(snapshot(input), [
        'assetIn',
        'assetOut',
        'amountInCodec',
        'quotedAmountOutCodec',
        'envelopeHex',
      ]);
      const request = {
        ...swapRequest({ assetIn: fields.assetIn, assetOut: fields.assetOut, amountInCodec: fields.amountInCodec }),
        quotedAmountOutCodec: unsigned(fields.quotedAmountOutCodec, true),
      };
      const inspection = owned.fee.inspectSwapEnvelope(
        request,
        { blockNumber: context.block.height },
        fields.envelopeHex
      );
      const envelopeHex = (fields.envelopeHex as string).toLowerCase();
      const lengthHex = Array.from({ length: 4 }, (_, index) =>
        ((inspection.encodedLength >>> (8 * index)) & 255).toString(16).padStart(2, '0')
      ).join('');
      const feeQueryDataHex = `${envelopeHex}${lengthHex}`;
      fresh();
      const rawInfo = await op.rpc('state_call', [
        'TransactionPaymentApi_query_info',
        feeQueryDataHex,
        context.block.hash,
      ]);
      fresh();
      const rawDetails = await op.rpc('state_call', [
        'TransactionPaymentApi_query_fee_details',
        feeQueryDataHex,
        context.block.hash,
      ]);
      fresh();
      const info = owned.execution.decodeQueryInfo(rawInfo);
      const details = assertHistoricalFeeDetailsMatchesQueryInfo(rawDetails, info.partialFeeCodec, '0');
      const result = {
        kind: 'finalized-envelope-fee-estimate' as const,
        context,
        request,
        inspection,
        envelopeHex,
        feeQueryDataHex,
        fee: {
          assetId: XOR,
          amountCodec: details.finalFee,
          policy: HISTORICAL_GOAL_FEE_POLICY,
          policySha256: owned.fee.policySha256,
          info,
          details,
        },
        raw: { info: rawInfo, details: rawDetails },
        checkedAtMs: op.checkedAtMs,
        receivedAtMs: 0,
        rpcCalls: op.count(),
        signatureVerified: false as const,
        accountAuthorityVerified: false as const,
        feeAdequacyVerified: false as const,
        observedFill: false as const,
        transactionSubmitted: false as const,
      };
      const detached = snapshot(result, EXECUTION_STATE_POLICY.maximumTotalParsedResponseCharacters) as typeof result;
      return Object.freeze({ ...detached, context, receivedAtMs: fresh() });
    });
  return Object.freeze({ capture, quote, assertCurrent, estimateEnvelopeFee });
}
export type ExecutionStateQuote = Awaited<ReturnType<ReturnType<typeof createExecutionStateProvider>['quote']>>;
export type ExecutionEnvelopeFee = Awaited<
  ReturnType<ReturnType<typeof createExecutionStateProvider>['estimateEnvelopeFee']>
>;
