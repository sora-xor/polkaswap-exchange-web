/** Available-finalized v2 opening only. Offline source consistency; no v1 boundary casting or financial authority. */
import { createHash } from 'node:crypto';
import {
  createAccumulationBootstrapDiscoveryRequest,
  createAccumulationBootstrapRequests,
} from './accumulation-bootstrap-requests';
import { accumulationEvidenceDigest, type AccumulationRpcReceipt } from './accumulation-evidence-bridge';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import type { AccumulationReplayMark } from './accumulation-native-mark';

const ENDPOINT = 'https://ws.mof.sora.org/' as const,
  HOUR = 3_600_000;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
export interface AccumulationOpeningMarkEvidence {
  kind: 'accumulation-opening-mark-evidence-v2';
  discoveryRpc: readonly AccumulationRpcReceipt[];
  bootstrapRpc: readonly AccumulationRpcReceipt[];
  poolRpc: AccumulationRpcReceipt;
}
/** Source/runtime bindings must be supplied by the registered owner, never inferred as authority from raw JSON. */
export interface AccumulationOpeningMarkTrustedSource {
  rawSha256: string;
  sourceRegistrationSha256: string;
  endpoint: typeof ENDPOINT;
  runtime: { specVersion: number; transactionVersion: number; metadataSha256: string; codeHash: string };
  denominator: string;
}
export interface AccumulationOpeningMarkSlot {
  episodeId: string;
  slotId: string;
  openingAtMs: number;
  deadlineMs: number;
}
/** A new owned opening result; intentionally incompatible with the v1 native-mark ownership predicate. */
export interface AccumulationOpeningMarkResult {
  kind: 'accumulation-opening-mark-result-v2';
  status: 'verified';
  basis: 'available-finalized-opening';
  mark: AccumulationReplayMark;
  selectedTarget: { hash: string; height: number };
  rawSha256: string;
  sourceRegistrationSha256: string;
  registeredSlot: AccumulationOpeningMarkSlot;
  registeredSlotSha256: string;
  runtime: AccumulationOpeningMarkTrustedSource['runtime'];
  denominator: string;
  reserves: { xorCodec: string; kusdCodec: string };
  retainedEvidence: AccumulationOpeningMarkEvidence;
  sourceAcquisitionVerified: false;
  selectionVerified: false;
  scheduleCompletenessVerified: false;
  independentConsensusVerified: false;
  qualificationAuthority: false;
  financialAuthority: false;
}
/** Invalid evidence is preserved when it was safely detached; errors never issue an owned mark. */
export class AccumulationOpeningMarkError extends Error {
  readonly status = 'incomplete';
  constructor(
    readonly reason: string,
    readonly retainedEvidence: unknown
  ) {
    super(`accumulation-opening-mark:${reason}`);
  }
}
function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw Error(reason);
}
function fields(v: unknown, names: string[]): Data {
  check(v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype, 'object');
  check(Object.keys(v).length === names.length && names.every((k) => Object.hasOwn(v, k)), 'fields');
  return v as Data;
}
function integer(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  check(Number.isSafeInteger(v) && !Object.is(v, -0) && Number(v) >= min && Number(v) <= max, 'integer');
  return Number(v);
}
function digest(v: string | Uint8Array): string {
  return createHash('sha256').update(v).digest('hex');
}
function sha(v: unknown): string {
  check(typeof v === 'string' && /^[0-9a-f]{64}$/.test(v), 'sha256');
  return v;
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
/** Reuse the existing bounded, getter-rejecting data snapshot validation before making a detached JSON copy. */
function detach<T>(v: T): T {
  accumulationEvidenceDigest(v);
  return JSON.parse(JSON.stringify(v)) as T;
}
function ratio(n: string, d: string) {
  let a = BigInt(n),
    b = BigInt(d);
  check(a > 0n && b > 0n, 'reserves');
  while (b) [a, b] = [b, a % b];
  return { numerator: String(BigInt(n) / a), denominator: String(BigInt(d) / a) };
}
/** Existing sorted compact byte-binding convention, without any source-authentication claim. */
export const accumulationOpeningMarkDigest = accumulationEvidenceDigest;
/** Serialization or object spreading deliberately loses same-process validation provenance. */
export function isVerifiedAccumulationOpeningMark(v: unknown): v is AccumulationOpeningMarkResult {
  return !!v && typeof v === 'object' && owned.has(v);
}

/**
 * Check one original selected finalized target, original bootstrap, and original seven-key storage response.
 * H is fixed before collection. Opening receipt is in (H-5s,H], native age is at most60s, with no successor rule.
 * The acquisition owner still proves the registered attempt/window and actual origin/clock provenance.
 */
export function verifyAccumulationOpeningMark(
  rawInput: unknown,
  trustedInput: unknown,
  slotInput: unknown
): AccumulationOpeningMarkResult {
  let retained: unknown = null;
  try {
    retained = detach(rawInput);
    const raw = fields(retained, ['kind', 'discoveryRpc', 'bootstrapRpc', 'poolRpc']);
    check(raw.kind === 'accumulation-opening-mark-evidence-v2', 'kind');
    check(
      Array.isArray(raw.discoveryRpc) &&
        raw.discoveryRpc.length === 2 &&
        Array.isArray(raw.bootstrapRpc) &&
        raw.bootstrapRpc.length === 14,
      'receipt-count'
    );
    const source = fields(detach(trustedInput), [
      'rawSha256',
      'sourceRegistrationSha256',
      'endpoint',
      'runtime',
      'denominator',
    ]);
    check(
      source.endpoint === ENDPOINT && sha(source.rawSha256) === accumulationEvidenceDigest(retained),
      'source-binding'
    );
    sha(source.sourceRegistrationSha256);
    const runtime = fields(source.runtime, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    integer(runtime.specVersion, 1, 0xffffffff);
    integer(runtime.transactionVersion, 1, 0xffffffff);
    sha(runtime.metadataSha256);
    check(typeof runtime.codeHash === 'string' && /^0x[0-9a-f]{64}$/.test(runtime.codeHash), 'code-hash');
    check(
      typeof source.denominator === 'string' &&
        /^[1-9]\d{0,38}$/.test(source.denominator) &&
        BigInt(source.denominator) < 1n << 128n,
      'denominator'
    );
    const slot = fields(detach(slotInput), ['episodeId', 'slotId', 'openingAtMs', 'deadlineMs']);
    for (const name of ['episodeId', 'slotId'])
      check(
        typeof slot[name] === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(slot[name] as string),
        'slot-id'
      );
    const H = integer(slot.openingAtMs, 1),
      end = integer(slot.deadlineMs, 1);
    check(H % HOUR === 0 && end - H === 24 * HOUR, 'opening-or-deadline');
    const discovery = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 }).next(
      raw.discoveryRpc as AccumulationRpcReceipt[]
    ).completed;
    check(discovery, 'discovery-incomplete');
    const bootstrap = createAccumulationBootstrapRequests({
      target: discovery.target,
      finalizedSource: discovery.target,
      rpcIdStart: 3,
    }).next(raw.bootstrapRpc as AccumulationRpcReceipt[]).completed;
    check(bootstrap, 'bootstrap-incomplete');
    check(
      bootstrap.contextRpc[0].requestedAtMs >= discovery.discoveryRpc[1].completedAtMs,
      'discovery-bootstrap-order'
    );
    check(
      bootstrap.metadataSha256 === runtime.metadataSha256 &&
        bootstrap.codeHash === runtime.codeHash &&
        bootstrap.identity.runtimeVersion.specVersion === runtime.specVersion &&
        bootstrap.identity.runtimeVersion.transactionVersion === runtime.transactionVersion,
      'runtime-pins'
    );
    const codec = createHistoricalExecutionPoolCodec(bootstrap.identity),
      keys = codec.storageKeys();
    const receipt = fields(raw.poolRpc, [
      'endpoint',
      'requestBody',
      'responseBody',
      'responseSha256',
      'requestedAtMs',
      'completedAtMs',
      'httpStatus',
      'failure',
    ]);
    const expectedBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1000,
      method: 'state_queryStorageAt',
      params: [Object.values(keys), discovery.target.hash],
    });
    check(receipt.endpoint === ENDPOINT && receipt.requestBody === expectedBody, 'pool-request-binding');
    const begin = integer(receipt.requestedAtMs),
      received = integer(receipt.completedAtMs);
    check(
      begin >= bootstrap.contextRpc[13].completedAtMs && received >= begin && received - begin <= 30000,
      'pool-clock'
    );
    check(received <= H && H - received < 5000, 'opening-receipt-clock');
    check(
      receipt.failure === null &&
        receipt.httpStatus === 200 &&
        typeof receipt.responseBody === 'string' &&
        Buffer.byteLength(receipt.responseBody) <= 65536 &&
        digest(receipt.responseBody) === receipt.responseSha256,
      'pool-response'
    );
    // The fixed supported MOF wire profile is compact JSON. Never normalize an unsupported original body.
    const parsed: unknown = JSON.parse(receipt.responseBody);
    check(JSON.stringify(parsed) === receipt.responseBody, 'pool-json-encoding');
    const response = fields(parsed, ['jsonrpc', 'id', 'result']);
    check(
      response.jsonrpc === '2.0' &&
        response.id === 1000 &&
        Array.isArray(response.result) &&
        response.result.length === 1,
      'pool-rpc-shape'
    );
    const state = fields(response.result[0], ['block', 'changes']);
    check(
      state.block === discovery.target.hash && Array.isArray(state.changes) && state.changes.length === 7,
      'pool-state'
    );
    const values = new Map<string, unknown>();
    for (const change of state.changes) {
      check(
        Array.isArray(change) &&
          change.length === 2 &&
          Object.values(keys).includes(change[0]) &&
          !values.has(change[0]),
        'pool-keys'
      );
      values.set(change[0], change[1]);
    }
    const decoded = codec.decodeStorage(
      Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, values.get(key)]))
    );
    check(decoded.status === 'present' && decoded.state.denominator === source.denominator, 'pool-or-denomination');
    const native = decoded.state.timestampMs;
    check(native < H && native <= received && H - native <= 60000, 'opening-native-clock');
    const result = freeze({
      kind: 'accumulation-opening-mark-result-v2' as const,
      status: 'verified' as const,
      basis: 'available-finalized-opening' as const,
      mark: {
        blockHash: discovery.target.hash,
        blockNumber: discovery.target.height,
        observedAtMs: native,
        receivedAtMs: received,
        price: ratio(decoded.reserves.kusdCodec, decoded.reserves.xorCodec),
      },
      selectedTarget: discovery.target,
      rawSha256: source.rawSha256 as string,
      sourceRegistrationSha256: source.sourceRegistrationSha256 as string,
      registeredSlot: slot as unknown as AccumulationOpeningMarkSlot,
      registeredSlotSha256: accumulationEvidenceDigest(slot),
      runtime: runtime as unknown as AccumulationOpeningMarkTrustedSource['runtime'],
      denominator: source.denominator,
      reserves: { ...decoded.reserves },
      retainedEvidence: retained as AccumulationOpeningMarkEvidence,
      sourceAcquisitionVerified: false as const,
      selectionVerified: false as const,
      scheduleCompletenessVerified: false as const,
      independentConsensusVerified: false as const,
      qualificationAuthority: false as const,
      financialAuthority: false as const,
    });
    owned.add(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const reason = /^[A-Za-z0-9:_-]{1,96}$/.test(message) ? message : 'invalid-opening-evidence';
    throw new AccumulationOpeningMarkError(reason, retained === null ? null : freeze(retained));
  }
}
