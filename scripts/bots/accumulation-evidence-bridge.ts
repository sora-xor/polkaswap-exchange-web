/** Offline reconstruction of nine native quotes under externally trusted receipt/source bindings.
 * No transport, policy invocation, wallet, consensus proof or observed historical-arrival claim.
 */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import { createHistoricalGoalFeeCodec } from './historical-goal-fee-codec';
import {
  parseIndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryRow,
} from '../../src/features/bot-trading/pool-history';
import type { BotDefinition } from '../../src/features/bot-trading/types';

const HOUR = 3_600_000,
  UNIT = 10n ** 18n,
  MAX = (1n << 128n) - 1n;
const SHA = /^[0-9a-f]{64}$/,
  HASH = /^0x[0-9a-f]{64}$/;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
export interface AccumulationRatio {
  numerator: string;
  denominator: string;
}
/** These pins must come from a trusted immutable acquisition manifest, never from packet claims. */
export interface AccumulationTrustedSource {
  packetSha256: string;
  sourceRegistrationSha256: string;
  endpoint: 'https://ws.mof.sora.org/';
  finalizedSource: { hash: string; height: number };
  metadataSha256: string;
  codeHash: string;
  runtimeVersion: { specVersion: number; transactionVersion: number };
  denominator: string;
  /** Existing parser rederives the price; this independent binding establishes publication provenance. */
  completedClose?: { timestampMs: number; availableAtMs: number; rawRowsSha256: string; sourceReceiptSha256: string };
}
/** Original bytes and transport clock; modeled historical arrival clocks are separate packet fields. */
export interface AccumulationRpcReceipt {
  endpoint: string;
  requestBody: string;
  responseBody: string | null;
  responseSha256: string | null;
  requestedAtMs: number;
  completedAtMs: number;
  httpStatus: number | null;
  failure: string | null;
}
export interface AccumulationCandidate {
  inputKusd: number;
  status: 'ready' | 'unavailable' | 'failed' | 'rejected-impact';
  reason: string | null;
  evidenceSha256: string[];
  quote: null | {
    quotedOutputXorCodec: string;
    minimumOutputXorCodec: string;
    networkFeeXorCodec: string;
    priceImpact: AccumulationRatio;
    quoteReceivedAtMs: number;
    feeReceivedAtMs: number;
    expiresAtMs: number;
  };
}
export interface AccumulationVerifiedPacket {
  status: 'verified' | 'incomplete';
  packetSha256: string;
  genesisHash: string;
  denominator: string;
  block: { hash: string; height: number; timestampMs: number };
  contextReceivedAtMs: number;
  decisionAtMs: number;
  currentPrice: AccumulationRatio;
  latestCompletedClose: null | {
    timestampMs: number;
    availableAtMs: number;
    price: AccumulationRatio;
    evidenceSha256: string;
  };
  candidates: AccumulationCandidate[];
}
export interface AccumulationBridgeResult {
  kind: 'accumulation-evidence-bridge-v1';
  packet: AccumulationVerifiedPacket;
  sourceRegistrationSha256: string;
  diagnostics: string[];
  /** Original packet is detached/frozen, including failed outcomes; never replace with replay-created receipts. */
  retainedEvidence: unknown;
  independentConsensusVerified: false;
  historicalBrowserArrivalVerified: false;
  actualPaidFeeVerified: false;
}
/** Failed semantic authentication retains detached evidence; callers must journal this failure. */
export class AccumulationEvidenceError extends Error {
  constructor(
    readonly reason: string,
    readonly retainedEvidence: unknown
  ) {
    super(`accumulation-evidence:${reason}`);
  }
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason);
}
function object(value: unknown): Data {
  check(
    value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype,
    'object'
  );
  return value as Data;
}
function fields(value: unknown, keys: string[]): Data {
  const item = object(value);
  check(Object.keys(item).length === keys.length && keys.every((k) => Object.hasOwn(item, k)), 'unexpected-fields');
  return item;
}
function integer(value: unknown, minimum = 0): number {
  check(Number.isSafeInteger(value) && Number(value) >= minimum, 'integer');
  return Number(value);
}
function hash(value: unknown): string {
  check(typeof value === 'string' && HASH.test(value), 'hash');
  return value;
}
function digest(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
/** Canonical representation for the externally pinned packet; never establishes source authority by itself. */
export function accumulationEvidenceDigest(value: unknown): string {
  return digest(canonical(snapshot(value)));
}
function canonical(value: unknown): string {
  return Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((value as Data)[k])}`)
          .join(',')}}`
      : JSON.stringify(value);
}
function snapshot(value: unknown): unknown {
  let nodes = 0,
    bytes = 0;
  const active = new Set<object>();
  const copy = (v: unknown, depth: number): unknown => {
    check(++nodes <= 50000 && depth <= 24, 'evidence-bound');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      bytes += Buffer.byteLength(v);
      check(bytes <= 32 * 1024 * 1024, 'evidence-bytes');
      return v;
    }
    if (typeof v === 'number') {
      integer(v);
      return v;
    }
    check(v && typeof v === 'object' && !active.has(v), 'non-data');
    const ds = Object.getOwnPropertyDescriptors(v),
      ks = Reflect.ownKeys(ds);
    check(
      ks.every((k) => typeof k === 'string' && 'value' in ds[k]),
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
        Object.getPrototypeOf(v) === Object.prototype && ks.every((k) => ds[k as string].enumerable),
        'plain-object'
      );
      result = Object.fromEntries(ks.map((k) => [k, copy(ds[k as string].value, depth + 1)]));
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
function equal(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}
/** Bounded precheck rejects duplicate decoded keys, deep structures and non-exact JSON numbers. */
function parseJson(text: string): unknown {
  let at = 0,
    nodes = 0;
  const whitespace = () => {
    while (/[\t\r\n ]/.test(text[at] ?? '_')) at++;
  };
  const string = () => {
    const token = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
    token.lastIndex = at;
    const found = token.exec(text);
    check(found, 'invalid-json-string');
    at = token.lastIndex;
    return JSON.parse(found[0]) as string;
  };
  const value = (depth: number): void => {
    check(++nodes <= 50000 && depth <= 24, 'json-bound');
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
          check(text[at++] === ':', 'invalid-json-colon');
        }
        value(depth + 1);
        whitespace();
        if (text[at] === end) {
          at++;
          return;
        }
        check(text[at++] === ',', 'invalid-json-separator');
      }
    }
    const token = /(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
    token.lastIndex = at;
    const found = token.exec(text);
    check(found, 'invalid-json-value');
    at = token.lastIndex;
    if (/^[-\d]/.test(found[0]))
      check(/^-?(?:0|[1-9]\d*)$/.test(found[0]) && Number.isSafeInteger(Number(found[0])), 'inexact-json-number');
  };
  value(0);
  whitespace();
  check(at === text.length, 'trailing-json-data');
  return JSON.parse(text);
}

function failureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[a-zA-Z0-9_-]{1,96}$/.test(message) ? message : 'invalid-candidate-evidence';
}
function amount(value: unknown, positive = true): bigint {
  check(typeof value === 'string' && /^(0|[1-9]\d{0,38})$/.test(value), 'amount');
  const n = BigInt(value);
  check(n <= MAX && (!positive || n > 0n), 'amount-range');
  return n;
}
function ratio(n: bigint, d: bigint): AccumulationRatio {
  check(n >= 0n && d > 0n, 'ratio');
  let a = n,
    b = d;
  while (b) [a, b] = [b, a % b];
  return { numerator: String(n / a), denominator: String(d / a) };
}
function decimalRatio(value: string): AccumulationRatio {
  check(/^\d+(?:\.\d+)?$/.test(value), 'decimal');
  const [whole, fraction = ''] = value.split('.');
  return ratio(BigInt(whole + fraction), 10n ** BigInt(fraction.length));
}
function header(value: unknown) {
  const row = fields(value, ['number', 'parentHash', 'stateRoot', 'extrinsicsRoot', 'digest']);
  check(typeof row.number === 'string' && /^0x[0-9a-f]+$/.test(row.number), 'header-number');
  hash(row.stateRoot);
  hash(row.extrinsicsRoot);
  object(row.digest);
  return { height: integer(Number(BigInt(row.number)), 1), parentHash: hash(row.parentHash) };
}
/** Match exact requested methods/parameters, original RPC IDs, transport bytes and receipt ordering. */
function cursor(value: unknown, endpoint: string) {
  check(Array.isArray(value) && value.length <= 32, 'rpc-count');
  let index = 0,
    lastCompleted = 0;
  const ids = new Set<number>();
  const hashes: string[] = [];
  return {
    take(method: string, params: unknown[]): unknown {
      const receipt = fields(value[index++], [
        'endpoint',
        'requestBody',
        'responseBody',
        'responseSha256',
        'requestedAtMs',
        'completedAtMs',
        'httpStatus',
        'failure',
      ]);
      check(
        receipt.endpoint === endpoint &&
          typeof receipt.requestBody === 'string' &&
          Buffer.byteLength(receipt.requestBody) <= 128 * 1024,
        'rpc-request'
      );
      const request = fields(parseJson(receipt.requestBody), ['jsonrpc', 'id', 'method', 'params']);
      const id = integer(request.id, 1);
      check(!ids.has(id), 'duplicate-rpc-id');
      ids.add(id);
      check(
        request.jsonrpc === '2.0' && request.method === method && equal(request.params, params),
        'rpc-request-binding'
      );
      const start = integer(receipt.requestedAtMs),
        end = integer(receipt.completedAtMs);
      check(start >= lastCompleted && end >= start && end - start <= 30000, 'rpc-transport-clock');
      lastCompleted = end;
      hashes.push(digest(canonical(receipt)));
      check(
        receipt.failure === null &&
          receipt.httpStatus === 200 &&
          typeof receipt.responseBody === 'string' &&
          Buffer.byteLength(receipt.responseBody) <= 2 * 1024 * 1024 &&
          digest(receipt.responseBody) === receipt.responseSha256,
        'rpc-response-failed-or-digest'
      );
      const response = object(parseJson(receipt.responseBody));
      check(
        response.jsonrpc === '2.0' &&
          response.id === id &&
          Object.keys(response).length === 3 &&
          Object.hasOwn(response, 'result') &&
          !Object.hasOwn(response, 'error'),
        'rpc-error-or-shape'
      );
      return response.result;
    },
    done() {
      check(index === value.length, 'unconsumed-rpc');
    },
    hashes,
  };
}
/** Same-process ownership is required for invocation; copying JSON/hashes does not preserve it. */
export function isVerifiedAccumulationDecisionPacket(value: unknown): value is AccumulationBridgeResult {
  return (
    !!value &&
    typeof value === 'object' &&
    owned.has(value) &&
    (value as AccumulationBridgeResult).packet.status === 'verified'
  );
}

/** Reconstruct all native values from raw RPC evidence, never claimed quote/pool projections.
 * trustedInput must be supplied by the registered evidence owner, independently of rawInput.
 * Completion proves internal consistency under that source, not consensus or historical receipt truth.
 */
export function verifyAccumulationDecisionPacket(
  rawInput: unknown,
  trustedInput: AccumulationTrustedSource
): AccumulationBridgeResult {
  let retained: unknown = null;
  try {
    retained = freeze(snapshot(rawInput));
    const input = fields(retained, [
      'block',
      'contextReceivedAtMs',
      'decisionAtMs',
      'contextRpc',
      'closeRowsJson',
      'candidates',
    ]);
    const trustedCopy = object(snapshot(trustedInput));
    fields(trustedCopy, [
      'packetSha256',
      'sourceRegistrationSha256',
      'endpoint',
      'finalizedSource',
      'metadataSha256',
      'codeHash',
      'runtimeVersion',
      'denominator',
      ...(Object.hasOwn(trustedCopy, 'completedClose') ? ['completedClose'] : []),
    ]);
    const trusted = trustedCopy as unknown as AccumulationTrustedSource;
    for (const pin of [trusted.packetSha256, trusted.sourceRegistrationSha256, trusted.metadataSha256])
      check(typeof pin === 'string' && SHA.test(pin), 'trusted-pin');
    check(
      digest(canonical(retained)) === trusted.packetSha256 && trusted.endpoint === 'https://ws.mof.sora.org/',
      'trusted-packet-or-source'
    );
    const block = fields(input.block, ['hash', 'height']),
      blockHash = hash(block.hash),
      height = integer(block.height, 1);
    const finalized = trusted.finalizedSource;
    fields(finalized, ['hash', 'height']);
    fields(trusted.runtimeVersion, ['specVersion', 'transactionVersion']);
    check(height <= integer(finalized.height, 1), 'height-after-trusted-finality');
    hash(finalized.hash);
    hash(trusted.codeHash);
    amount(trusted.denominator);
    const rpc = cursor(input.contextRpc, trusted.endpoint);
    check(rpc.take('chain_getBlockHash', [0]) === GENESIS, 'genesis');
    check(rpc.take('chain_getBlockHash', [finalized.height]) === finalized.hash, 'finalized-anchor');
    const finalHash = hash(rpc.take('chain_getFinalizedHead', []));
    check(header(rpc.take('chain_getHeader', [finalHash])).height >= finalized.height, 'finalized-head');
    check(header(rpc.take('chain_getHeader', [finalized.hash])).height === finalized.height, 'finalized-header');
    check(rpc.take('chain_getBlockHash', [height]) === blockHash, 'canonical-state');
    const at = header(rpc.take('chain_getHeader', [blockHash]));
    check(at.height === height, 'state-height');
    check(rpc.take('chain_getBlockHash', [height - 1]) === at.parentHash, 'canonical-parent');
    check(header(rpc.take('chain_getHeader', [at.parentHash])).height === height - 1, 'parent-height');
    const version = object(rpc.take('state_getRuntimeVersion', [blockHash]));
    check(
      equal(version, rpc.take('state_getRuntimeVersion', [at.parentHash])) &&
        version.specName === 'sora-substrate' &&
        version.specVersion === trusted.runtimeVersion.specVersion &&
        version.transactionVersion === trusted.runtimeVersion.transactionVersion,
      'runtime-binding'
    );
    const metadata = rpc.take('state_getMetadata', [blockHash]);
    check(
      typeof metadata === 'string' &&
        /^0x(?:[0-9a-f]{2})+$/.test(metadata) &&
        digest(Buffer.from(metadata.slice(2), 'hex')) === trusted.metadataSha256 &&
        metadata === rpc.take('state_getMetadata', [at.parentHash]),
      'metadata-binding'
    );
    check(rpc.take('state_getStorageHash', ['0x3a636f6465', blockHash]) === trusted.codeHash, 'runtime-code');
    const identity = { genesisHash: GENESIS, blockHash, metadataHex: metadata, runtimeVersion: trusted.runtimeVersion };
    const pool = createHistoricalExecutionPoolCodec(identity),
      native = createHistoricalExecutionCodec(identity),
      feeCodec = createHistoricalGoalFeeCodec(identity);
    const keys = pool.storageKeys(),
      rawStorage = rpc.take('state_queryStorageAt', [Object.values(keys), blockHash]);
    check(Array.isArray(rawStorage) && rawStorage.length === 1, 'storage-set-count');
    const storage = fields(rawStorage[0], ['block', 'changes']);
    check(
      storage.block === blockHash && Array.isArray(storage.changes) && storage.changes.length === 7,
      'storage-state'
    );
    const values = new Map<string, unknown>();
    for (const change of storage.changes) {
      check(
        Array.isArray(change) &&
          change.length === 2 &&
          Object.values(keys).includes(change[0]) &&
          !values.has(change[0]),
        'storage-key'
      );
      values.set(change[0], change[1]);
    }
    const decoded = pool.decodeStorage(Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, values.get(v)])));
    rpc.done();
    check(
      decoded.status === 'present' && decoded.state.denominator === trusted.denominator,
      'native-pool-or-denomination'
    );
    const timestampMs = decoded.state.timestampMs,
      contextReceivedAtMs = integer(input.contextReceivedAtMs),
      decisionAtMs = integer(input.decisionAtMs);
    check(timestampMs <= contextReceivedAtMs && contextReceivedAtMs <= decisionAtMs, 'context-causality');
    const diagnostics: string[] = [];
    if (decisionAtMs - contextReceivedAtMs >= 5000 || decisionAtMs - timestampMs > 60000)
      diagnostics.push('stale-context-or-block');
    let latestCompletedClose: AccumulationVerifiedPacket['latestCompletedClose'] = null;
    if (!trusted.completedClose) diagnostics.push('trusted-completed-close-binding-required');
    else {
      const close = trusted.completedClose;
      fields(close, ['timestampMs', 'availableAtMs', 'rawRowsSha256', 'sourceReceiptSha256']);
      check(
        typeof input.closeRowsJson === 'string' &&
          digest(input.closeRowsJson) === close.rawRowsSha256 &&
          typeof close.sourceReceiptSha256 === 'string' &&
          SHA.test(close.sourceReceiptSha256) &&
          close.timestampMs === Math.floor(decisionAtMs / HOUR) * HOUR &&
          integer(close.availableAtMs) >= close.timestampMs &&
          close.availableAtMs <= decisionAtMs,
        'completed-close-binding-or-availability'
      );
      const rows = fields(parseJson(input.closeRowsJson), [KUSD, XOR]);
      const bot = {
        assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
        assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
        policy: { feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 } },
      } as BotDefinition;
      const parsed = parseIndexedPoolHistoryWithEvidence(
        new Map([
          [KUSD, rows[KUSD] as IndexedPoolHistoryRow[]],
          [XOR, rows[XOR] as IndexedPoolHistoryRow[]],
        ]),
        bot,
        {
          startAt: close.timestampMs - HOUR,
          endAt: close.timestampMs,
          genesisHash: GENESIS,
          denominator: trusted.denominator,
        }
      );
      check(
        parsed.history.missing === 0 && parsed.history.candles.length === 1 && parsed.boundaries.length === 1,
        'completed-close-proof'
      );
      const boundary = parsed.boundaries[0];
      check(
        boundary.successor.height <= height &&
          boundary.successor.timestampSeconds * 1000 <= timestampMs &&
          close.availableAtMs >= boundary.successor.timestampSeconds * 1000 + 999,
        'completed-close-after-state-or-publication'
      );
      if (boundary.successor.height === height)
        check(
          boundary.successor.hash === blockHash &&
            boundary.closing.hash === at.parentHash &&
            Math.floor(timestampMs / 1000) === boundary.successor.timestampSeconds,
          'completed-close-current-identity'
        );
      else
        check(
          boundary.successor.hash !== blockHash && boundary.closing.hash !== blockHash,
          'completed-close-hash-reuse'
        );
      latestCompletedClose = {
        timestampMs: close.timestampMs,
        availableAtMs: close.availableAtMs,
        price: decimalRatio(parsed.history.candles[0].close),
        evidenceSha256: digest(
          canonical({ rawRowsSha256: close.rawRowsSha256, sourceReceiptSha256: close.sourceReceiptSha256, boundary })
        ),
      };
    }
    check(Array.isArray(input.candidates) && input.candidates.length === 9, 'nine-candidates-required');
    const candidates: AccumulationCandidate[] = input.candidates.map((raw, index) => {
      const row = fields(raw, ['inputKusd', 'quoteReceivedAtMs', 'feeReceivedAtMs', 'expiresAtMs', 'rpc']);
      check(row.inputKusd === index + 1, 'canonical-nine-size-order');
      const evidenceSha256 = [digest(canonical(row))];
      const candidate: AccumulationCandidate = {
        inputKusd: index + 1,
        status: 'failed',
        reason: null,
        evidenceSha256,
        quote: null,
      };
      try {
        const quoteReceivedAtMs = integer(row.quoteReceivedAtMs),
          feeReceivedAtMs = integer(row.feeReceivedAtMs),
          expiresAtMs = integer(row.expiresAtMs);
        check(
          contextReceivedAtMs <= quoteReceivedAtMs &&
            quoteReceivedAtMs <= feeReceivedAtMs &&
            feeReceivedAtMs <= decisionAtMs &&
            decisionAtMs - quoteReceivedAtMs < 5000 &&
            decisionAtMs < expiresAtMs,
          'quote-fee-clock-or-expiry'
        );
        const calls = cursor(row.rpc, trusted.endpoint),
          inputCodec = String(BigInt(index + 1) * UNIT);
        const quoted = calls.take('liquidityProxy_quote', [
          0,
          KUSD,
          XOR,
          inputCodec,
          'WithDesiredInput',
          ['XYKPool'],
          'AllowSelected',
          blockHash,
        ]);
        if (quoted === null) {
          calls.done();
          candidate.status = 'unavailable';
          candidate.reason = 'native-null-route';
          return candidate;
        }
        const q = object(quoted),
          output = amount(q.amount),
          without = amount(q.amount_without_impact),
          poolFees = fields(q.fee, [XOR]);
        check(without >= output && equal(q.route, [KUSD, XOR]), 'native-quote-route-or-impact');
        amount(poolFees[XOR], false);
        const envelope = feeCodec.buildBoundSwapEnvelope(
          { assetIn: KUSD, assetOut: XOR, amountInCodec: inputCodec, quotedAmountOutCodec: String(output) },
          { blockNumber: height }
        );
        const info = native.decodeQueryInfo(
          calls.take('state_call', ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, blockHash])
        );
        const details = assertHistoricalFeeDetailsMatchesQueryInfo(
          calls.take('state_call', ['TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex, blockHash]),
          info.partialFeeCodec,
          '0'
        );
        calls.done();
        check(
          envelope.minimumCodec === String((output * 9950n) / 10000n) && details.finalFee === info.partialFeeCodec,
          'minimum-or-fee-binding'
        );
        candidate.status = (without - output) * 100n > without ? 'rejected-impact' : 'ready';
        candidate.reason = candidate.status === 'ready' ? null : 'price-impact-exceeded';
        candidate.quote = {
          quotedOutputXorCodec: String(output),
          minimumOutputXorCodec: envelope.minimumCodec,
          networkFeeXorCodec: details.finalFee,
          priceImpact: ratio(without - output, without),
          quoteReceivedAtMs,
          feeReceivedAtMs,
          expiresAtMs,
        };
        candidate.evidenceSha256.push(...calls.hashes);
        return candidate;
      } catch (error) {
        candidate.reason = failureCode(error);
        return candidate;
      }
    });
    if (candidates.some((row) => row.status === 'failed')) diagnostics.push('candidate-evidence-incomplete');
    const result: AccumulationBridgeResult = freeze({
      kind: 'accumulation-evidence-bridge-v1',
      sourceRegistrationSha256: trusted.sourceRegistrationSha256,
      packet: {
        status: diagnostics.length ? 'incomplete' : 'verified',
        packetSha256: trusted.packetSha256,
        genesisHash: GENESIS,
        denominator: trusted.denominator,
        block: { hash: blockHash, height, timestampMs },
        contextReceivedAtMs,
        decisionAtMs,
        currentPrice: ratio(BigInt(decoded.reserves.kusdCodec), BigInt(decoded.reserves.xorCodec)),
        latestCompletedClose,
        candidates,
      },
      diagnostics,
      retainedEvidence: retained,
      independentConsensusVerified: false,
      historicalBrowserArrivalVerified: false,
      actualPaidFeeVerified: false,
    });
    if (result.packet.status === 'verified') owned.add(result);
    return result;
  } catch (error) {
    throw new AccumulationEvidenceError(error instanceof Error ? error.message : 'invalid-evidence', retained);
  }
}
