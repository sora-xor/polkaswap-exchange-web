/** Original prospective RPC bootstrap requests only. No transport, source registration or financial authority. */
import { createHash } from 'node:crypto';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  type HistoricalExecutionIdentity,
} from './historical-execution-codec';
import type { AccumulationRpcReceipt } from './accumulation-evidence-bridge';

const ENDPOINT = 'https://ws.mof.sora.org/' as const;
const owned = new WeakSet<object>();
type Data = Record<string, unknown>;
type Block = Readonly<{ hash: string; height: number }>;
/** Independent target/finality pins, not claims copied from an RPC reply. */
export interface AccumulationBootstrapInput {
  target: Block;
  finalizedSource: Block;
  rpcIdStart: number;
}
/** Only descriptors constructed by this planner are accepted by the explicit bootstrap recorder profile. */
export interface AccumulationBootstrapRequestDescriptor {
  readonly endpoint: typeof ENDPOINT;
  readonly id: number;
  readonly method:
    | 'chain_getBlockHash'
    | 'chain_getFinalizedHead'
    | 'chain_getHeader'
    | 'state_getRuntimeVersion'
    | 'state_getMetadata'
    | 'state_getStorageHash';
  readonly params: readonly unknown[];
  readonly requestBody: string;
  readonly requestSha256: string;
}
export interface AccumulationBootstrapCompleted {
  readonly identity: HistoricalExecutionIdentity;
  readonly target: Block;
  readonly parent: Block;
  readonly finalizedSource: Block;
  readonly codeHash: string;
  readonly metadataSha256: string;
  readonly contextRpc: readonly AccumulationRpcReceipt[];
  readonly sourceAcquisitionVerified: false;
  readonly independentConsensusVerified: false;
}
export interface AccumulationBootstrapStep {
  readonly nextRequest: AccumulationBootstrapRequestDescriptor | null;
  readonly completed: AccumulationBootstrapCompleted | null;
}
function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw Error(`accumulation-bootstrap:${reason}`);
}
function sha(bytes: string | Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  check(
    Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= min && Number(value) <= max,
    'integer'
  );
  return Number(value);
}
function hash(value: unknown): string {
  check(typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value), 'hash');
  return value;
}
function fields(value: unknown, keys: string[]): Data {
  check(value && typeof value === 'object' && !Array.isArray(value), 'object');
  check(Object.keys(value).length === keys.length && keys.every((k) => Object.hasOwn(value, k)), 'fields');
  return value as Data;
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
function snapshot(value: unknown): unknown {
  let bytes = 0,
    nodes = 0;
  const active = new Set<object>();
  const copy = (v: unknown, depth: number): unknown => {
    check(++nodes <= 50000 && depth <= 24, 'data-bound');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return integer(v);
    if (typeof v === 'string') {
      bytes += Buffer.byteLength(v);
      check(bytes <= 6 * 1024 * 1024, 'bytes-bound');
      return v;
    }
    check(v && typeof v === 'object' && !active.has(v), 'non-data');
    const ds = Object.getOwnPropertyDescriptors(v),
      keys = Reflect.ownKeys(ds);
    check(
      keys.every((k) => typeof k === 'string' && 'value' in ds[k]),
      'accessor'
    );
    active.add(v);
    let result: unknown;
    if (Array.isArray(v)) {
      check(Object.getPrototypeOf(v) === Array.prototype && v.length <= 1000 && keys.length === v.length + 1, 'array');
      result = Array.from({ length: v.length }, (_, i) => {
        check(ds[i]?.enumerable, 'sparse');
        return copy(ds[i].value, depth + 1);
      });
    } else {
      check(
        Object.getPrototypeOf(v) === Object.prototype && keys.every((k) => ds[k as string].enumerable),
        'plain-data'
      );
      result = Object.fromEntries(keys.map((k) => [k, copy(ds[k as string].value, depth + 1)]));
    }
    active.delete(v);
    return result;
  };
  return copy(value, 0);
}
function canonical(v: unknown): string {
  return Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Data)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
}
/** Bounded duplicate-key and exact-integer precheck for the original bootstrap response bytes. */
function parse(text: string): unknown {
  let at = 0,
    nodes = 0;
  const space = () => {
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
    check(++nodes <= 50000 && depth <= 24, 'json-bound');
    space();
    const first = text[at];
    if (first === '"') {
      string();
      return;
    }
    if (first === '{' || first === '[') {
      const end = first === '{' ? '}' : ']';
      at++;
      space();
      if (text[at] === end) {
        at++;
        return;
      }
      const keys = new Set<string>();
      while (true) {
        space();
        if (first === '{') {
          const key = string();
          check(!keys.has(key), 'duplicate-json-key');
          keys.add(key);
          space();
          check(text[at++] === ':', 'json-colon');
        }
        value(depth + 1);
        space();
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
      check(
        /^-?(?:0|[1-9]\d*)$/.test(found[0]) && found[0] !== '-0' && Number.isSafeInteger(Number(found[0])),
        'json-number'
      );
  };
  value(0);
  space();
  check(at === text.length, 'json-trailing');
  return JSON.parse(text);
}
function descriptor(
  id: number,
  method: AccumulationBootstrapRequestDescriptor['method'],
  params: unknown[]
): AccumulationBootstrapRequestDescriptor {
  const requestBody = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  const out = freeze({ endpoint: ENDPOINT, id, method, params, requestBody, requestSha256: sha(requestBody) });
  owned.add(out);
  return out;
}
/** Descriptor cloning does not confer the planner's same-process construction provenance. */
export function isAccumulationBootstrapRequestDescriptor(
  value: unknown
): value is AccumulationBootstrapRequestDescriptor {
  return !!value && typeof value === 'object' && owned.has(value);
}
function header(v: unknown): { height: number; parentHash: string } {
  const r = fields(v, ['number', 'parentHash', 'stateRoot', 'extrinsicsRoot', 'digest']);
  check(typeof r.number === 'string' && /^0x[0-9a-f]+$/.test(r.number), 'header-number');
  hash(r.stateRoot);
  hash(r.extrinsicsRoot);
  check(r.digest && typeof r.digest === 'object' && !Array.isArray(r.digest), 'header-digest');
  return { height: integer(Number(BigInt(r.number)), 1, 0xffffffff), parentHash: hash(r.parentHash) };
}
function receiptResult(receipt: unknown, expected: AccumulationBootstrapRequestDescriptor, lastEnd: number) {
  const r = fields(receipt, [
    'endpoint',
    'requestBody',
    'responseBody',
    'responseSha256',
    'requestedAtMs',
    'completedAtMs',
    'httpStatus',
    'failure',
  ]);
  check(r.endpoint === ENDPOINT && r.requestBody === expected.requestBody, 'request-binding');
  const begin = integer(r.requestedAtMs),
    end = integer(r.completedAtMs);
  check(begin >= lastEnd && end >= begin && end - begin <= 30000, 'receipt-clock');
  const limit = expected.method === 'state_getMetadata' ? 2 * 1024 * 1024 : 65536;
  check(
    r.failure === null &&
      r.httpStatus === 200 &&
      typeof r.responseBody === 'string' &&
      Buffer.byteLength(r.responseBody) <= limit &&
      sha(r.responseBody) === r.responseSha256,
    'failed-response'
  );
  const response = fields(parse(r.responseBody), ['jsonrpc', 'id', 'result']);
  check(response.jsonrpc === '2.0' && response.id === expected.id, 'response-binding');
  return { result: response.result, completedAtMs: end };
}

/** Exactly one original finalized-head observation plus its header; selection/schedule authority remains external. */
export function createAccumulationBootstrapDiscoveryRequest(value: { rpcIdStart: number }) {
  const input = fields(snapshot(value), ['rpcIdStart']),
    start = integer(input.rpcIdStart, 1, Number.MAX_SAFE_INTEGER - 1);
  const next = (value: readonly AccumulationRpcReceipt[]) => {
    const receipts = snapshot(value) as AccumulationRpcReceipt[];
    check(Array.isArray(receipts) && receipts.length <= 2, 'discovery-count');
    const first = descriptor(start, 'chain_getFinalizedHead', []);
    if (receipts.length === 0) return freeze({ nextRequest: first, completed: null });
    const head = receiptResult(receipts[0], first, 0),
      headHash = hash(head.result);
    const second = descriptor(start + 1, 'chain_getHeader', [headHash]);
    if (receipts.length === 1) return freeze({ nextRequest: second, completed: null });
    const reply = receiptResult(receipts[1], second, head.completedAtMs),
      parsed = header(reply.result);
    check(parsed.height >= 2, 'discovery-height');
    return freeze({
      nextRequest: null,
      completed: {
        target: { hash: headHash, height: parsed.height },
        discoveryRpc: receipts,
        sourceAcquisitionVerified: false as const,
        independentConsensusVerified: false as const,
        selectionVerified: false as const,
      },
    });
  };
  return Object.freeze({ next });
}

/** Reproduce the exact 14 original bootstrap calls from a bounded successful prefix; never retry or repackage receipts. */
export function createAccumulationBootstrapRequests(value: AccumulationBootstrapInput) {
  const input = fields(snapshot(value), ['target', 'finalizedSource', 'rpcIdStart']);
  const block = (v: unknown): Block => {
    const r = fields(v, ['hash', 'height']);
    return freeze({ hash: hash(r.hash), height: integer(r.height, 2, 0xffffffff) });
  };
  const target = block(input.target),
    finalizedSource = block(input.finalizedSource),
    start = integer(input.rpcIdStart, 1, Number.MAX_SAFE_INTEGER - 13);
  check(target.height <= finalizedSource.height, 'target-after-anchor');
  const next = (value: readonly AccumulationRpcReceipt[]): AccumulationBootstrapStep => {
    const receipts = snapshot(value) as AccumulationRpcReceipt[];
    check(Array.isArray(receipts) && receipts.length <= 14, 'receipt-count');
    let index = 0,
      lastEnd = 0,
      pending: AccumulationBootstrapRequestDescriptor | null = null;
    const stop = {};
    const take = (method: AccumulationBootstrapRequestDescriptor['method'], params: unknown[]): unknown => {
      const expected = descriptor(start + index, method, params);
      if (index === receipts.length) {
        pending = expected;
        throw stop;
      }
      const response = receiptResult(receipts[index++], expected, lastEnd);
      lastEnd = response.completedAtMs;
      return response.result;
    };
    try {
      check(take('chain_getBlockHash', [0]) === GENESIS, 'genesis');
      check(take('chain_getBlockHash', [finalizedSource.height]) === finalizedSource.hash, 'anchor-hash');
      const finalizedHead = hash(take('chain_getFinalizedHead', []));
      check(header(take('chain_getHeader', [finalizedHead])).height >= finalizedSource.height, 'finalized-head');
      check(header(take('chain_getHeader', [finalizedSource.hash])).height === finalizedSource.height, 'anchor-header');
      check(take('chain_getBlockHash', [target.height]) === target.hash, 'target-hash');
      const targetHeader = header(take('chain_getHeader', [target.hash]));
      check(targetHeader.height === target.height, 'target-header');
      const parent = freeze({ hash: targetHeader.parentHash, height: target.height - 1 });
      check(take('chain_getBlockHash', [parent.height]) === parent.hash, 'parent-hash');
      check(header(take('chain_getHeader', [parent.hash])).height === parent.height, 'parent-header');
      const version = take('state_getRuntimeVersion', [target.hash]);
      check(version && typeof version === 'object' && !Array.isArray(version), 'runtime');
      const runtime = version as Data;
      check(
        canonical(runtime) === canonical(take('state_getRuntimeVersion', [parent.hash])) &&
          runtime.specName === 'sora-substrate',
        'runtime-equality'
      );
      const runtimeVersion = {
        specVersion: integer(runtime.specVersion, 1, 0xffffffff),
        transactionVersion: integer(runtime.transactionVersion, 1, 0xffffffff),
      };
      const metadataHex = take('state_getMetadata', [target.hash]);
      check(typeof metadataHex === 'string' && /^0x(?:[0-9a-f]{2})+$/.test(metadataHex), 'metadata');
      check(metadataHex === take('state_getMetadata', [parent.hash]), 'metadata-equality');
      const codeHash = hash(take('state_getStorageHash', ['0x3a636f6465', target.hash]));
      check(index === 14 && receipts.length === 14, 'bootstrap-count');
      return freeze({
        nextRequest: null,
        completed: {
          identity: { genesisHash: GENESIS, blockHash: target.hash, metadataHex, runtimeVersion },
          target,
          parent,
          finalizedSource,
          codeHash,
          metadataSha256: sha(Buffer.from(metadataHex.slice(2), 'hex')),
          contextRpc: receipts,
          sourceAcquisitionVerified: false,
          independentConsensusVerified: false,
        },
      });
    } catch (error) {
      if (error === stop) return freeze({ nextRequest: pending, completed: null });
      throw error;
    }
  };
  return Object.freeze({ target, finalizedSource, next });
}
