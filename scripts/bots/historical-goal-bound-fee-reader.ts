/** Two pinned historical fee calls only. No price discovery, wallet, credentials, signing or submission. */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_XOR,
} from './historical-execution-codec';
import {
  prepareHistoricalGoalBoundFeeSource,
  type HistoricalGoalBoundFeeSource,
  type HistoricalGoalBoundFeeReceipt,
} from './historical-goal-bound-fee';

const ENDPOINT = 'https://mof2.sora.org/';
const RESPONSE_LIMIT = 65_536;
const METHODS = ['TransactionPaymentApi_query_info', 'TransactionPaymentApi_query_fee_details'] as const;
type Reason = 'invalid-input' | 'rpc-failed' | 'response-limit' | 'timeout' | 'aborted' | 'fee-mismatch';

/** Raw response prefixes are capped even for oversized, incomplete or invalid UTF-8 bodies. */
export interface HistoricalGoalBoundFeeRpcEvidence {
  id: number;
  method: 'state_call';
  params: readonly [string, string, string];
  requestedAt: string;
  completedAt?: string;
  httpStatus?: number;
  responseComplete?: boolean;
  responseBytes?: number;
  retainedBytes?: number;
  responseSha256?: string;
  responseBody?: string;
  responseBodyBase64?: string;
  failure?: Reason;
}

/** Injected transport is a test or global pacing seam, never an endpoint-selection option. */
export interface HistoricalGoalBoundFeeReadOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** A terminal failure retains only bounded receipts; callers must not retry another state or amount. */
export class HistoricalGoalBoundFeeReadError extends Error {
  constructor(
    readonly diagnostic: Readonly<{
      stage: 'input' | 'info' | 'details' | 'decode';
      reason: Reason;
      rpcEvidence: readonly Readonly<HistoricalGoalBoundFeeRpcEvidence>[];
      actualCanonicalFinalityVerifiedHere: false;
      transactionSubmitted: false;
    }>
  ) {
    super(`Historical bound fee read failed: ${diagnostic.stage} (${diagnostic.reason})`);
    this.name = 'HistoricalGoalBoundFeeReadError';
  }
}

class ReadFailure extends Error {
  constructor(readonly reason: Reason) {
    super(reason);
  }
}
function requireValue(value: unknown, reason: Reason): asserts value {
  if (!value) throw new ReadFailure(reason);
}
/** Freeze codec-owned JSON recursively; caller objects never reach this helper. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function record(value: unknown, allowed: readonly string[], required = allowed): Record<string, unknown> {
  requireValue(
    value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype,
    'invalid-input'
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  requireValue(
    Reflect.ownKeys(descriptors).every(
      (key) =>
        typeof key === 'string' && allowed.includes(key) && descriptors[key].enumerable && 'value' in descriptors[key]
    ) && required.every((key) => Object.hasOwn(descriptors, key)),
    'invalid-input'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, field]) => [key, field.value]));
}

/**
 * Verify and detach the original archive quote projection before awaiting, then request its exact
 * bound envelope at its unchanged hash. Canonicality/finality remain upstream attestations. Success
 * makes exactly two sequential state_call requests; failure stops without retries or substitutions.
 * Each deadline includes fetch and body consumption (1–30 seconds, default 20). Response prefixes
 * are capped at 64 KiB each / 128 KiB total, with hashes and completeness labels retained.
 */
export async function readHistoricalGoalBoundFee(
  input: HistoricalGoalBoundFeeSource,
  options: HistoricalGoalBoundFeeReadOptions = {}
) {
  const evidence: HistoricalGoalBoundFeeRpcEvidence[] = [];
  let stage: 'input' | 'info' | 'details' | 'decode' = 'input';
  const snapshot = () => Object.freeze(evidence.map((item) => Object.freeze({ ...item })));
  try {
    const settings = record(options, ['fetch', 'signal', 'timeoutMs'], []);
    const transport = (settings.fetch === undefined ? globalThis.fetch : settings.fetch) as typeof fetch;
    const signal = settings.signal as AbortSignal | undefined;
    const timeoutMs = settings.timeoutMs === undefined ? 20_000 : settings.timeoutMs;
    requireValue(typeof transport === 'function', 'invalid-input');
    requireValue(signal === undefined || signal instanceof AbortSignal, 'invalid-input');
    requireValue(
      Number.isSafeInteger(timeoutMs) && (timeoutMs as number) >= 1000 && (timeoutMs as number) <= 30_000,
      'invalid-input'
    );
    const source = prepareHistoricalGoalBoundFeeSource(input);
    const codec = createHistoricalExecutionCodec(source.identity);
    const { bound } = source;
    requireValue(!signal?.aborted, 'aborted');

    const rpc = async (method: (typeof METHODS)[number]) => {
      requireValue(evidence.length < 2, 'invalid-input');
      requireValue(!signal?.aborted, 'aborted');
      const params = Object.freeze([method, bound.feeQueryDataHex, bound.blockHash] as const);
      const item: HistoricalGoalBoundFeeRpcEvidence = {
        id: evidence.length + 1,
        method: 'state_call',
        params,
        requestedAt: new Date().toISOString(),
      };
      evidence.push(item);
      const controller = new AbortController();
      const chunks: Buffer[] = [];
      let received = 0,
        retained = 0;
      let bodyStarted = false,
        bodyComplete = false,
        sealed = false;
      let stopped: Reason | undefined;
      let stream: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let rejectStop: (error: Error) => void = () => undefined;
      const interruption = new Promise<never>((_resolve, reject) => {
        rejectStop = reject;
      });
      const stop = (reason: Reason) => {
        if (sealed || stopped) return;
        stopped = reason;
        controller.abort();
        void stream?.cancel().catch(() => undefined);
        rejectStop(new ReadFailure(reason));
      };
      const check = () => {
        requireValue(!sealed, 'aborted');
        if (stopped) throw new ReadFailure(stopped);
        requireValue(!signal?.aborted, 'aborted');
      };
      const onAbort = () => stop('aborted');
      signal?.addEventListener('abort', onAbort, { once: true });
      const timer = setTimeout(() => stop('timeout'), timeoutMs as number);
      const pending = async () => {
        check();
        const response = await transport(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: item.id, method: item.method, params }),
          redirect: 'error',
          credentials: 'omit',
          signal: controller.signal,
        });
        try {
          check();
          item.httpStatus = response.status;
          requireValue(!response.redirected && (!response.url || response.url === ENDPOINT), 'rpc-failed');
          const length = response.headers.get('content-length');
          requireValue(length === null || (/^\d+$/.test(length) && Number(length) <= RESPONSE_LIMIT), 'response-limit');
          requireValue(response.body, 'rpc-failed');
          stream = response.body.getReader();
        } catch (error) {
          void response.body?.cancel().catch(() => undefined);
          throw error;
        }
        bodyStarted = true;
        let chunkReads = 0;
        try {
          while (true) {
            check();
            requireValue(++chunkReads <= RESPONSE_LIMIT + 1, 'response-limit');
            const chunk = await stream.read();
            check();
            if (chunk.done) {
              bodyComplete = true;
              break;
            }
            received += chunk.value.byteLength;
            const prefix = chunk.value.subarray(0, RESPONSE_LIMIT - retained);
            if (prefix.byteLength) chunks.push(Buffer.from(prefix));
            retained += prefix.byteLength;
            requireValue(received <= RESPONSE_LIMIT, 'response-limit');
          }
        } catch (error) {
          void stream.cancel().catch(() => undefined);
          throw error;
        } finally {
          stream.releaseLock();
        }
        check();
        requireValue(response.status === 200, 'rpc-failed');
        const raw = Buffer.concat(chunks);
        const body = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
        const result = record(JSON.parse(body), ['jsonrpc', 'id', 'result']);
        requireValue(result.jsonrpc === '2.0' && result.id === item.id, 'rpc-failed');
        requireValue(typeof result.result === 'string' && /^0x(?:[0-9a-fA-F]{2})+$/.test(result.result), 'rpc-failed');
        return result.result;
      };
      try {
        return await Promise.race([pending(), interruption]);
      } catch (error) {
        controller.abort();
        item.failure = error instanceof ReadFailure && error.reason !== 'invalid-input' ? error.reason : 'rpc-failed';
        throw new ReadFailure(item.failure);
      } finally {
        sealed = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        if (bodyStarted) {
          const raw = Buffer.concat(chunks);
          item.responseComplete = bodyComplete;
          item.responseBytes = received;
          item.retainedBytes = retained;
          item.responseSha256 = createHash('sha256').update(raw).digest('hex');
          try {
            item.responseBody = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
          } catch {
            item.responseBodyBase64 = raw.toString('base64');
          }
        }
        item.completedAt = new Date().toISOString();
      }
    };

    stage = 'info';
    const infoHex = await rpc(METHODS[0]);
    stage = 'details';
    const detailsHex = await rpc(METHODS[1]);
    stage = 'decode';
    const info = codec.decodeQueryInfo(infoHex);
    const details = assertHistoricalFeeDetailsMatchesQueryInfo(detailsHex, info.partialFeeCodec, '0');
    const query = (index: number, resultHex: string) =>
      Object.freeze({ method: 'state_call' as const, params: evidence[index].params, resultHex });
    const receipt: HistoricalGoalBoundFeeReceipt = Object.freeze({
      version: 1,
      kind: 'historical-goal-bound-fee-receipt',
      envelope: bound,
      feeAssetAddress: HISTORICAL_EXECUTION_XOR,
      queries: Object.freeze({ info: query(0, infoHex), details: query(1, detailsHex) }),
    });
    return Object.freeze({
      receipt,
      info: freeze(info),
      details: Object.freeze({
        ...details,
        inclusionFee: details.inclusionFee ? Object.freeze({ ...details.inclusionFee }) : null,
      }),
      rpcEvidence: snapshot(),
      sourceBinding: Object.freeze({
        ...source.binding,
        blockNumber: source.blockNumber,
        request: source.request,
        state: source.state,
        originalEnvelopeSha256: source.originalEnvelope.envelopeSha256,
      }),
      endpoint: ENDPOINT,
      actualCanonicalFinalityVerifiedHere: false as const,
      feeAdequacyVerified: false as const,
      transactionSubmitted: false as const,
    });
  } catch (error) {
    throw new HistoricalGoalBoundFeeReadError(
      Object.freeze({
        stage,
        reason:
          error instanceof ReadFailure
            ? error.reason
            : stage === 'input'
              ? 'invalid-input'
              : stage === 'decode'
                ? 'fee-mismatch'
                : 'rpc-failed',
        rpcEvidence: snapshot(),
        actualCanonicalFinalityVerifiedHere: false,
        transactionSubmitted: false,
      })
    );
  }
}
