/** Read-only canonical callback metadata collection. No market/account/transaction methods exist here. */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionBlockReader,
  createCatalogHistoricalExecutionBlockReader,
  historicalCatalogProfileSha256,
  HistoricalExecutionBlockReadError,
  type HistoricalBlockReaderSource,
  type HistoricalBlockRpcEvidence,
} from './historical-execution-block-reader';
import { createGoalMetadataBatchTransport, type GoalMetadataBatchStats } from './goal-qualification-metadata-transport';
import type { HistoricalClockBlock } from './historical-execution-clock';

import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';

type CatalogReader = Awaited<ReturnType<typeof createCatalogHistoricalExecutionBlockReader>>;
type CatalogSource = Parameters<typeof createCatalogHistoricalExecutionBlockReader>[0];
type CatalogSchema = Pick<CatalogReader['context'], 'catalogSha256' | 'profiles'>;
type BlockProfile = ReturnType<CatalogReader['blockProfiles']>[number];
type Reader = Awaited<ReturnType<typeof createHistoricalExecutionBlockReader>>;
type Schema = Reader['context']['schema'];
const TIMESTAMP_KEY = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const MAX_BYTES = 2 * 1024 * 1024;
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
export interface GoalQualificationMetadataRange {
  id: 'training' | 'validation' | 'development';
  startAtMs: number;
  endAtMs: number;
  /** Last canonical block at/before start−60,001ms, independently located before collecting. */
  first: HistoricalClockBlock;
  /** First canonical block strictly after end, independently located before collecting. */
  last: HistoricalClockBlock;
}
export interface GoalQualificationMetadataProtocol {
  version: 1;
  kind: 'qualification-callback-metadata-v1';
  source: HistoricalBlockReaderSource;
  schema: Schema;
  sourceHashes: Readonly<Record<string, string>>;
  ranges: readonly GoalQualificationMetadataRange[];
  budget: {
    blocks: number;
    shards: number;
    rpcCalls: number;
    responseBytes: 2097152;
    totalBytes: number;
    httpIntervalMs: 125;
    maximumParallelShards: 32;
    maximumBatchRpc: 32;
    maximumHttpStarts: number;
  };
}
/** Versioned metadata archive carrying each block's authenticated historical runtime. */
export interface GoalQualificationCatalogMetadataProtocol {
  version: 2;
  kind: 'qualification-callback-metadata-catalog-v2';
  source: CatalogSource;
  schema: CatalogSchema;
  sourceHashes: Readonly<Record<string, string>>;
  ranges: readonly GoalQualificationMetadataRange[];
  budget: ReturnType<typeof goalQualificationCatalogMetadataBudget>;
}
type MetadataProtocol = GoalQualificationMetadataProtocol | GoalQualificationCatalogMetadataProtocol;
/** Trusted durable store. Writes must atomically create a new record and fail if the name already exists. */
export interface GoalQualificationMetadataStore {
  read(name: string): Promise<unknown | undefined>;
  writeOnce(name: string, value: unknown): Promise<void>;
}
export interface GoalQualificationMetadataCounts {
  blocks: number;
  shards: number;
  rpcCalls: number;
  httpStarts: number;
  responseBytes: number;
  wireRpcCalls: number;
}
interface ShardBody {
  version: 1 | 2;
  kind: 'complete-metadata-shard' | 'complete-catalog-metadata-shard';
  protocolSha256: string;
  index: number;
  rangeId: GoalQualificationMetadataRange['id'];
  firstHeight: number;
  lastHeight: number;
  schema: Schema | CatalogSchema;
  blockProfiles?: readonly BlockProfile[];
  blocks: readonly HistoricalClockBlock[];
  rpcEvidence: readonly HistoricalBlockRpcEvidence[];
  counts: { blocks: number; rpcCalls: number; responseBytes: number };
  transportGroup: string;
}
export interface GoalQualificationMetadataOptions {
  store: GoalQualificationMetadataStore;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  /** Graceful operational yield only, between completed durable shards. No range changes. */
  maximumNewShards?: number;
  progress?(counts: Readonly<GoalQualificationMetadataCounts>): void;
  /** Offline test seam; production uses the existing approved source-attesting reader. */
  readerFactory?: typeof createHistoricalExecutionBlockReader;
  /** Offline pacing seam; does not select a source or alter protocol limits. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}
/** Catalog ownership is required even when resuming already collected shards. */
export interface GoalQualificationCatalogMetadataOptions extends Omit<
  GoalQualificationMetadataOptions,
  'readerFactory'
> {
  catalog: GoalRuntimeCatalog;
  readerFactory?: typeof createCatalogHistoricalExecutionBlockReader;
}
function requireValue(value: unknown): asserts value {
  if (!value) throw Error('invalid-metadata-evidence');
}
function snapshot<T>(value: T): T {
  let nodes = 0,
    chars = 0;
  const visit = (v: unknown, depth: number): unknown => {
    requireValue(++nodes <= 500000 && depth <= 20);
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      requireValue(Number.isSafeInteger(v));
      return v;
    }
    if (typeof v === 'string') {
      chars += v.length;
      requireValue(v.length <= 4 * MAX_BYTES && chars <= 16 * MAX_BYTES);
      return v;
    }
    requireValue(v && typeof v === 'object');
    const d = Object.getOwnPropertyDescriptors(v),
      keys = Reflect.ownKeys(d);
    if (Array.isArray(v)) {
      requireValue(Object.getPrototypeOf(v) === Array.prototype && v.length <= 100000 && keys.length === v.length + 1);
      return Object.freeze(
        Array.from({ length: v.length }, (_, i) => {
          requireValue(d[i]?.enumerable && 'value' in d[i]);
          return visit(d[i].value, depth + 1);
        })
      );
    }
    requireValue([Object.prototype, null].includes(Object.getPrototypeOf(v)) && keys.length <= 128);
    return Object.freeze(
      Object.fromEntries(
        keys.map((k) => {
          requireValue(typeof k === 'string' && d[k].enumerable && 'value' in d[k]);
          return [k, visit(d[k].value, depth + 1)];
        })
      )
    );
  };
  return visit(value, 0) as T;
}
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(value);
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const integer = (value: unknown) => requireValue(Number.isSafeInteger(value) && Number(value) >= 0);
function fields(value: object, names: string[]) {
  requireValue(Object.keys(value).length === names.length && names.every((k) => Object.hasOwn(value, k)));
}
function block(raw: HistoricalClockBlock): void {
  fields(raw, ['height', 'hash', 'parentHash', 'timestampMs']);
  integer(raw.height);
  integer(raw.timestampMs);
  requireValue(
    raw.height > 0 &&
      raw.height <= 0xffffffff &&
      HASH.test(raw.hash) &&
      HASH.test(raw.parentHash) &&
      raw.hash !== raw.parentHash
  );
}
function schema(raw: Schema): void {
  fields(raw, ['key', 'type', 'unit', 'metadataSha256', 'codeHash', 'runtimeVersion']);
  fields(raw.runtimeVersion, ['specName', 'specVersion', 'transactionVersion']);
  requireValue(
    raw.key === TIMESTAMP_KEY &&
      raw.type === 'u64' &&
      raw.unit === 'milliseconds' &&
      SHA.test(raw.metadataSha256) &&
      HASH.test(raw.codeHash)
  );
  requireValue(
    raw.runtimeVersion.specName === 'sora-substrate' &&
      [130, 131].includes(raw.runtimeVersion.specVersion) &&
      raw.runtimeVersion.transactionVersion === raw.runtimeVersion.specVersion
  );
}
/** Exact budgets follow the immutable inclusive height ranges and existing64-read/10-init-RPC shards. */
export function goalQualificationMetadataBudget(ranges: readonly GoalQualificationMetadataRange[]) {
  const safe = snapshot(ranges);
  requireValue(safe.length >= 1 && safe.length <= 2);
  let blocks = 0,
    shards = 0;
  const ids = new Set<string>();
  safe.forEach((r, i) => {
    fields(r, ['id', 'startAtMs', 'endAtMs', 'first', 'last']);
    integer(r.startAtMs);
    integer(r.endAtMs);
    block(r.first);
    block(r.last);
    requireValue(['training', 'validation', 'development'].includes(r.id) && !ids.has(r.id));
    ids.add(r.id);
    requireValue(
      r.startAtMs >= 60001 &&
        r.endAtMs > r.startAtMs &&
        r.endAtMs - r.startAtMs <= 116 * 3600000 &&
        r.first.timestampMs <= r.startAtMs - 60001 &&
        r.last.timestampMs > r.endAtMs &&
        r.last.height > r.first.height
    );
    if (i) requireValue(safe[i - 1].last.height < r.first.height && safe[i - 1].endAtMs < r.startAtMs);
    const count = r.last.height - r.first.height + 1;
    blocks += count;
    shards += Math.ceil(count / 64);
  });
  requireValue(blocks <= 100000);
  return Object.freeze({
    blocks,
    shards,
    rpcCalls: blocks * 4 + shards * 10,
    responseBytes: MAX_BYTES as 2097152,
    totalBytes: shards * MAX_BYTES,
    httpIntervalMs: 125 as const,
    maximumParallelShards: 32 as const,
    maximumBatchRpc: 32 as const,
    // Up to two batches per four-RPC read stage permits uneven reader arrival without serial fanout.
    maximumHttpStarts: Math.min(blocks * 4 + shards * 10, Math.ceil(shards / 32) * 532),
  });
}
/** Three authenticated source anchors need twenty initialization calls and up to six MiB per shard. */
export function goalQualificationCatalogMetadataBudget(ranges: readonly GoalQualificationMetadataRange[]) {
  const old = goalQualificationMetadataBudget(ranges);
  return Object.freeze({
    ...old,
    rpcCalls: old.blocks * 4 + old.shards * 20,
    // Logical responses retained by one shard; individual reader responses remain capped at two MiB.
    responseBytes: 6291456 as const,
    totalBytes: old.shards * 6291456,
    maximumHttpStarts: Math.min(old.blocks * 4 + old.shards * 20, Math.ceil(old.shards / 32) * 552),
  });
}
/** Derive the finite protocol schema from owned catalog entries, without reading any block or market value. */
export function goalQualificationCatalogMetadataSchema(
  source: CatalogSource,
  catalog: GoalRuntimeCatalog
): CatalogSchema {
  assertGoalRuntimeCatalog(catalog);
  const value = snapshot(source);
  fields(value, ['kind', 'finalizedSource', 'schemaAnchors']);
  requireValue(value.kind === 'catalog-source-v1');
  fields(value.finalizedSource, ['height', 'hash', 'receiptSha256']);
  integer(value.finalizedSource.height);
  requireValue(
    value.finalizedSource.height > 0 &&
      value.finalizedSource.height <= 0xffffffff &&
      HASH.test(value.finalizedSource.hash) &&
      SHA.test(value.finalizedSource.receiptSha256)
  );
  requireValue(Array.isArray(value.schemaAnchors) && value.schemaAnchors.length === 3);
  const heights = new Set<number>(),
    hashes = new Set<string>();
  const profiles = value.schemaAnchors.map((anchor, i) => {
    fields(anchor, ['specVersion', 'height', 'hash']);
    integer(anchor.height);
    requireValue(
      anchor.specVersion === 128 + i &&
        anchor.height > 0 &&
        anchor.height <= value.finalizedSource.height &&
        HASH.test(anchor.hash) &&
        !heights.has(anchor.height) &&
        !hashes.has(anchor.hash)
    );
    requireValue(anchor.height !== value.finalizedSource.height || anchor.hash === value.finalizedSource.hash);
    requireValue(anchor.hash !== value.finalizedSource.hash || anchor.height === value.finalizedSource.height);
    heights.add(anchor.height);
    hashes.add(anchor.hash);
    const entry = catalog.entries.find(
      (e) => e.role === 'historical-source' && e.profile.specVersion === anchor.specVersion
    );
    requireValue(entry);
    return Object.freeze({
      profileSha256: historicalCatalogProfileSha256(entry.profile),
      profile: entry.profile,
      schemaAnchor: anchor,
      timestampLayout: Object.freeze({
        key: entry.storage.timestamp.keyHex,
        type: 'u64' as const,
        unit: 'milliseconds' as const,
        metadataSha256: entry.profile.metadataSha256,
      }),
    });
  });
  return Object.freeze({ catalogSha256: catalog.catalogSha256, profiles: Object.freeze(profiles) });
}
function catalogProtocolCopy(raw: GoalQualificationCatalogMetadataProtocol, catalog: GoalRuntimeCatalog) {
  const p = snapshot(raw);
  fields(p, ['version', 'kind', 'source', 'schema', 'sourceHashes', 'ranges', 'budget']);
  requireValue(p.version === 2 && p.kind === 'qualification-callback-metadata-catalog-v2');
  requireValue(same(p.schema, goalQualificationCatalogMetadataSchema(p.source, catalog)));
  requireValue(
    Object.keys(p.sourceHashes).length > 0 &&
      Object.entries(p.sourceHashes).every(([path, hash]) => path.length > 0 && path.length <= 512 && SHA.test(hash))
  );
  requireValue(
    same(p.budget, goalQualificationCatalogMetadataBudget(p.ranges)) &&
      p.ranges.every((r) => r.last.height <= p.source.finalizedSource.height)
  );
  return p;
}
/** Bind only original :code wire replies to their exact reader projections; IDs are restored from saved mappings. */
function catalogCodeProjectionDigests(raw: unknown): readonly string[] {
  const batch = raw as {
    responseBody: string;
    request: Array<{ id: number; method: string; params: unknown[] }>;
    mapping: Array<{ wireId: number; requests: Array<{ originalId: number }> }>;
  };
  requireValue(typeof batch.responseBody === 'string' && Array.isArray(batch.request) && Array.isArray(batch.mapping));
  const replies = JSON.parse(batch.responseBody) as Array<{
    id: number;
    jsonrpc: string;
    result?: unknown;
    error?: unknown;
  }>;
  requireValue(Array.isArray(replies) && replies.length === batch.request.length);
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  requireValue(byId.size === replies.length);
  const projections: string[] = [];
  for (const request of batch.request) {
    if (request.method !== 'state_getStorageHash') continue;
    requireValue(
      Array.isArray(request.params) &&
        request.params.length === 2 &&
        request.params[0] === '0x3a636f6465' &&
        typeof request.params[1] === 'string' &&
        HASH.test(request.params[1])
    );
    const reply = byId.get(request.id),
      mappings = batch.mapping.filter((m) => m.wireId === request.id);
    requireValue(
      reply &&
        reply.jsonrpc === '2.0' &&
        !Object.hasOwn(reply, 'error') &&
        typeof reply.result === 'string' &&
        HASH.test(reply.result)
    );
    requireValue(
      mappings.length === 1 &&
        Array.isArray(mappings[0].requests) &&
        mappings[0].requests.length > 0 &&
        mappings[0].requests.length <= 32
    );
    for (const member of mappings[0].requests) {
      requireValue(Number.isSafeInteger(member.originalId) && member.originalId > 0);
      projections.push(
        digest({
          id: member.originalId,
          method: request.method,
          params: request.params,
          responseBody: JSON.stringify({ ...reply, id: member.originalId }),
        })
      );
    }
  }
  return Object.freeze(projections);
}
function protocolCopy(raw: GoalQualificationMetadataProtocol) {
  const p = snapshot(raw);
  fields(p, ['version', 'kind', 'source', 'schema', 'sourceHashes', 'ranges', 'budget']);
  requireValue(p.version === 1 && p.kind === 'qualification-callback-metadata-v1');
  schema(p.schema);
  fields(p.source, ['finalizedSource', 'schemaAnchor']);
  fields(p.source.finalizedSource, ['height', 'hash', 'receiptSha256']);
  fields(p.source.schemaAnchor, ['height', 'hash']);
  for (const item of [p.source.finalizedSource, p.source.schemaAnchor]) {
    integer(item.height);
    requireValue(item.height > 0 && HASH.test(item.hash));
  }
  requireValue(
    SHA.test(p.source.finalizedSource.receiptSha256) && p.source.schemaAnchor.height <= p.source.finalizedSource.height
  );
  requireValue(
    Object.keys(p.sourceHashes).length > 0 &&
      Object.entries(p.sourceHashes).every(([path, hash]) => path.length > 0 && path.length <= 512 && SHA.test(hash))
  );
  requireValue(
    same(p.budget, goalQualificationMetadataBudget(p.ranges)) &&
      p.ranges.every((r) => r.last.height <= p.source.finalizedSource.height)
  );
  return p;
}
/**
 * Up to32 independent64-block reader shards share one bounded batch transport. Complete immutable
 * shards resume; any failed/uncertain started shard remains unavailable, without retry or new dates.
 * The provider attests canonical metadata, not past browser arrivals or cryptographic finality.
 */
export async function collectGoalQualificationMetadata(
  input: GoalQualificationMetadataProtocol,
  options: GoalQualificationMetadataOptions
) {
  return collectMetadata(protocolCopy(input), options);
}
/** Collect upgrade-spanning metadata while retaining original per-block runtime associations. */
export async function collectGoalQualificationCatalogMetadata(
  input: GoalQualificationCatalogMetadataProtocol,
  options: GoalQualificationCatalogMetadataOptions
) {
  assertGoalRuntimeCatalog(options.catalog);
  return collectMetadata(catalogProtocolCopy(input, options.catalog), options, options.catalog);
}
async function collectMetadata(
  p: MetadataProtocol,
  options: GoalQualificationMetadataOptions | GoalQualificationCatalogMetadataOptions,
  catalog?: GoalRuntimeCatalog
) {
  const protocolSha256 = digest(p),
    store = options.store,
    initCalls = p.version === 2 ? 20 : 10,
    maximumShardBytes = p.budget.responseBytes;
  const blockProfiles: BlockProfile[] = [];
  const validateProfiles = (
    profiles: readonly BlockProfile[] | undefined,
    rows: readonly HistoricalClockBlock[],
    rpcEvidence: readonly HistoricalBlockRpcEvidence[],
    wireProjections: ReadonlySet<string> | undefined
  ) => {
    if (p.version === 1) {
      requireValue(profiles === undefined);
      return;
    }
    requireValue(catalog && Array.isArray(profiles) && profiles.length === rows.length);
    profiles.forEach((profile, i) => {
      fields(profile, ['height', 'hash', 'codeHash', 'profileSha256']);
      const entry = lookupGoalRuntimeCatalogEntry(catalog!, profile.codeHash);
      requireValue(
        entry.role === 'historical-source' &&
          profile.height === rows[i].height &&
          profile.hash === rows[i].hash &&
          profile.profileSha256 === historicalCatalogProfileSha256(entry.profile)
      );
      // A valid catalog profile is insufficient: retain its exact original per-block code-hash observation.
      const receipt = rpcEvidence[initCalls + 4 * i + 2];
      requireValue(
        receipt &&
          receipt.method === 'state_getStorageHash' &&
          same(receipt.params, ['0x3a636f6465', profile.hash]) &&
          receipt.httpStatus === 200 &&
          !receipt.failure &&
          typeof receipt.responseBody === 'string'
      );
      requireValue(createHash('sha256').update(receipt.responseBody).digest('hex') === receipt.responseSha256);
      const response = JSON.parse(receipt.responseBody);
      requireValue(
        response.jsonrpc === '2.0' &&
          response.id === receipt.id &&
          !Object.hasOwn(response, 'error') &&
          response.result === profile.codeHash
      );
      requireValue(
        wireProjections?.has(
          digest({ id: receipt.id, method: receipt.method, params: receipt.params, responseBody: receipt.responseBody })
        )
      );
    });
  };
  requireValue(store && typeof store.read === 'function' && typeof store.writeOnce === 'function');
  const cap = options.maximumNewShards ?? p.budget.shards;
  integer(cap);
  requireValue(cap > 0);
  const existing = await store.read('protocol');
  if (existing === undefined) await store.writeOnce('protocol', snapshot({ protocol: p, protocolSha256 }));
  else requireValue(same(snapshot(existing), { protocol: p, protocolSha256 }));
  const counts: GoalQualificationMetadataCounts = {
    blocks: 0,
    shards: 0,
    rpcCalls: 0,
    httpStarts: 0,
    responseBytes: 0,
    wireRpcCalls: 0,
  };
  let freshShards = 0,
    reusedShards = 0,
    lastStart = 0;
  const blocks: HistoricalClockBlock[] = [],
    hashes = new Map<string, number>(),
    children = new Map<string, number>();
  const plan: Array<{
    index: number;
    range: GoalQualificationMetadataRange;
    first: number;
    last: number;
    name: string;
  }> = [];
  for (const range of p.ranges)
    for (let first = range.first.height; first <= range.last.height; first += 64) {
      const index = plan.length;
      plan.push({
        index,
        range,
        first,
        last: Math.min(first + 63, range.last.height),
        name: `shard-${String(index).padStart(5, '0')}`,
      });
    }
  const progress = () => {
    try {
      void Promise.resolve(options.progress?.(Object.freeze({ ...counts }))).catch(() => undefined);
    } catch {
      /* observer only */
    }
  };
  const startedFor = (s: (typeof plan)[number]) => ({
    protocolSha256,
    index: s.index,
    rangeId: s.range.id,
    firstHeight: s.first,
    lastHeight: s.last,
  });
  const accept = (rows: readonly HistoricalClockBlock[], s: (typeof plan)[number]) => {
    requireValue(rows.length === s.last - s.first + 1);
    for (const [i, b] of rows.entries()) {
      block(b);
      requireValue(b.height === s.first + i && (!hashes.has(b.hash) || hashes.get(b.hash) === b.height));
      const prev = blocks.at(-1);
      if (prev) {
        requireValue(b.timestampMs > prev.timestampMs);
        if (prev.height + 1 === b.height) requireValue(b.parentHash === prev.hash);
      }
      requireValue(
        (!hashes.has(b.parentHash) || hashes.get(b.parentHash) === b.height - 1) &&
          (!children.has(b.hash) || children.get(b.hash) === b.height + 1) &&
          (!children.has(b.parentHash) || children.get(b.parentHash) === b.height)
      );
      if (b.height === s.range.first.height) requireValue(same(b, s.range.first));
      if (b.height === s.range.last.height) requireValue(same(b, s.range.last));
      children.set(b.parentHash, b.height);
      hashes.set(b.hash, b.height);
      blocks.push(b);
    }
  };
  const result = (status: 'complete' | 'paused' | 'unavailable', reason?: string) =>
    Object.freeze({
      status,
      protocolSha256,
      counts: Object.freeze({ ...counts }),
      freshShards,
      reusedShards,
      blocks: Object.freeze([...blocks]),
      ...(p.version === 2 ? { blockProfiles: Object.freeze([...blockProfiles]) } : {}),
      ...(reason ? { reason } : {}),
      marketDataRead: false as const,
      qualification: false as const,
    });
  const addTransport = (stats: GoalMetadataBatchStats) => {
    counts.rpcCalls += stats.logicalRpcCalls;
    counts.wireRpcCalls += stats.wireRpcCalls;
    counts.httpStarts += stats.httpStarts;
    counts.responseBytes += stats.responseBytes;
    lastStart = Math.max(lastStart, stats.lastStartedAtMs);
    requireValue(
      counts.rpcCalls <= p.budget.rpcCalls &&
        counts.httpStarts <= p.budget.maximumHttpStarts &&
        counts.responseBytes <= p.budget.totalBytes
    );
  };
  const loadedGroups = new Set<string>();
  const groupCodeProjections = new Map<string, ReadonlySet<string>>();

  const loadGroup = async (name: string, index: number) => {
    requireValue(/^group-[0-9]{5}$/.test(name));
    const raw = await store.read(`${name}.complete`);
    requireValue(raw);
    const saved = snapshot(raw) as {
      protocolSha256: string;
      indices: number[];
      stats: GoalMetadataBatchStats;
      batches: Array<{ index: number; sha256: string }>;
      sha256: string;
    };
    const { sha256, ...body } = saved;
    fields(saved, ['protocolSha256', 'indices', 'stats', 'batches', 'sha256']);
    requireValue(
      SHA.test(sha256) &&
        digest(body) === sha256 &&
        saved.protocolSha256 === protocolSha256 &&
        saved.indices.includes(index) &&
        saved.indices.length <= 32 &&
        saved.indices.every((n, i) => Number.isSafeInteger(n) && n >= 0 && (!i || n === saved.indices[i - 1] + 1))
    );
    requireValue(name === `group-${String(saved.indices[0]).padStart(5, '0')}`);
    fields(saved.stats, ['logicalRpcCalls', 'wireRpcCalls', 'httpStarts', 'responseBytes', 'lastStartedAtMs']);
    Object.values(saved.stats).forEach(integer);
    requireValue(
      saved.stats.logicalRpcCalls ===
        saved.indices.reduce((sum, i) => sum + initCalls + 4 * (plan[i].last - plan[i].first + 1), 0) &&
        saved.stats.wireRpcCalls <= saved.stats.logicalRpcCalls &&
        saved.stats.httpStarts === saved.batches.length &&
        saved.stats.httpStarts <= saved.stats.wireRpcCalls
    );
    if (!loadedGroups.has(name)) {
      const codeProjections = new Set<string>();
      let bytes = 0,
        wireCalls = 0,
        logicalCalls = 0,
        previous = lastStart;
      for (const b of saved.batches) {
        requireValue(b.index === saved.batches.indexOf(b) && SHA.test(b.sha256));
        const rawBatch = await store.read(`${name}.batch-${String(b.index).padStart(5, '0')}`);
        requireValue(rawBatch);
        // Wire body can contain32 bounded logical responses; parse only the durable digest here.
        const batch = snapshot(rawBatch) as {
          complete: boolean;
          bytes: number;
          request: unknown[];
          mapping: Array<{ requests: unknown[] }>;
          startedAtMs: number;
          responseBody: string;
          responseSha256: string;
        };
        requireValue(
          digest(batch) === b.sha256 &&
            batch.complete === true &&
            typeof batch.responseBody === 'string' &&
            Buffer.byteLength(batch.responseBody) <= 8 * 1024 * 1024 &&
            createHash('sha256').update(batch.responseBody).digest('hex') === batch.responseSha256 &&
            batch.bytes === Buffer.byteLength(batch.responseBody)
        );
        if (p.version === 2)
          for (const projection of catalogCodeProjectionDigests(batch)) codeProjections.add(projection);
        integer(batch.startedAtMs);
        requireValue(batch.startedAtMs >= previous + 125 && batch.request.length >= 1 && batch.request.length <= 32);
        previous = batch.startedAtMs;
        bytes += batch.bytes;
        wireCalls += batch.request.length;
        logicalCalls += batch.mapping.reduce((n, m) => n + m.requests.length, 0);
      }
      requireValue(
        bytes === saved.stats.responseBytes &&
          wireCalls === saved.stats.wireRpcCalls &&
          logicalCalls === saved.stats.logicalRpcCalls &&
          previous === saved.stats.lastStartedAtMs
      );
      addTransport(saved.stats);
      loadedGroups.add(name);
      if (p.version === 2) groupCodeProjections.set(name, codeProjections);
    }
    return groupCodeProjections.get(name);
  };
  let index = 0;
  while (index < plan.length) {
    const s = plan[index],
      complete = await store.read(`${s.name}.complete`),
      failed = await store.read(`${s.name}.failed`),
      started = await store.read(`${s.name}.started`);
    if (failed !== undefined) return result('unavailable', 'previous-shard-failure');
    if (complete !== undefined) {
      const saved = snapshot(complete) as ShardBody & { sha256: string };
      const { sha256, ...body } = saved;
      fields(saved, [
        'version',
        'kind',
        'protocolSha256',
        'index',
        'rangeId',
        'firstHeight',
        'lastHeight',
        'schema',
        'blocks',
        ...(p.version === 2 ? ['blockProfiles'] : []),
        'rpcEvidence',
        'counts',
        'transportGroup',
        'sha256',
      ]);
      requireValue(
        SHA.test(sha256) &&
          digest(body) === sha256 &&
          saved.version === p.version &&
          saved.kind === (p.version === 2 ? 'complete-catalog-metadata-shard' : 'complete-metadata-shard') &&
          saved.protocolSha256 === protocolSha256 &&
          saved.index === index &&
          saved.rangeId === s.range.id &&
          saved.firstHeight === s.first &&
          saved.lastHeight === s.last &&
          same(saved.schema, p.schema) &&
          same(snapshot(started), startedFor(s))
      );
      fields(saved.counts, ['blocks', 'rpcCalls', 'responseBytes']);
      Object.values(saved.counts).forEach(integer);
      requireValue(
        saved.counts.blocks === s.last - s.first + 1 &&
          saved.counts.rpcCalls === saved.rpcEvidence.length &&
          saved.counts.rpcCalls === initCalls + 4 * saved.counts.blocks &&
          saved.counts.responseBytes <= maximumShardBytes &&
          saved.counts.responseBytes ===
            saved.rpcEvidence.reduce((n, r) => n + Buffer.byteLength(r.responseBody ?? ''), 0)
      );
      const wireProjections = await loadGroup(saved.transportGroup, index);
      validateProfiles(saved.blockProfiles, saved.blocks, saved.rpcEvidence, wireProjections);
      accept(saved.blocks, s);
      if (saved.blockProfiles) blockProfiles.push(...saved.blockProfiles);
      counts.blocks += saved.blocks.length;
      counts.shards++;
      reusedShards++;
      index++;
      progress();
      continue;
    }
    if (started !== undefined) return result('unavailable', 'inflight-shard-unresolved');
    if (options.signal?.aborted || freshShards >= cap) return result('paused');
    const group: typeof plan = [];
    for (let i = index; i < Math.min(plan.length, index + 32, index + cap - freshShards); i++) {
      const candidate = plan[i];
      if (
        i !== index &&
        ((await store.read(`${candidate.name}.started`)) !== undefined ||
          (await store.read(`${candidate.name}.complete`)) !== undefined ||
          (await store.read(`${candidate.name}.failed`)) !== undefined)
      )
        break;
      group.push(candidate);
    }
    const name = `group-${String(index).padStart(5, '0')}`;
    const groupController = new AbortController();
    const signal = options.signal ? AbortSignal.any([options.signal, groupController.signal]) : groupController.signal;
    const batches: Array<{ index: number; sha256: string }> = [];
    const codeProjections = new Set<string>();
    for (const item of group) await store.writeOnce(`${item.name}.started`, startedFor(item));
    const transport = createGoalMetadataBatchTransport({
      ...(p.version === 2 ? { policyVersion: 2 as const } : {}),
      fetch: options.fetch,
      signal,
      now: options.now,
      sleep: options.sleep,
      previousStartedAtMs: lastStart,
      budget: {
        logicalRpcCalls: p.budget.rpcCalls - counts.rpcCalls,
        httpStarts: p.budget.maximumHttpStarts - counts.httpStarts,
        responseBytes: p.budget.totalBytes - counts.responseBytes,
      },
      sink: async (batchIndex, evidence) => {
        await store.writeOnce(`${name}.batch-${String(batchIndex).padStart(5, '0')}`, evidence);
        batches.push({ index: batchIndex, sha256: digest(evidence) });
        if (p.version === 2)
          for (const projection of catalogCodeProjectionDigests(evidence)) codeProjections.add(projection);
      },
    });
    const collected = await Promise.all(
      group.map(async (item) => {
        let reader: Reader | CatalogReader | undefined;
        try {
          if (p.version === 2) {
            requireValue(catalog);
            const factory =
              (options as GoalQualificationCatalogMetadataOptions).readerFactory ??
              createCatalogHistoricalExecutionBlockReader;
            reader = await factory(p.source, { catalog, fetch: transport.fetch, signal });
            const context = reader.context;
            requireValue(same({ catalogSha256: context.catalogSha256, profiles: context.profiles }, p.schema));
          } else {
            const factory =
              (options as GoalQualificationMetadataOptions).readerFactory ?? createHistoricalExecutionBlockReader;
            reader = await factory(p.source, { fetch: transport.fetch, signal });
            requireValue(same(reader.context.schema, p.schema));
          }
          const rows: HistoricalClockBlock[] = [];
          for (let h = item.first; h <= item.last; h++) {
            if (signal.aborted) throw Error('aborted');
            rows.push(snapshot(await reader.readBlock(h)));
          }
          const rpcEvidence = reader.evidence();
          requireValue(rpcEvidence.length === initCalls + 4 * rows.length);
          const responseBytes = rpcEvidence.reduce((n, r) => n + Buffer.byteLength(r.responseBody ?? ''), 0);
          requireValue(responseBytes <= maximumShardBytes);
          const profiles = p.version === 2 ? snapshot((reader as CatalogReader).blockProfiles()) : undefined;
          validateProfiles(profiles, rows, rpcEvidence, codeProjections);
          return { item, rows, rpcEvidence, responseBytes, profiles };
        } catch (error) {
          groupController.abort();
          return {
            item,
            error,
            rpcEvidence: reader?.evidence() ?? [],
            ...(error instanceof HistoricalExecutionBlockReadError ? { diagnostic: error.diagnostic } : {}),
          };
        }
      })
    );
    await transport.drain();
    const stats = transport.stats();
    transport.close();
    let failure = collected.some((r) => 'error' in r),
      validated = false;
    const previousLength = blocks.length;
    if (!failure)
      try {
        for (const r of collected) {
          if ('rows' in r) accept(r.rows!, r.item);
        }
        validated = true;
      } catch {
        failure = true;
      }
    if (failure) {
      // Partial completed reads are evidence only, never published as accepted canonical rows.
      blocks.length = previousLength;
      hashes.clear();
      children.clear();
      for (const b of blocks) {
        hashes.set(b.hash, b.height);
        children.set(b.parentHash, b.height);
      }
      for (const r of collected)
        await store.writeOnce(
          `${r.item.name}.failed`,
          snapshot({
            protocolSha256,
            index: r.item.index,
            reason: signal.aborted ? 'aborted' : 'metadata-read-failed',
            transportGroup: name,
            rpcEvidence: r.rpcEvidence,
            ...('diagnostic' in r ? { diagnostic: r.diagnostic } : {}),
          })
        );
      await store.writeOnce(`${name}.failed`, { protocolSha256, indices: group.map((s) => s.index), stats, batches });
      addTransport(stats);
      return result('unavailable', 'metadata-read-failed');
    }
    requireValue(validated);
    const groupBody = { protocolSha256, indices: group.map((s) => s.index), stats, batches };
    await store.writeOnce(`${name}.complete`, { ...groupBody, sha256: digest(groupBody) });
    for (const r of collected) {
      requireValue('rows' in r);
      const body: ShardBody = {
        version: p.version,
        kind: p.version === 2 ? 'complete-catalog-metadata-shard' : 'complete-metadata-shard',
        protocolSha256,
        index: r.item.index,
        rangeId: r.item.range.id,
        firstHeight: r.item.first,
        lastHeight: r.item.last,
        schema: p.schema,
        blocks: r.rows!,
        ...(p.version === 2 ? { blockProfiles: r.profiles! } : {}),
        rpcEvidence: r.rpcEvidence,
        counts: { blocks: r.rows!.length, rpcCalls: r.rpcEvidence.length, responseBytes: r.responseBytes! },
        transportGroup: name,
      };
      await store.writeOnce(`${r.item.name}.complete`, snapshot({ ...body, sha256: digest(body) }));
      if (r.profiles) blockProfiles.push(...r.profiles);
      counts.blocks += r.rows!.length;
      counts.shards++;
      freshShards++;
    }
    addTransport(stats);
    loadedGroups.add(name);
    if (p.version === 2) groupCodeProjections.set(name, codeProjections);
    index += group.length;
    progress();
  }
  requireValue(counts.blocks === p.budget.blocks && counts.shards === p.budget.shards);
  return result('complete');
}
