/** Exact raw metadata replay for the archive pool-mark reader only. Never a quote/history fallback. */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionBlockReader,
  createCatalogHistoricalExecutionBlockReader,
  historicalCatalogProfileSha256,
  type CatalogHistoricalBlockReaderSource,
  type CatalogHistoricalBlockProfile,
  type HistoricalBlockRpcEvidence,
} from './historical-execution-block-reader';
import { createHistoricalExecutionPoolCodec } from './historical-execution-pool-codec';
import type { HistoricalClockBlock } from './historical-execution-clock';
import {
  goalQualificationCatalogMetadataBudget,
  goalQualificationCatalogMetadataSchema,
  type GoalQualificationMetadataProtocol,
} from './goal-qualification-metadata-collector';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
  type GoalRuntimeCatalogProfile,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';

const ENDPOINT = 'https://mof2.sora.org/';
const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const TIME = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const CODE = '0x3a636f6465';
export const GOAL_METADATA_REPLAY_POLICY = Object.freeze({
  id: 'verified-canonical-metadata-cache-v1',
  lane: 'pool-mark-reader-only',
  maximumCalls: 100000,
  maximumArtifactReads: 50000,
  maximumArtifactBytes: 4 * 1024 ** 3,
  maximumOperationMs: 30000,
  shardCache: 8,
  groupCache: 2,
  missingMetadata: 'reject-no-network-fallback',
  responseProjection: 'restore-caller-json-rpc-id-only',
} as const);
export const GOAL_CATALOG_METADATA_REPLAY_POLICY = Object.freeze({
  ...GOAL_METADATA_REPLAY_POLICY,
  id: 'verified-canonical-catalog-metadata-cache-v2',
  maximumArtifactBytes: 12 * 1024 ** 3,
} as const);
type ReplayPolicy = typeof GOAL_METADATA_REPLAY_POLICY.id | typeof GOAL_CATALOG_METADATA_REPLAY_POLICY.id;
export interface GoalMetadataReplayInput {
  policy: typeof GOAL_METADATA_REPLAY_POLICY.id;
  manifestSha256: string;
  verificationSha256: string;
  rawManifestSha256: string;
  partition: 'training' | 'validation' | 'development';
  blocksSha256: string;
  /** Chosen before market access. All source/finality/schema reads use this attestation shard. */
  initShardIndex: number;
}
export interface GoalCatalogMetadataReplayInput extends Omit<GoalMetadataReplayInput, 'policy'> {
  policy: typeof GOAL_CATALOG_METADATA_REPLAY_POLICY.id;
}
export interface GoalMetadataReplayEvidence<Policy extends ReplayPolicy = typeof GOAL_METADATA_REPLAY_POLICY.id> {
  kind: 'verified-metadata-cache-hit';
  policy: Policy;
  bindingSha256: string;
  callerId: number;
  method: string;
  params: readonly unknown[];
  requestedAtMs: number;
  shardIndex: number;
  shardSha256: string;
  /** Exact content matches; preserve every compatible original batch if IDs were reused across shards. */
  wireMatches: readonly Readonly<Wire>[];
  originalId: number;
  originalRequestedAt: string;
  originalCompletedAt: string;
  originalProjectionSha256: string;
  returnedProjectionSha256: string;
  arrivalTimeKnown: false;
}
export interface GoalMetadataReplayOptions {
  /** Exact UTF-8 files; names are an allowlisted logical namespace, never caller paths. */
  readArtifact(name: string, signal: AbortSignal): Promise<string>;
  /** Only the exact metadata-derived seven-key pool storage call can reach this transport. */
  liveFetch: typeof fetch;
  /** Durably retain every cache-use receipt before its response is released. */
  retainEvidence(receipt: Readonly<GoalMetadataReplayEvidence>): Promise<void>;
  signal?: AbortSignal;
}
export interface GoalCatalogMetadataReplayOptions extends Omit<GoalMetadataReplayOptions, 'retainEvidence'> {
  catalog: GoalRuntimeCatalog;
  retainEvidence(
    receipt: Readonly<GoalMetadataReplayEvidence<typeof GOAL_CATALOG_METADATA_REPLAY_POLICY.id>>
  ): Promise<void>;
}
export interface GoalCatalogMetadataBlockProfile extends CatalogHistoricalBlockProfile {
  readonly profile: GoalRuntimeCatalogProfile;
  readonly catalogSha256: string;
  readonly bindingSha256: string;
  readonly shardIndex: number;
  readonly shardSha256: string;
}
const profileOwners = new WeakMap<
  object,
  { catalog: GoalRuntimeCatalog; bindingSha256: string; assertCurrent(): void }
>();
/** Require an original verified block association; failure/cancellation revokes its issuing transport. */
export function assertGoalCatalogMetadataBlockProfile(
  value: unknown,
  expected?: { catalog?: GoalRuntimeCatalog; bindingSha256?: string }
): asserts value is GoalCatalogMetadataBlockProfile {
  check(value && typeof value === 'object');
  const owner = profileOwners.get(value);
  check(owner);
  owner.assertCurrent();
  if (expected !== undefined) {
    const fields = plain(expected);
    check(Object.keys(fields).every((key) => ['catalog', 'bindingSha256'].includes(key)));
    if (fields.catalog !== undefined) {
      assertGoalRuntimeCatalog(fields.catalog);
      check(fields.catalog === owner.catalog);
    }
    if (fields.bindingSha256 !== undefined) check(fields.bindingSha256 === owner.bindingSha256);
  }
}
type Json = Record<string, any>; // Raw JSON is bounded and validated before semantic use below.
type Wire = {
  groupSha256: string;
  wireBatchIndex: number;
  wireRpcId: number;
  wireBatchSha256: string;
  wireResponseSha256: string;
  wireStartedAtMs: number;
  wireCompletedAtMs: number;
};
type LoadedShard = {
  index: number;
  sha256: string;
  records: Map<string, { receipt: HistoricalBlockRpcEvidence; wire: Wire[] }>;
  metadataHex: string;
  blockProfiles?: readonly CatalogHistoricalBlockProfile[];
};
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function check(value: unknown): asserts value {
  if (!value) throw Error('metadata-cache-unavailable');
}
function plain(value: unknown): Json {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype);
  const d = Object.getOwnPropertyDescriptors(value);
  check(Reflect.ownKeys(d).every((k) => typeof k === 'string' && d[k].enumerable && 'value' in d[k]));
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.value]));
}
function exact(value: unknown, keys: string[]): Json {
  const result = plain(value);
  check(Object.keys(result).length === keys.length && keys.every((k) => Object.hasOwn(result, k)));
  return result;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function validateBlock(value: unknown): HistoricalClockBlock {
  const b = exact(value, ['height', 'hash', 'parentHash', 'timestampMs']);
  check(
    Number.isSafeInteger(b.height) &&
      b.height > 0 &&
      b.height <= 0xffffffff &&
      Number.isSafeInteger(b.timestampMs) &&
      b.timestampMs >= 0 &&
      HASH.test(b.hash) &&
      HASH.test(b.parentHash) &&
      b.hash !== b.parentHash
  );
  return b as HistoricalClockBlock;
}
function requestKey(method: string, params: unknown) {
  return canonical([method, params]);
}
function projectedKey(id: number, method: string, params: unknown, body: string) {
  return sha(canonical({ id, method, params, responseBody: body }));
}
function wait<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(Error('metadata-cache-unavailable'));
    };
    signal.addEventListener('abort', abort, { once: true });
    pending.then(
      (v) => {
        signal.removeEventListener('abort', abort);
        signal.aborted ? abort() : resolve(v);
      },
      () => abort()
    );
    if (signal.aborted) abort();
  });
}
export interface GoalMetadataReplayRawEntry {
  name: string;
  sha256: string;
  bytes: number;
}
/** Build only an index of already verified raw metadata files; this helper performs no reads or attestation. */
export function buildGoalMetadataReplayRawManifest(
  binding: { manifestSha256: string; verificationSha256: string },
  entries: readonly GoalMetadataReplayRawEntry[]
) {
  const b = exact(binding, ['manifestSha256', 'verificationSha256']);
  check(SHA.test(b.manifestSha256) && SHA.test(b.verificationSha256));
  check(
    Array.isArray(entries) &&
      Object.getPrototypeOf(entries) === Array.prototype &&
      entries.length > 0 &&
      entries.length <= 25000
  );
  const descriptors = Object.getOwnPropertyDescriptors(entries);
  check(Reflect.ownKeys(descriptors).length === entries.length + 1);
  const seen = new Set<string>();
  const files = Array.from({ length: entries.length }, (_, i) => {
    check(descriptors[i]?.enumerable && 'value' in descriptors[i]);
    const e = exact(descriptors[i].value, ['name', 'sha256', 'bytes']);
    check(
      typeof e.name === 'string' &&
        /^(?:shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(e.name) &&
        !seen.has(e.name) &&
        SHA.test(e.sha256) &&
        Number.isSafeInteger(e.bytes) &&
        e.bytes > 0 &&
        e.bytes <= 8 * 1024 * 1024
    );
    seen.add(e.name);
    return e as GoalMetadataReplayRawEntry;
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return freeze({
    version: 1 as const,
    kind: 'verified-callback-raw-manifest-v1' as const,
    manifestSha256: b.manifestSha256 as string,
    verificationSha256: b.verificationSha256 as string,
    files,
  });
}
/**
 * Hash-bound raw files are validated lazily and replayed through the actual canonical block reader.
 * The caller must preregister this policy, input hashes and implementation hash. No digest alone
 * grants qualification; upstream study access and all ordinary provider limits remain mandatory.
 */
export async function createGoalMetadataReplayTransport(
  rawInput: GoalMetadataReplayInput,
  rawOptions: GoalMetadataReplayOptions
) {
  return createReplayTransport(rawInput, rawOptions, false);
}
/** Exact catalog metadata replay; only the constructor with owned catalog evidence accepts v2. */
export async function createGoalCatalogMetadataReplayTransport(
  rawInput: GoalCatalogMetadataReplayInput,
  rawOptions: GoalCatalogMetadataReplayOptions
) {
  const result = await createReplayTransport(rawInput, rawOptions, true);
  check(result.profileForBlock);
  return Object.freeze({ ...result, profileForBlock: result.profileForBlock });
}
async function createReplayTransport(
  rawInput: GoalMetadataReplayInput | GoalCatalogMetadataReplayInput,
  rawOptions: GoalMetadataReplayOptions | GoalCatalogMetadataReplayOptions,
  catalogMode: boolean
) {
  const policy = catalogMode ? GOAL_CATALOG_METADATA_REPLAY_POLICY : GOAL_METADATA_REPLAY_POLICY;
  const initCalls = catalogMode ? 20 : 10;
  const input = exact(rawInput, [
    'policy',
    'manifestSha256',
    'verificationSha256',
    'rawManifestSha256',
    'partition',
    'blocksSha256',
    'initShardIndex',
  ]) as GoalMetadataReplayInput | GoalCatalogMetadataReplayInput;
  check(
    input.policy === policy.id &&
      ['training', 'validation', 'development'].includes(input.partition) &&
      [input.manifestSha256, input.verificationSha256, input.rawManifestSha256, input.blocksSha256].every(
        (v) => typeof v === 'string' && SHA.test(v)
      ) &&
      Number.isSafeInteger(input.initShardIndex) &&
      input.initShardIndex >= 0
  );
  const options = plain(rawOptions);
  check(
    Object.keys(options).every((k) =>
      ['readArtifact', 'liveFetch', 'retainEvidence', 'signal', ...(catalogMode ? ['catalog'] : [])].includes(k)
    ) &&
      typeof options.readArtifact === 'function' &&
      typeof options.liveFetch === 'function' &&
      typeof options.retainEvidence === 'function' &&
      (options.signal === undefined || options.signal instanceof AbortSignal)
  );
  const catalog = catalogMode ? options.catalog : undefined;
  if (catalogMode) assertGoalRuntimeCatalog(catalog);
  const owned = Object.freeze({ ...input }),
    readArtifact = options.readArtifact as GoalMetadataReplayOptions['readArtifact'],
    liveFetch = options.liveFetch as typeof fetch,
    retain = options.retainEvidence as (receipt: Readonly<GoalMetadataReplayEvidence<ReplayPolicy>>) => Promise<void>,
    parentSignal = options.signal as AbortSignal | undefined;
  let artifactReads = 0,
    artifactBytes = 0,
    calls = 0,
    delegatedPoolCalls = 0,
    stopped = false,
    active = false;
  const evidence: Readonly<GoalMetadataReplayEvidence<ReplayPolicy>>[] = [];
  const operation = (signal?: AbortSignal) =>
    AbortSignal.any([
      AbortSignal.timeout(policy.maximumOperationMs),
      ...(parentSignal ? [parentSignal] : []),
      ...(signal ? [signal] : []),
    ]);
  const fresh = (signal: AbortSignal) => check(!stopped && !signal.aborted);
  let rawFiles: Map<string, { sha256: string; bytes: number }> | undefined;
  const read = async (name: string, signal: AbortSignal, expected?: string, maxBytes = 8 * 1024 * 1024) => {
    fresh(signal);
    check(
      /^(?:run-protocol|verification|raw-manifest|blocks-(?:training|validation|development)|shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(
        name
      ) && ++artifactReads <= policy.maximumArtifactReads
    );
    const raw = await wait(readArtifact(name, signal), signal);
    fresh(signal);
    check(typeof raw === 'string');
    const bytes = Buffer.byteLength(raw);
    artifactBytes += bytes;
    check(bytes <= maxBytes && artifactBytes <= policy.maximumArtifactBytes && (!expected || sha(raw) === expected));
    if (name.startsWith('shard-') || name.startsWith('group-')) {
      const fixed = rawFiles?.get(name);
      check(fixed && fixed.bytes === bytes && sha(raw) === fixed.sha256);
    }
    return JSON.parse(raw) as Json;
  };
  const startup = operation();
  const manifest = await read('run-protocol', startup, owned.manifestSha256),
    verification = await read('verification', startup, owned.verificationSha256);
  const rawManifest = await read('raw-manifest', startup, owned.rawManifestSha256);
  const checkedRawManifest = buildGoalMetadataReplayRawManifest(
    { manifestSha256: owned.manifestSha256, verificationSha256: owned.verificationSha256 },
    rawManifest.files
  );
  check(same(rawManifest, checkedRawManifest));
  rawFiles = new Map(checkedRawManifest.files.map((f) => [f.name, f]));
  const protocol = manifest.protocol as Json;
  check(
    manifest.protocolSha256 === sha(canonical(protocol)) &&
      protocol.version === (catalogMode ? 2 : 1) &&
      protocol.kind ===
        (catalogMode ? 'qualification-callback-metadata-catalog-v2' : 'qualification-callback-metadata-v1') &&
      Array.isArray(protocol.ranges) &&
      protocol.ranges.length <= 3 &&
      Array.isArray(verification.partitions)
  );
  if (catalogMode) {
    assertGoalRuntimeCatalog(catalog);
    exact(protocol, ['version', 'kind', 'source', 'schema', 'sourceHashes', 'ranges', 'budget']);
    check(same(protocol.schema, goalQualificationCatalogMetadataSchema(protocol.source, catalog)));
    check(same(protocol.budget, goalQualificationCatalogMetadataBudget(protocol.ranges)));
    check(protocol.ranges.every((r: Json) => r.last.height <= protocol.source.finalizedSource.height));
  }
  check(
    verification.verified === true &&
      verification.networkAttempts === 0 &&
      verification.sourceHashesUnchanged === true &&
      verification.preparedManifestSha256 === owned.manifestSha256 &&
      verification.protocolSha256 === manifest.protocolSha256 &&
      same(verification.sourceHashes, protocol.sourceHashes)
  );
  const selected = protocol.ranges.filter((r: Json) => r.id === owned.partition),
    exported = verification.partitions.filter((p: Json) => p.id === owned.partition);
  check(
    selected.length === 1 &&
      exported.length === 1 &&
      exported[0].sha256 === owned.blocksSha256 &&
      same(exported[0].first, selected[0].first) &&
      same(exported[0].last, selected[0].last)
  );
  const rawBlocks = await read(`blocks-${owned.partition}`, startup, owned.blocksSha256, 32 * 1024 * 1024);
  check(
    Array.isArray(rawBlocks) &&
      rawBlocks.length > 1 &&
      rawBlocks.length <= 100000 &&
      rawBlocks.length === exported[0].blocks
  );
  const blocks = (rawBlocks as unknown[]).map(validateBlock),
    byHeight = new Map<number, HistoricalClockBlock>(),
    byHash = new Map<string, HistoricalClockBlock>();
  blocks.forEach((b, i) => {
    check(
      !byHash.has(b.hash) &&
        (!i ||
          (b.height === blocks[i - 1].height + 1 &&
            b.parentHash === blocks[i - 1].hash &&
            b.timestampMs > blocks[i - 1].timestampMs))
    );
    byHeight.set(b.height, b);
    byHash.set(b.hash, b);
  });
  check(same(blocks[0], selected[0].first) && same(blocks.at(-1), selected[0].last));
  const plan: Array<{ index: number; rangeId: string; first: number; last: number }> = [];
  for (const range of protocol.ranges) {
    validateBlock(range.first);
    validateBlock(range.last);
    check(range.last.height >= range.first.height);
    for (let first = range.first.height; first <= range.last.height; first += 64) {
      check(plan.length < 2000);
      plan.push({ index: plan.length, rangeId: range.id, first, last: Math.min(first + 63, range.last.height) });
    }
  }
  check(
    plan.length === protocol.budget.shards &&
      owned.initShardIndex < plan.length &&
      rawFiles.has(`shard-${String(owned.initShardIndex).padStart(5, '0')}.complete`)
  );
  const shardCache = new Map<number, LoadedShard>(),
    groupCache = new Map<string, { indices: number[]; wires: Map<string, Wire[]> }>();
  const loadGroup = async (name: string, signal: AbortSignal) => {
    const cached = groupCache.get(name);
    if (cached) return cached;
    check(/^group-\d{5}$/.test(name));
    const group = await read(`${name}.complete`, signal),
      { sha256, ...body } = group;
    check(
      SHA.test(sha256) &&
        sha(canonical(body)) === sha256 &&
        group.protocolSha256 === manifest.protocolSha256 &&
        Array.isArray(group.indices) &&
        group.indices.length > 0 &&
        group.indices.length <= 32 &&
        Array.isArray(group.batches) &&
        group.batches.length <= (catalogMode ? 552 : 532) &&
        name === `group-${String(group.indices[0]).padStart(5, '0')}`
    );
    check(
      group.indices.every(
        (n: number, i: number) => Number.isSafeInteger(n) && !!plan[n] && (!i || n === group.indices[i - 1] + 1)
      )
    );
    const result = new Map<string, Wire[]>();
    let previous = 0;
    for (const [i, b] of group.batches.entries()) {
      check(b.index === i && SHA.test(b.sha256));
      const batch = await read(`${name}.batch-${String(i).padStart(5, '0')}`, signal);
      check(
        sha(canonical(batch)) === b.sha256 &&
          batch.complete === true &&
          typeof batch.responseBody === 'string' &&
          sha(batch.responseBody) === batch.responseSha256 &&
          Buffer.byteLength(batch.responseBody) === batch.bytes &&
          Number.isSafeInteger(batch.startedAtMs) &&
          batch.startedAtMs >= previous + 125 &&
          Number.isSafeInteger(batch.completedAtMs) &&
          batch.completedAtMs >= batch.startedAtMs
      );
      previous = batch.startedAtMs;
      check(
        Array.isArray(batch.request) &&
          batch.request.length > 0 &&
          batch.request.length <= 32 &&
          Array.isArray(batch.mapping) &&
          batch.mapping.length === batch.request.length
      );
      const replies = JSON.parse(batch.responseBody);
      check(Array.isArray(replies) && replies.length === batch.request.length);
      const responseMap = new Map(replies.map((r: Json) => [r.id, r]));
      check(responseMap.size === replies.length);
      for (const request of batch.request) {
        const response = responseMap.get(request.id) as Json | undefined,
          mappings = batch.mapping.filter((m: Json) => m.wireId === request.id);
        check(
          response &&
            response.jsonrpc === '2.0' &&
            Object.hasOwn(response, 'result') &&
            !Object.hasOwn(response, 'error') &&
            mappings.length === 1 &&
            Array.isArray(mappings[0].requests) &&
            mappings[0].requests.length > 0 &&
            mappings[0].requests.length <= 32
        );
        for (const member of mappings[0].requests) {
          check(Number.isSafeInteger(member.originalId) && member.originalId > 0);
          const projected = JSON.stringify({ ...response, id: member.originalId });
          const key = projectedKey(member.originalId, request.method, request.params, projected);
          const wire = {
            groupSha256: sha256,
            wireBatchIndex: i,
            wireRpcId: request.id,
            wireBatchSha256: b.sha256,
            wireResponseSha256: batch.responseSha256,
            wireStartedAtMs: batch.startedAtMs,
            wireCompletedAtMs: batch.completedAtMs,
          };
          const old = result.get(key);
          if (!old) result.set(key, [wire]);
          else if (!old.some((value) => same(value, wire))) old.push(wire);
        }
      }
    }
    if (groupCache.size >= policy.groupCache) groupCache.delete(groupCache.keys().next().value!);
    const entry = { indices: group.indices as number[], wires: result };
    groupCache.set(name, entry);
    return entry;
  };
  const loadShard = async (index: number, signal: AbortSignal): Promise<LoadedShard> => {
    const cached = shardCache.get(index);
    if (cached) return cached;
    const p = plan[index];
    check(p && (p.rangeId === owned.partition || index === owned.initShardIndex));
    const shard = await read(`shard-${String(index).padStart(5, '0')}.complete`, signal),
      { sha256, ...body } = shard;
    check(
      SHA.test(sha256) &&
        sha(canonical(body)) === sha256 &&
        shard.version === (catalogMode ? 2 : 1) &&
        shard.kind === (catalogMode ? 'complete-catalog-metadata-shard' : 'complete-metadata-shard') &&
        shard.protocolSha256 === manifest.protocolSha256 &&
        shard.index === index &&
        shard.rangeId === p.rangeId &&
        shard.firstHeight === p.first &&
        shard.lastHeight === p.last &&
        same(shard.schema, protocol.schema) &&
        Array.isArray(shard.blocks) &&
        Array.isArray(shard.rpcEvidence) &&
        shard.rpcEvidence.length === initCalls + 4 * (p.last - p.first + 1)
    );
    const group = await loadGroup(shard.transportGroup, signal),
      wires = group.wires,
      records = new Map<string, { receipt: HistoricalBlockRpcEvidence; wire: Wire[] }>();
    check(group.indices.includes(index));
    for (const r of shard.rpcEvidence as HistoricalBlockRpcEvidence[]) {
      check(
        r.httpStatus === 200 &&
          !r.failure &&
          typeof r.responseBody === 'string' &&
          sha(r.responseBody) === r.responseSha256 &&
          typeof r.requestedAt === 'string' &&
          Number.isFinite(Date.parse(r.requestedAt)) &&
          typeof r.completedAt === 'string' &&
          Date.parse(r.completedAt) >= Date.parse(r.requestedAt)
      );
      const wire = wires.get(projectedKey(r.id, r.method, r.params, r.responseBody));
      check(wire && wire.length > 0);
      const key = requestKey(r.method, r.params),
        old = records.get(key);
      if (old)
        check(
          JSON.parse(old.receipt.responseBody!).result !== undefined &&
            same(JSON.parse(old.receipt.responseBody!).result, JSON.parse(r.responseBody).result)
        );
      else records.set(key, { receipt: freeze(r), wire: freeze(wire) });
    }
    let cursor = 0;
    const replayFetch: typeof fetch = async (url, init) => {
      fresh(signal);
      check(url === ENDPOINT && init?.method === 'POST' && typeof init.body === 'string');
      const request = JSON.parse(init.body),
        r = shard.rpcEvidence[cursor++];
      check(
        r &&
          request.jsonrpc === '2.0' &&
          request.id === r.id &&
          request.method === r.method &&
          same(request.params, r.params)
      );
      return new Response(r.responseBody, { status: 200 });
    };
    const reader = catalogMode
      ? await createCatalogHistoricalExecutionBlockReader(protocol.source as CatalogHistoricalBlockReaderSource, {
          catalog: catalog!,
          signal,
          fetch: replayFetch,
        })
      : await createHistoricalExecutionBlockReader(protocol.source as GoalQualificationMetadataProtocol['source'], {
          signal,
          fetch: replayFetch,
        });
    if ('blockProfiles' in reader) {
      check(same({ catalogSha256: reader.context.catalogSha256, profiles: reader.context.profiles }, protocol.schema));
    } else check(same(reader.context.schema, protocol.schema));
    for (let height = p.first; height <= p.last; height++) {
      const block = await reader.readBlock(height);
      check(
        same(block, shard.blocks[height - p.first]) &&
          (p.rangeId !== owned.partition || same(block, byHeight.get(height)))
      );
    }
    check(cursor === shard.rpcEvidence.length);
    let metadataHex = '';
    let blockProfiles: readonly CatalogHistoricalBlockProfile[] | undefined;
    if ('blockProfiles' in reader) {
      blockProfiles = reader.blockProfiles();
      check(
        Array.isArray(shard.blockProfiles) &&
          same(blockProfiles, shard.blockProfiles) &&
          blockProfiles.length === p.last - p.first + 1
      );
      const responseBytes = shard.rpcEvidence.reduce(
        (n: number, r: HistoricalBlockRpcEvidence) => n + Buffer.byteLength(r.responseBody!),
        0
      );
      check(
        responseBytes <= 6 * 1024 * 1024 &&
          same(shard.counts, { blocks: blockProfiles.length, rpcCalls: shard.rpcEvidence.length, responseBytes })
      );
    } else {
      const metadata = records.get(requestKey('state_getMetadata', [protocol.source.schemaAnchor.hash]));
      check(metadata);
      metadataHex = JSON.parse(metadata.receipt.responseBody!).result;
      check(typeof metadataHex === 'string');
    }
    const result = { index, sha256, records, metadataHex, ...(blockProfiles ? { blockProfiles } : {}) };
    if (shardCache.size >= policy.shardCache) {
      const first = [...shardCache.keys()].find((k) => k !== owned.initShardIndex);
      if (first !== undefined) shardCache.delete(first);
    }
    shardCache.set(index, result);
    return result;
  };
  const initial = await loadShard(owned.initShardIndex, startup);
  const catalogStorageKeys = (codeHash: string): string[] => {
    check(catalogMode);
    assertGoalRuntimeCatalog(catalog);
    const entry = lookupGoalRuntimeCatalogEntry(catalog, codeHash);
    check(entry.role === 'historical-source');
    return ['timestamp', 'denominator', 'kusd', 'xor', 'dex', 'properties', 'reserves'].map(
      (label) => entry.storage[label as keyof typeof entry.storage].keyHex
    );
  };
  const storageKeys = catalogMode
    ? undefined
    : Object.values(
        createHistoricalExecutionPoolCodec({
          genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
          blockHash: protocol.source.schemaAnchor.hash,
          metadataHex: initial.metadataHex,
          runtimeVersion: {
            specVersion: protocol.schema.runtimeVersion.specVersion,
            transactionVersion: protocol.schema.runtimeVersion.transactionVersion,
          },
        }).storageKeys()
      );
  check(catalogMode || storageKeys?.length === 7);
  const initKeys = new Set<string>();
  // Derive initialization exclusively from the original reader calls; never rewrite anchor parameters.
  const initRaw = await read(`shard-${String(owned.initShardIndex).padStart(5, '0')}.complete`, startup);
  for (const r of initRaw.rpcEvidence.slice(0, initCalls)) initKeys.add(requestKey(r.method, r.params));
  const binding = freeze({
    ...owned,
    policyDefinition: policy,
    protocolSha256: manifest.protocolSha256,
    source: protocol.source,
    schema: protocol.schema,
    sourceHashes: protocol.sourceHashes,
  });
  const bindingSha256 = sha(canonical(binding));
  const provenProfile = async (
    hash: unknown,
    height: unknown,
    signal: AbortSignal
  ): Promise<GoalCatalogMetadataBlockProfile> => {
    assertGoalRuntimeCatalog(catalog);
    check(typeof hash === 'string' && HASH.test(hash) && Number.isSafeInteger(height));
    const block = byHash.get(hash);
    check(block && block.height === height);
    const owner = plan.find((p) => p.rangeId === owned.partition && block.height >= p.first && block.height <= p.last);
    check(owner);
    const shard = await loadShard(owner.index, signal);
    const association = shard.blockProfiles?.find((r) => r.height === height && r.hash === hash);
    check(association);
    const entry = lookupGoalRuntimeCatalogEntry(catalog, association.codeHash);
    check(
      entry.role === 'historical-source' && historicalCatalogProfileSha256(entry.profile) === association.profileSha256
    );
    const value = freeze({
      ...association,
      profile: entry.profile,
      catalogSha256: catalog.catalogSha256,
      bindingSha256,
      shardIndex: shard.index,
      shardSha256: shard.sha256,
    });
    fresh(signal);
    profileOwners.set(value, {
      catalog,
      bindingSha256,
      assertCurrent: () => check(!stopped && !parentSignal?.aborted),
    });
    return value;
  };
  const profileForBlock = async (hash: unknown, height: unknown): Promise<GoalCatalogMetadataBlockProfile> => {
    check(!active && !stopped);
    active = true;
    try {
      check(++calls <= policy.maximumCalls);
      return await provenProfile(hash, height, operation());
    } catch {
      stopped = true;
      throw Error('metadata-cache-unavailable');
    } finally {
      active = false;
    }
  };
  fresh(startup);
  const cachedFetch: typeof fetch = async (url, init) => {
    check(!active && !stopped);
    active = true;
    try {
      const args = plain(init);
      check(
        url === ENDPOINT &&
          args.method === 'POST' &&
          typeof args.body === 'string' &&
          Buffer.byteLength(args.body) <= 16384 &&
          (args.signal === undefined || args.signal instanceof AbortSignal)
      );
      const signal = operation(args.signal);
      fresh(signal);
      check(++calls <= policy.maximumCalls);
      const request = exact(JSON.parse(args.body), ['jsonrpc', 'id', 'method', 'params']);
      check(
        request.jsonrpc === '2.0' &&
          Number.isSafeInteger(request.id) &&
          request.id > 0 &&
          typeof request.method === 'string' &&
          Array.isArray(request.params)
      );
      const key = requestKey(request.method, request.params);
      if (request.method === 'state_queryStorageAt') {
        check(request.params.length === 2 && byHash.has(request.params[1]));
        const selected = byHash.get(request.params[1])!;
        const exactKeys = catalogMode
          ? catalogStorageKeys((await provenProfile(selected.hash, selected.height, signal)).codeHash)
          : storageKeys;
        check(same(request.params[0], exactKeys));
        delegatedPoolCalls++;
        const result = await wait(
          liveFetch(ENDPOINT, {
            method: 'POST',
            body: args.body,
            headers: { 'content-type': 'application/json' },
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
            signal,
          }),
          signal
        );
        fresh(signal);
        return result;
      }
      let index = owned.initShardIndex;
      if (!initKeys.has(key)) {
        let block: HistoricalClockBlock | undefined;
        if (
          request.method === 'chain_getBlockHash' &&
          request.params.length === 1 &&
          Number.isSafeInteger(request.params[0])
        )
          block = byHeight.get(request.params[0]);
        else if (request.method === 'chain_getHeader' && request.params.length === 1)
          block = byHash.get(request.params[0]);
        else if (request.method === 'state_getStorageHash' && request.params.length === 2 && request.params[0] === CODE)
          block = byHash.get(request.params[1]);
        else if (request.method === 'state_getStorage' && request.params.length === 2 && request.params[0] === TIME)
          block = byHash.get(request.params[1]);
        check(block);
        const owner = plan.find(
          (p) => p.rangeId === owned.partition && block!.height >= p.first && block!.height <= p.last
        );
        check(owner);
        index = owner.index;
      }
      const shard = await loadShard(index, signal),
        match = shard.records.get(key);
      check(match);
      const original = JSON.parse(match.receipt.responseBody!),
        projected = JSON.stringify({ ...original, id: request.id });
      const receipt = freeze({
        kind: 'verified-metadata-cache-hit' as const,
        policy: policy.id,
        bindingSha256,
        callerId: request.id,
        method: request.method,
        params: request.params,
        requestedAtMs: Date.now(),
        shardIndex: index,
        shardSha256: shard.sha256,
        wireMatches: match.wire,
        originalId: match.receipt.id,
        originalRequestedAt: match.receipt.requestedAt,
        originalCompletedAt: match.receipt.completedAt!,
        originalProjectionSha256: match.receipt.responseSha256!,
        returnedProjectionSha256: sha(projected),
        arrivalTimeKnown: false as const,
      });
      await wait(retain(receipt), signal);
      fresh(signal);
      evidence.push(receipt);
      return new Response(projected, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
      stopped = true;
      throw Error('metadata-cache-unavailable');
    } finally {
      active = false;
    }
  };
  return Object.freeze({
    fetch: cachedFetch,
    ...(catalogMode ? { profileForBlock } : {}),
    binding,
    bindingSha256,
    evidence: () => Object.freeze([...evidence]),
    counts: () =>
      Object.freeze({
        calls,
        cachedReplies: evidence.length,
        delegatedPoolCalls,
        artifactReads,
        artifactBytes,
        stopped,
      }),
  });
}
