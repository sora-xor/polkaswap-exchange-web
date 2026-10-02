/** Offline native KUSD/XOR mark reconstruction under independently registered source and timing pins.
 * No acquisition, policy, fee estimate, fill, consensus proof or historical browser-arrival claim.
 */
import { createHash } from 'node:crypto';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { xxhashAsHex } from '@polkadot/util-crypto';
import { HISTORICAL_EXECUTION_GENESIS as GENESIS } from './historical-execution-codec';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import type { AccumulationRpcReceipt } from './accumulation-evidence-bridge';

const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ID = /^[a-zA-Z0-9_-]{1,96}$/;
const DAY = 86400000;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
export interface AccumulationNativeMarkRatio {
  numerator: string;
  denominator: string;
}
export interface AccumulationReplayMark {
  blockHash: string;
  blockNumber: number;
  observedAtMs: number;
  receivedAtMs: number;
  price: AccumulationNativeMarkRatio;
}
export interface AccumulationNativeMarkEvidence {
  kind: 'accumulation-native-mark-evidence-v1';
  target: { hash: string; height: number };
  contextRpc: AccumulationRpcReceipt[];
  boundaryRpc: AccumulationRpcReceipt[] | null;
}
/** Supplied independently by a trusted registered owner; hashes inside raw evidence grant no authority. */
export interface AccumulationNativeMarkTrustedSource {
  rawSha256: string;
  sourceRegistrationSha256: string;
  endpoint: 'https://ws.mof.sora.org/';
  finalizedSource: { hash: string; height: number };
  boundaryFinalizedSource: { hash: string; height: number } | null;
  runtime: { specVersion: number; transactionVersion: number; metadataSha256: string; codeHash: string };
  denominator: string;
}
/** Original receipt and retrospective confirmation are separate clocks. Model clocks are assumptions. */
export interface AccumulationNativeMarkSlot {
  episodeId: string;
  slotId: string;
  role: 'opening' | 'risk' | 'terminal';
  openingAtMs: number;
  deadlineMs: number;
  controlAtMs: number;
  timing: {
    mode: 'observed-receipts' | 'historical-modeled';
    registrationSha256: string;
    scenarioId: string | null;
    contextReceivedAtMs: number;
    boundaryConfirmedAtMs: number | null;
    receiptBindingSha256: string;
  };
}
export interface AccumulationNativeMarkResult {
  kind: 'accumulation-native-mark-result-v1';
  status: 'verified';
  mark: AccumulationReplayMark;
  reserves: { xorCodec: string; kusdCodec: string };
  reserveRatio: AccumulationNativeMarkRatio;
  source: AccumulationNativeMarkTrustedSource;
  registeredSlot: AccumulationNativeMarkSlot;
  registeredSlotSha256: string;
  boundary: null | { hash: string; height: number; timestampMs: number; confirmedAtMs: number };
  timingMode: AccumulationNativeMarkSlot['timing']['mode'];
  retainedEvidence: unknown;
  independentConsensusVerified: false;
  historicalBrowserArrivalVerified: false;
  actualPaidFeeVerified: false;
  scheduleCompletenessVerified: false;
  selectionVerified: false;
  qualificationAuthority: false;
  financialActions: false;
}
/** An unusable/incomplete mark retains the detached original evidence and grants no ownership. */
export class AccumulationNativeMarkError extends Error {
  readonly status = 'incomplete' as const;
  constructor(
    readonly reason: string,
    readonly retainedEvidence: unknown
  ) {
    super(`accumulation-native-mark:${reason}`);
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
/** Canonical representation for the externally pinned mark evidence; never establishes source authority by itself. */
export function accumulationNativeMarkDigest(value: unknown): string {
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
      check(bytes <= 16 * 1024 * 1024, 'evidence-bytes');
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

function sha(value: unknown): string {
  check(typeof value === 'string' && SHA.test(value), 'sha256');
  return value;
}
function header(value: unknown) {
  const row = fields(value, ['number', 'parentHash', 'stateRoot', 'extrinsicsRoot', 'digest']);
  check(typeof row.number === 'string' && /^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(row.number), 'header-number');
  hash(row.stateRoot);
  hash(row.extrinsicsRoot);
  const logs = fields(row.digest, ['logs']).logs;
  check(
    Array.isArray(logs) &&
      logs.length <= 64 &&
      logs.every((v) => typeof v === 'string' && /^0x(?:[0-9a-f]{2})*$/.test(v)),
    'header-digest'
  );
  return { height: integer(Number(BigInt(row.number)), 1), parentHash: hash(row.parentHash) };
}
/** Ordered, bounded transcripts have no retry/fallback or unconsumed-record allowance. */
function cursor(value: unknown, endpoint: string) {
  check(Array.isArray(value) && value.length > 0 && value.length <= 20, 'rpc-count');
  let index = 0,
    lastCompleted = 0,
    firstRequested = 0;
  const ids = new Set<number>();
  return {
    take(method: string, params: unknown[]): unknown {
      const r = fields(value[index++], [
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
        r.endpoint === endpoint && typeof r.requestBody === 'string' && Buffer.byteLength(r.requestBody) <= 128 * 1024,
        'rpc-request'
      );
      const request = fields(parseJson(r.requestBody), ['jsonrpc', 'id', 'method', 'params']);
      const id = integer(request.id, 1);
      check(!ids.has(id), 'duplicate-rpc-id');
      ids.add(id);
      check(
        request.jsonrpc === '2.0' && request.method === method && equal(request.params, params),
        'rpc-request-binding'
      );
      const start = integer(r.requestedAtMs),
        end = integer(r.completedAtMs);
      check(start >= lastCompleted && end >= start && end - start <= 30000, 'rpc-transport-clock');
      if (index === 1) firstRequested = start;
      lastCompleted = end;
      check(
        r.failure === null &&
          r.httpStatus === 200 &&
          typeof r.responseBody === 'string' &&
          Buffer.byteLength(r.responseBody) <= 2 * 1024 * 1024 &&
          digest(r.responseBody) === r.responseSha256,
        'rpc-response-failed-or-digest'
      );
      const response = fields(parseJson(r.responseBody), ['jsonrpc', 'id', 'result']);
      check(response.jsonrpc === '2.0' && response.id === id, 'rpc-response-binding');
      return response.result;
    },
    done() {
      check(index === value.length, 'unconsumed-rpc');
      return { firstRequested, lastCompleted };
    },
  };
}
type Cursor = ReturnType<typeof cursor>;
function anchor(rpc: Cursor, value: unknown, minimumHeight: number) {
  const expected = fields(value, ['hash', 'height']);
  const height = integer(expected.height, 1),
    blockHash = hash(expected.hash);
  check(height >= minimumHeight, 'height-after-trusted-finality');
  check(rpc.take('chain_getBlockHash', [0]) === GENESIS, 'genesis');
  check(rpc.take('chain_getBlockHash', [height]) === blockHash, 'finalized-anchor');
  const finalHash = hash(rpc.take('chain_getFinalizedHead', []));
  check(header(rpc.take('chain_getHeader', [finalHash])).height >= height, 'finalized-head');
  check(header(rpc.take('chain_getHeader', [blockHash])).height === height, 'finalized-header');
}
function profile(rpc: Cursor, blockHash: string, runtime: AccumulationNativeMarkTrustedSource['runtime']) {
  const version = object(rpc.take('state_getRuntimeVersion', [blockHash]));
  check(
    version.specName === 'sora-substrate' &&
      version.specVersion === runtime.specVersion &&
      version.transactionVersion === runtime.transactionVersion,
    'runtime-binding'
  );
  const metadata = rpc.take('state_getMetadata', [blockHash]);
  check(
    typeof metadata === 'string' &&
      /^0x(?:[0-9a-f]{2})+$/.test(metadata) &&
      digest(Buffer.from(metadata.slice(2), 'hex')) === runtime.metadataSha256,
    'metadata-binding'
  );
  check(rpc.take('state_getStorageHash', ['0x3a636f6465', blockHash]) === runtime.codeHash, 'runtime-code');
  return { version, metadata };
}
/** A single same-state storage result must contain exactly the requested distinct keys. */
function storage(rpc: Cursor, blockHash: string, keys: Record<string, string>) {
  const keyValues = Object.values(keys);
  check(new Set(keyValues).size === keyValues.length, 'duplicate-request-key');
  const raw = rpc.take('state_queryStorageAt', [keyValues, blockHash]);
  check(Array.isArray(raw) && raw.length === 1, 'storage-set-count');
  const row = fields(raw[0], ['block', 'changes']);
  check(
    row.block === blockHash && Array.isArray(row.changes) && row.changes.length === keyValues.length,
    'storage-state'
  );
  const values = new Map<string, unknown>();
  for (const entry of row.changes) {
    check(
      Array.isArray(entry) && entry.length === 2 && keyValues.includes(entry[0]) && !values.has(entry[0]),
      'storage-key'
    );
    values.set(entry[0], entry[1]);
  }
  return Object.fromEntries(Object.entries(keys).map(([label, key]) => [label, values.get(key)]));
}
/** Local pure form of the archive reader's V14 plain-u64 timestamp layout validation. */
function timestampKey(metadataHex: string): string {
  const bytes = Buffer.from(metadataHex.slice(2), 'hex'),
    registry = new TypeRegistry();
  const metadata = new Metadata(registry, bytes);
  check(metadata.version === 14 && Buffer.from(metadata.toU8a()).equals(bytes), 'timestamp-metadata');
  const pallets = metadata.asV14.pallets.filter((p) => p.name.toString() === 'Timestamp');
  check(pallets.length === 1 && pallets[0].storage.isSome, 'timestamp-pallet');
  const store = pallets[0].storage.unwrap(),
    entries = store.items.filter((e) => e.name.toString() === 'Now');
  check(entries.length === 1 && entries[0].type.isPlain, 'timestamp-entry');
  const definitions = metadata.asV14.lookup.types.filter((t) => t.id.toNumber() === entries[0].type.asPlain.toNumber());
  check(
    definitions.length === 1 &&
      definitions[0].type.def.isPrimitive &&
      definitions[0].type.def.asPrimitive.toString() === 'U64',
    'timestamp-layout'
  );
  const key = xxhashAsHex(store.prefix.toString(), 128) + xxhashAsHex('Now', 128).slice(2);
  check(key === '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb', 'timestamp-key');
  return key;
}
function timestamp(value: unknown): number {
  check(typeof value === 'string' && /^0x[0-9a-f]{16}$/.test(value), 'timestamp-scale');
  const decoded = Buffer.from(value.slice(2), 'hex').readBigUInt64LE();
  check(decoded > 0n && decoded <= BigInt(Number.MAX_SAFE_INTEGER), 'timestamp-range');
  return Number(decoded);
}
function ratio(numerator: string, denominator: string): AccumulationNativeMarkRatio {
  let a = BigInt(numerator),
    b = BigInt(denominator);
  check(a > 0n && b > 0n, 'positive-reserves');
  while (b) [a, b] = [b, a % b];
  return { numerator: String(BigInt(numerator) / a), denominator: String(BigInt(denominator) / a) };
}
/** Ownership is a same-process provenance boundary; JSON copies are deliberately not owned. */
export function isVerifiedAccumulationNativeMark(value: unknown): value is AccumulationNativeMarkResult {
  return !!value && typeof value === 'object' && owned.has(value);
}
/** Verify one pinned mark only; this does not prove first/latest selection, schedule coverage or profitability. */
export function verifyAccumulationNativeMark(
  rawInput: unknown,
  trustedInput: AccumulationNativeMarkTrustedSource,
  registeredSlot: AccumulationNativeMarkSlot
): AccumulationNativeMarkResult {
  let retained: unknown = null;
  try {
    retained = freeze(snapshot(rawInput));
    const raw = fields(retained, ['kind', 'target', 'contextRpc', 'boundaryRpc']);
    check(raw.kind === 'accumulation-native-mark-evidence-v1', 'evidence-kind');
    const source = fields(snapshot(trustedInput), [
      'rawSha256',
      'sourceRegistrationSha256',
      'endpoint',
      'finalizedSource',
      'boundaryFinalizedSource',
      'runtime',
      'denominator',
    ]) as unknown as AccumulationNativeMarkTrustedSource;
    sha(source.rawSha256);
    sha(source.sourceRegistrationSha256);
    check(
      digest(canonical(retained)) === source.rawSha256 && source.endpoint === 'https://ws.mof.sora.org/',
      'trusted-raw-or-source'
    );
    const runtime = fields(source.runtime, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    integer(runtime.specVersion, 1);
    integer(runtime.transactionVersion, 1);
    sha(runtime.metadataSha256);
    hash(runtime.codeHash);
    check(
      typeof source.denominator === 'string' &&
        /^[1-9]\d{0,38}$/.test(source.denominator) &&
        BigInt(source.denominator) <= (1n << 128n) - 1n,
      'denomination'
    );
    const slot = fields(snapshot(registeredSlot), [
      'episodeId',
      'slotId',
      'role',
      'openingAtMs',
      'deadlineMs',
      'controlAtMs',
      'timing',
    ]) as unknown as AccumulationNativeMarkSlot;
    check(
      typeof slot.episodeId === 'string' &&
        ID.test(slot.episodeId) &&
        typeof slot.slotId === 'string' &&
        ID.test(slot.slotId),
      'slot-id'
    );
    integer(slot.openingAtMs, 1);
    integer(slot.deadlineMs, 1);
    integer(slot.controlAtMs, 1);
    check(slot.deadlineMs - slot.openingAtMs === DAY, 'original-deadline');
    check(slot.openingAtMs % 3600000 === 0, 'opening-hour-alignment');
    check(['opening', 'risk', 'terminal'].includes(slot.role), 'role');
    check(
      slot.role === 'opening'
        ? slot.controlAtMs === slot.openingAtMs
        : slot.role === 'terminal'
          ? slot.controlAtMs === slot.deadlineMs
          : slot.controlAtMs > slot.openingAtMs && slot.controlAtMs < slot.deadlineMs,
      'role-clock'
    );
    const timing = fields(slot.timing, [
      'mode',
      'registrationSha256',
      'scenarioId',
      'contextReceivedAtMs',
      'boundaryConfirmedAtMs',
      'receiptBindingSha256',
    ]);
    sha(timing.registrationSha256);
    sha(timing.receiptBindingSha256);
    check(timing.mode === 'observed-receipts' || timing.mode === 'historical-modeled', 'timing-mode');
    check(
      timing.mode === 'observed-receipts'
        ? timing.scenarioId === null
        : typeof timing.scenarioId === 'string' && ID.test(timing.scenarioId),
      'timing-scenario'
    );
    check(
      accumulationNativeMarkDigest({ contextRpc: raw.contextRpc, boundaryRpc: raw.boundaryRpc }) ===
        timing.receiptBindingSha256,
      'timing-receipt-binding'
    );
    const receivedAtMs = integer(timing.contextReceivedAtMs, 1);
    const target = fields(raw.target, ['hash', 'height']),
      targetHash = hash(target.hash),
      height = integer(target.height, 2);
    const rpc = cursor(raw.contextRpc, source.endpoint);
    anchor(rpc, source.finalizedSource, height);
    check(rpc.take('chain_getBlockHash', [height]) === targetHash, 'canonical-target');
    const targetHeader = header(rpc.take('chain_getHeader', [targetHash]));
    check(targetHeader.height === height, 'target-height');
    check(rpc.take('chain_getBlockHash', [height - 1]) === targetHeader.parentHash, 'canonical-parent');
    check(header(rpc.take('chain_getHeader', [targetHeader.parentHash])).height === height - 1, 'parent-height');
    const targetProfile = profile(rpc, targetHash, source.runtime),
      parentProfile = profile(rpc, targetHeader.parentHash, source.runtime);
    check(equal(targetProfile, parentProfile), 'parent-profile-change');
    const codec = createHistoricalExecutionPoolCodec({
      genesisHash: GENESIS,
      blockHash: targetHash,
      metadataHex: targetProfile.metadata,
      runtimeVersion: {
        specVersion: source.runtime.specVersion,
        transactionVersion: source.runtime.transactionVersion,
      },
    });
    const keys = codec.storageKeys();
    check(keys.timestamp === timestampKey(targetProfile.metadata), 'target-timestamp-key');
    const rawStorage = storage(rpc, targetHash, keys);
    const decoded = codec.decodeStorage(rawStorage);
    check(decoded.state.timestampMs === timestamp(rawStorage.timestamp), 'target-timestamp-scale');
    const contextTransport = rpc.done();
    check(
      decoded.status === 'present' && decoded.state.denominator === source.denominator,
      'native-pool-or-denomination'
    );
    const nativeAtMs = decoded.state.timestampMs;
    check(nativeAtMs <= receivedAtMs, 'original-receipt-before-native');
    if (timing.mode === 'observed-receipts')
      check(receivedAtMs === contextTransport.lastCompleted, 'observed-context-clock');
    let boundary: AccumulationNativeMarkResult['boundary'] = null;
    if (slot.role === 'risk') {
      check(
        raw.boundaryRpc === null && source.boundaryFinalizedSource === null && timing.boundaryConfirmedAtMs === null,
        'risk-boundary'
      );
      check(receivedAtMs <= slot.controlAtMs && slot.controlAtMs - nativeAtMs <= 60000, 'risk-clock');
    } else {
      check(source.boundaryFinalizedSource !== null && raw.boundaryRpc !== null, 'boundary-required');
      const boundaryRpc = cursor(raw.boundaryRpc, source.endpoint);
      anchor(boundaryRpc, source.boundaryFinalizedSource, height + 1);
      const successorHash = hash(boundaryRpc.take('chain_getBlockHash', [height + 1]));
      const successor = header(boundaryRpc.take('chain_getHeader', [successorHash]));
      check(successor.height === height + 1 && successor.parentHash === targetHash, 'successor-link');
      const successorProfile = profile(boundaryRpc, successorHash, source.runtime);
      check(equal(successorProfile, targetProfile), 'successor-profile-change');
      const key = timestampKey(successorProfile.metadata);
      const successorAt = timestamp(storage(boundaryRpc, successorHash, { timestamp: key }).timestamp);
      const boundaryTransport = boundaryRpc.done();
      const confirmedAt = integer(timing.boundaryConfirmedAtMs, 1);
      check(
        nativeAtMs < slot.controlAtMs && slot.controlAtMs <= successorAt && slot.controlAtMs - nativeAtMs <= 60000,
        'strict-left-boundary'
      );
      check(
        confirmedAt >= successorAt && confirmedAt >= slot.controlAtMs && confirmedAt >= receivedAtMs,
        'boundary-confirmation-clock'
      );
      check(boundaryTransport.firstRequested >= contextTransport.lastCompleted, 'boundary-transport-order');
      if (timing.mode === 'observed-receipts')
        check(confirmedAt === boundaryTransport.lastCompleted, 'observed-boundary-clock');
      if (slot.role === 'opening')
        check(receivedAtMs <= slot.controlAtMs && slot.controlAtMs - receivedAtMs < 5000, 'opening-original-clock');
      else check(receivedAtMs >= slot.controlAtMs, 'terminal-retrospective-clock');
      boundary = { hash: successorHash, height: height + 1, timestampMs: successorAt, confirmedAtMs: confirmedAt };
    }
    const price = ratio(decoded.reserves.kusdCodec, decoded.reserves.xorCodec);
    const result: AccumulationNativeMarkResult = freeze({
      kind: 'accumulation-native-mark-result-v1',
      status: 'verified',
      mark: { blockHash: targetHash, blockNumber: height, observedAtMs: nativeAtMs, receivedAtMs, price },
      reserves: decoded.reserves,
      reserveRatio: price,
      source,
      registeredSlot: slot,
      registeredSlotSha256: accumulationNativeMarkDigest(slot),
      boundary,
      timingMode: slot.timing.mode,
      retainedEvidence: retained,
      independentConsensusVerified: false,
      historicalBrowserArrivalVerified: false,
      actualPaidFeeVerified: false,
      scheduleCompletenessVerified: false,
      selectionVerified: false,
      qualificationAuthority: false,
      financialActions: false,
    });
    owned.add(result);
    return result;
  } catch (error) {
    const reason =
      error instanceof Error && /^[a-zA-Z0-9_-]{1,96}$/.test(error.message)
        ? error.message
        : 'invalid-native-mark-evidence';
    throw new AccumulationNativeMarkError(reason, retained);
  }
}
