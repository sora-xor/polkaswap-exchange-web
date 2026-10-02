/** Pure prospective request construction. No transport, schedule, wallet or historical evidence projection. */
import { createHash } from 'node:crypto';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
  type HistoricalExecutionIdentity,
} from './historical-execution-codec';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import { createHistoricalGoalFeeCodec } from './historical-goal-fee-codec';
import type { AccumulationRpcReceipt } from './accumulation-evidence-bridge';

const ENDPOINT = 'https://ws.mof.sora.org/' as const;
const UNIT = 10n ** 18n,
  MAX = (1n << 128n) - 1n;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
type Envelope = ReturnType<ReturnType<typeof createHistoricalGoalFeeCodec>['buildBoundSwapEnvelope']>;

/** Exact bytes for a caller-owned bounded recorder; ownership attests construction, never acquisition. */
export interface AccumulationQuoteRequestDescriptor {
  readonly endpoint: typeof ENDPOINT;
  readonly id: number;
  readonly method: 'state_queryStorageAt' | 'liquidityProxy_quote' | 'state_call';
  readonly params: readonly unknown[];
  readonly requestBody: string;
  readonly requestSha256: string;
}
/** Identity/denominator must be independently bound to the original target state by the acquisition owner. */
export interface AccumulationQuoteRequestInput {
  identity: HistoricalExecutionIdentity;
  blockNumber: number;
  denominator: string;
  rpcIdStart: number;
}
/** A retained quote outcome and the next requests only; it is not a fee estimate or admission result. */
export interface AccumulationQuoteFeeRequests {
  readonly status: 'ready' | 'unavailable' | 'failed';
  readonly reason: string | null;
  readonly inputKusd: number;
  readonly quoteReceipt: AccumulationRpcReceipt;
  readonly quote: null | {
    amountOutCodec: string;
    amountWithoutImpactCodec: string;
    poolFeeCodec: string;
    minimumOutputCodec: string;
  };
  readonly envelope: Envelope | null;
  readonly feeRequests: readonly AccumulationQuoteRequestDescriptor[];
  readonly sourceAcquisitionVerified: false;
  readonly transactionSubmitted: false;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`accumulation-quote-requests:${reason}`);
}
function sha(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function fields(value: unknown, keys: readonly string[]): Data {
  check(value && typeof value === 'object' && !Array.isArray(value), 'object');
  const item = value as Data;
  check(Object.keys(item).length === keys.length && keys.every((key) => Object.hasOwn(item, key)), 'fields');
  return item;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  check(Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max, 'integer');
  return Number(value);
}
function amount(value: unknown, positive = true): string {
  check(typeof value === 'string' && /^(0|[1-9]\d{0,38})$/.test(value), 'amount');
  check(BigInt(value) <= MAX && (!positive || BigInt(value) > 0n), 'amount-range');
  return value;
}
/** Reject getters/cycles/non-data before inspecting fields, and detach all caller-owned objects. */
function snapshot(value: unknown): unknown {
  let nodes = 0,
    bytes = 0;
  const active = new Set<object>();
  const copy = (v: unknown, depth: number): unknown => {
    check(++nodes <= 20000 && depth <= 16, 'data-bound');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      bytes += Buffer.byteLength(v);
      check(bytes <= 8 * 1024 * 1024, 'byte-bound');
      return v;
    }
    if (typeof v === 'number') return integer(v);
    check(v && typeof v === 'object' && !active.has(v), 'non-data');
    const ds = Object.getOwnPropertyDescriptors(v),
      ks = Reflect.ownKeys(ds);
    check(
      ks.every((key) => typeof key === 'string' && 'value' in ds[key]),
      'accessor'
    );
    active.add(v);
    let result: unknown;
    if (Array.isArray(v)) {
      check(Object.getPrototypeOf(v) === Array.prototype && v.length <= 1000 && ks.length === v.length + 1, 'array');
      result = Array.from({ length: v.length }, (_, i) => {
        check(ds[i]?.enumerable, 'sparse');
        return copy(ds[i].value, depth + 1);
      });
    } else {
      check(
        Object.getPrototypeOf(v) === Object.prototype && ks.every((key) => ds[key as string].enumerable),
        'plain-data'
      );
      result = Object.fromEntries(ks.map((key) => [key, copy(ds[key as string].value, depth + 1)]));
    }
    active.delete(v);
    return result;
  };
  return copy(value, 0);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** Same strict JSON-number/duplicate-key precheck as the sealed bridge, bounded for one RPC response. */
function parseResponse(text: string): unknown {
  let at = 0,
    nodes = 0;
  const whitespace = () => {
    while (/[\t\r\n ]/.test(text[at] ?? '_')) at++;
  };
  const string = () => {
    const token = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
    token.lastIndex = at;
    const found = token.exec(text);
    check(found, 'json-string');
    at = token.lastIndex;
    return JSON.parse(found[0]) as string;
  };
  const value = (depth: number): void => {
    check(++nodes <= 20000 && depth <= 16, 'json-bound');
    whitespace();
    const first = text[at];
    if (first === '"') {
      string();
      return;
    }
    if (first === '{' || first === '[') {
      const end = first === '{' ? '}' : ']';
      at++;
      whitespace();
      if (text[at] === end) {
        at++;
        return;
      }
      const keys = new Set<string>();
      while (true) {
        whitespace();
        if (first === '{') {
          const key = string();
          check(!keys.has(key), 'duplicate-json-key');
          keys.add(key);
          whitespace();
          check(text[at++] === ':', 'json-colon');
        }
        value(depth + 1);
        whitespace();
        if (text[at] === end) {
          at++;
          return;
        }
        check(text[at++] === ',', 'json-separator');
      }
    }
    const token = /(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
    token.lastIndex = at;
    const found = token.exec(text);
    check(found, 'json-value');
    at = token.lastIndex;
    if (/^[-\d]/.test(found[0]))
      check(/^-?(?:0|[1-9]\d*)$/.test(found[0]) && Number.isSafeInteger(Number(found[0])), 'json-number');
  };
  value(0);
  whitespace();
  check(at === text.length, 'json-trailing');
  return JSON.parse(text);
}
function descriptor(
  id: number,
  method: AccumulationQuoteRequestDescriptor['method'],
  params: unknown[]
): AccumulationQuoteRequestDescriptor {
  const detached = snapshot(params) as unknown[];
  const requestBody = JSON.stringify({ jsonrpc: '2.0', id, method, params: detached });
  const result = freeze({
    endpoint: ENDPOINT,
    id,
    method,
    params: detached,
    requestBody,
    requestSha256: sha(requestBody),
  });
  owned.add(result);
  return result;
}
/** Cloning/serializing a descriptor deliberately loses in-process construction provenance. */
export function isAccumulationQuoteRequestDescriptor(value: unknown): value is AccumulationQuoteRequestDescriptor {
  return !!value && typeof value === 'object' && owned.has(value);
}

/**
 * Reserve 28 RPC IDs: one original seven-key request, then quote/info/details for each 1..9 KUSD lot.
 * Lots assume the fixed 18-decimal profile; actual asset records must be checked by the context decoder.
 * Denominator is retained, never applied to KUSD lot encoding.
 * This creates requests only. No source registration, state authenticity or acquisition permission is inferred.
 */
export function createAccumulationQuoteRequests(value: AccumulationQuoteRequestInput) {
  const input = fields(snapshot(value), ['identity', 'blockNumber', 'denominator', 'rpcIdStart']);
  const blockNumber = integer(input.blockNumber, 1, 0xffffffff);
  const denominator = amount(input.denominator);
  const start = integer(input.rpcIdStart, 1, Number.MAX_SAFE_INTEGER - 27);
  const pool = createHistoricalExecutionPoolCodec(input.identity);
  const fee = createHistoricalGoalFeeCodec(input.identity);
  const binding = freeze({
    ...fee.binding,
    blockNumber,
    denominator,
    expectedTokenDecimals: 18,
    feePolicySha256: fee.policySha256,
  });
  const storageKeys = freeze({ ...pool.storageKeys() });
  check(
    Object.keys(storageKeys).join(',') === 'timestamp,denominator,kusd,xor,dex0,properties,reserves',
    'storage-key-order'
  );
  const contextRequest = descriptor(start, 'state_queryStorageAt', [Object.values(storageKeys), binding.blockHash]);
  const candidates = freeze(
    Array.from({ length: 9 }, (_, i) => {
      const amountInCodec = String(BigInt(i + 1) * UNIT);
      return {
        inputKusd: i + 1,
        amountInCodec,
        quoteRequest: descriptor(start + 1 + i * 3, 'liquidityProxy_quote', [
          0,
          KUSD,
          XOR,
          amountInCodec,
          'WithDesiredInput',
          ['XYKPool'],
          'AllowSelected',
          binding.blockHash,
        ]),
      };
    })
  );
  const feeRequestsForQuote = (
    inputKusd: number,
    originalReceipt: AccumulationRpcReceipt
  ): AccumulationQuoteFeeRequests => {
    const candidate = candidates[integer(inputKusd, 1, 9) - 1];
    const r = fields(snapshot(originalReceipt), [
      'endpoint',
      'requestBody',
      'responseBody',
      'responseSha256',
      'requestedAtMs',
      'completedAtMs',
      'httpStatus',
      'failure',
    ]);
    const quoteReceipt = r as unknown as AccumulationRpcReceipt;
    const result = (
      status: AccumulationQuoteFeeRequests['status'],
      reason: string | null,
      quote: AccumulationQuoteFeeRequests['quote'] = null,
      envelope: Envelope | null = null,
      feeRequests: AccumulationQuoteRequestDescriptor[] = []
    ): AccumulationQuoteFeeRequests =>
      freeze({
        status,
        reason,
        inputKusd,
        quoteReceipt,
        quote,
        envelope,
        feeRequests,
        sourceAcquisitionVerified: false,
        transactionSubmitted: false,
      });
    try {
      check(r.endpoint === ENDPOINT && r.requestBody === candidate.quoteRequest.requestBody, 'quote-request-binding');
      const requested = integer(r.requestedAtMs),
        completed = integer(r.completedAtMs);
      check(completed >= requested && completed - requested <= 30000, 'receipt-clock');
      check(r.failure === null && r.httpStatus === 200, 'quote-transport-failure');
      check(
        typeof r.responseBody === 'string' &&
          Buffer.byteLength(r.responseBody) <= 2 * 1024 * 1024 &&
          r.responseSha256 === sha(r.responseBody),
        'quote-response-digest'
      );
      const response = fields(parseResponse(r.responseBody), ['jsonrpc', 'id', 'result']);
      check(response.jsonrpc === '2.0' && response.id === candidate.quoteRequest.id, 'quote-response-binding');
      if (response.result === null) return result('unavailable', 'quote-unavailable');
      check(response.result && typeof response.result === 'object' && !Array.isArray(response.result), 'quote-object');
      const raw = response.result as Data;
      const amountOutCodec = amount(raw.amount),
        amountWithoutImpactCodec = amount(raw.amount_without_impact);
      check(BigInt(amountWithoutImpactCodec) >= BigInt(amountOutCodec), 'quote-impact');
      check(
        Array.isArray(raw.route) && raw.route.length === 2 && raw.route[0] === KUSD && raw.route[1] === XOR,
        'quote-route'
      );
      const poolFees = fields(raw.fee, [XOR]),
        poolFeeCodec = amount(poolFees[XOR], false);
      const envelope = fee.buildBoundSwapEnvelope(
        { assetIn: KUSD, assetOut: XOR, amountInCodec: candidate.amountInCodec, quotedAmountOutCodec: amountOutCodec },
        { blockNumber }
      );
      return result(
        'ready',
        null,
        { amountOutCodec, amountWithoutImpactCodec, poolFeeCodec, minimumOutputCodec: envelope.minimumCodec },
        envelope,
        [
          descriptor(candidate.quoteRequest.id + 1, 'state_call', [
            'TransactionPaymentApi_query_info',
            envelope.feeQueryDataHex,
            binding.blockHash,
          ]),
          descriptor(candidate.quoteRequest.id + 2, 'state_call', [
            'TransactionPaymentApi_query_fee_details',
            envelope.feeQueryDataHex,
            binding.blockHash,
          ]),
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const reason = /^accumulation-quote-requests:[a-z-]{1,64}$/.test(message)
        ? message.split(':')[1]
        : 'invalid-quote-evidence';
      return result('failed', reason);
    }
  };
  return Object.freeze({ binding, storageKeys, contextRequest, candidates, feeRequestsForQuote });
}
