/** Offline re-verification of original archive valuation bytes. No transport, wall clock or qualification authority. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { xxhashAsHex } from '@polkadot/util-crypto';
import { createHistoricalExecutionPoolCodec, prepareHistoricalExecutionPoolIdentity } from './execution-codecs/pool';
import { createCatalogHistoricalExecutionPoolCodec } from './execution-codecs/catalog-pool';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
  type GoalRuntimeCatalogEntry,
} from './execution-codecs/runtime-catalog';
import {
  assertGoalBundleCatalogMetadata,
  getGoalBundleVerifiedMetadataCatalog,
  type GoalBundleCatalogMetadataSource,
  type GoalBundleCatalogMetadataVerification,
  type GoalBundleCatalogBlockProfile,
} from './goal-bundle-metadata';
import { HISTORICAL_EXECUTION_GENESIS } from './execution-codecs/execution';
import type { GoalEpisodeMarkEvidence } from './goal-episode-evaluator';
import type { GoalQualificationRuntimeProfile } from './goal-qualification';
import type { GoalQualificationClockBlock } from './goal-qualification-clock';
import { goalRawBytesSha256, goalRawEvidenceDigest, readGoalRawEnvelope } from './goal-raw-envelope';

const ENDPOINT = 'https://mof2.sora.org/';
const TIMESTAMP_KEY = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const CODE_KEY = '0x3a636f6465';
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
const HEX = /^0x(?:[0-9a-fA-F]{2})+$/;
const RESPONSE_LIMIT = 2 * 1024 * 1024;
const STORAGE_LIMIT = 128 * 1024;
type RecordValue = Readonly<Record<string, unknown>>;

/** These identities must come from the pinned source/index and the independently reconstructed causal clock. */
export interface GoalBundleValuationBinding {
  requestSha256: string;
  sourceManifestSha256: string;
  genesisHash: string;
  denominator: string;
  source: {
    finalizedSource: { hash: string; height: number; receiptSha256: string };
    schemaAnchor: { hash: string; height: number };
  };
  runtimeProfiles: readonly GoalQualificationRuntimeProfile[];
  block: GoalQualificationClockBlock;
  captureStartedAtMs: number;
  receivedAtMs: number;
  timingKind: 'fixed-pinned-capture-delays-v1';
  schema: { name: string; valueSha256: string };
  state: { name: string; valueSha256: string };
  valuation: { name: string; valueSha256: string };
}

/** Catalog source identities remain separate from the unchanged clock and mark projections. */
export interface GoalBundleCatalogValuationBinding extends Omit<GoalBundleValuationBinding, 'source'> {
  source: GoalBundleCatalogMetadataSource;
}
export interface GoalBundleCatalogValuationDependencies {
  catalog: GoalRuntimeCatalog;
  metadata: GoalBundleCatalogMetadataVerification;
}

/** File-byte hashes are checked by the pinned bundle reader; the verifier also checks original value digests. */
export interface GoalBundleValuationBytes {
  schemaBytes: Uint8Array;
  stateBytes: Uint8Array;
  valuationBytes: Uint8Array;
}

/** Authenticated original source bytes, owned only by successful raw market verification. */
export interface GoalBundleVerifiedMarketState {
  readonly sourceBlock: Readonly<GoalQualificationClockBlock>;
  readonly sourceMark: Readonly<GoalEpisodeMarkEvidence['mark']>;
  readonly finalizedSource: Readonly<GoalBundleValuationBinding['source']['finalizedSource']>;
  readonly genesisHash: string;
  readonly denominator: string;
  readonly runtimeProfile: Readonly<GoalQualificationRuntimeProfile>;
  readonly sourceMetadataHex: string;
  readonly sourcePropertiesHex: string;
  readonly sourceRawSha256: string;
  readonly requestSha256: string;
  readonly sourceManifestSha256: string;
}
const verifiedStates = new WeakMap<object, Readonly<GoalBundleVerifiedMarketState>>();
export interface GoalBundleVerifiedCatalogMarketState extends GoalBundleVerifiedMarketState {
  readonly kind: 'catalog-verified-market-state-v1';
  readonly catalogBinding: Readonly<{ catalogSha256: string; profileSha256: string }>;
  readonly blockProfile: GoalBundleCatalogBlockProfile;
}
const ownedStates = new WeakMap<object, { assertCurrent(): void; catalog?: GoalRuntimeCatalog }>();

/** A copied mark or matching JSON cannot retrieve source authority. Existing mark fields stay unchanged. */
export function getGoalBundleVerifiedMarketState(mark: unknown): Readonly<GoalBundleVerifiedMarketState> {
  const state = mark && typeof mark === 'object' ? verifiedStates.get(mark) : undefined;
  check(state, 'unverified-market-state');
  assertGoalBundleVerifiedMarketState(state);
  return state;
}

/** Reject forged/copy capabilities; ownership authenticates only the pinned original RPC claims. */
export function assertGoalBundleVerifiedMarketState(value: unknown): asserts value is GoalBundleVerifiedMarketState {
  const owner = value && typeof value === 'object' ? ownedStates.get(value) : undefined;
  check(owner, 'unverified-market-state');
  owner.assertCurrent();
}

/** Retrieve the actual catalog only from a live catalog-authenticated market state. */
export function getGoalBundleVerifiedMarketCatalog(value: unknown): GoalRuntimeCatalog {
  assertGoalBundleVerifiedMarketState(value);
  const catalog = ownedStates.get(value)?.catalog;
  check(catalog, 'unverified-market-catalog');
  assertGoalRuntimeCatalog(catalog);
  return catalog;
}

/** Copies, legacy states and revoked validation capabilities cannot acquire catalog authority. */
export function assertGoalBundleVerifiedCatalogMarketState(
  value: unknown
): asserts value is GoalBundleVerifiedCatalogMarketState {
  getGoalBundleVerifiedMarketCatalog(value);
}

function check(condition: unknown, reason: string): asserts condition {
  if (!condition) throw Error(`goal-bundle-market:${reason}`);
}
function object(value: unknown, keys?: readonly string[]): RecordValue {
  check(value && typeof value === 'object' && !Array.isArray(value), 'object');
  check([Object.prototype, null].includes(Object.getPrototypeOf(value)), 'object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every(
      (key) => typeof key === 'string' && descriptors[key].enumerable && 'value' in descriptors[key]
    ),
    'own-data'
  );
  if (keys)
    check(
      keys.length === Object.keys(descriptors).length && keys.every((key) => Object.hasOwn(descriptors, key)),
      'fields'
    );
  return value as RecordValue;
}
function same(actual: unknown, expected: unknown, reason: string): void {
  check(goalRawEvidenceDigest(actual) === goalRawEvidenceDigest(expected), reason);
}
function hash(value: unknown): string {
  check(typeof value === 'string' && HASH.test(value), 'hash');
  return value;
}
function positive(value: unknown): number {
  check(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'integer');
  return value;
}
function iso(value: unknown): void {
  check(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value), 'acquisition-time');
  check(Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'acquisition-time');
}
function rows(value: unknown, count: number): readonly unknown[] {
  check(Array.isArray(value) && value.length === count, 'rows');
  return value;
}
function header(value: unknown) {
  const input = object(value);
  check(typeof input.number === 'string' && /^0x[0-9a-f]+$/.test(input.number), 'header');
  const number = BigInt(input.number);
  check(number > 0n && number <= BigInt(Number.MAX_SAFE_INTEGER), 'header');
  const parentHash = hash(input.parentHash);
  hash(input.stateRoot);
  hash(input.extrinsicsRoot);
  const digest = object(input.digest);
  check(Array.isArray(digest.logs) && digest.logs.length <= 128, 'header');
  check(
    digest.logs.every((log) => typeof log === 'string' && HEX.test(log) && log.length <= 65538),
    'header'
  );
  return {
    height: Number(number),
    parentHash,
    identity: JSON.stringify([Number(number), parentHash, input.stateRoot, input.extrinsicsRoot, digest.logs]),
  };
}
function timestamp(value: unknown): number {
  check(typeof value === 'string' && /^0x[0-9a-fA-F]{16}$/.test(value), 'timestamp');
  const parsed = BigInt(u8aToHex(hexToU8a(value).reverse()));
  check(parsed > 0n && parsed <= BigInt(Number.MAX_SAFE_INTEGER), 'timestamp');
  return Number(parsed);
}
function timestampLayout(value: unknown) {
  check(typeof value === 'string' && HEX.test(value) && value.length <= RESPONSE_LIMIT * 2 + 2, 'metadata');
  const raw = hexToU8a(value),
    registry = new TypeRegistry(),
    metadata = new Metadata(registry, raw);
  check(metadata.version === 14 && u8aToHex(metadata.toU8a()) === value.toLowerCase(), 'metadata');
  const pallets = metadata.asV14.pallets.filter((pallet) => pallet.name.toString() === 'Timestamp');
  check(pallets.length === 1 && pallets[0].storage.isSome, 'timestamp-layout');
  const storage = pallets[0].storage.unwrap();
  const entries = storage.items.filter((entry) => entry.name.toString() === 'Now');
  check(entries.length === 1 && entries[0].type.isPlain, 'timestamp-layout');
  const definitions = metadata.asV14.lookup.types.filter((entry) => entry.id.eq(entries[0].type.asPlain));
  check(
    definitions.length === 1 &&
      definitions[0].type.def.isPrimitive &&
      definitions[0].type.def.asPrimitive.toString() === 'U64',
    'timestamp-layout'
  );
  const key = xxhashAsHex(storage.prefix.toString(), 128) + xxhashAsHex('Now', 128).slice(2);
  check(key === TIMESTAMP_KEY, 'timestamp-key');
  return { key, type: 'u64' as const, unit: 'milliseconds' as const, metadataSha256: goalRawBytesSha256(raw) };
}

// Exact catalog byte pins precede this cache; response and context joins still run for every mark.
const catalogTimestampLayouts = new WeakMap<GoalRuntimeCatalogEntry, Readonly<ReturnType<typeof timestampLayout>>>();
function catalogTimestampLayout(entry: GoalRuntimeCatalogEntry) {
  let layout = catalogTimestampLayouts.get(entry);
  if (!layout) {
    layout = Object.freeze(timestampLayout(entry.metadataHex));
    catalogTimestampLayouts.set(entry, layout);
  }
  return layout;
}

// One archive shard reuses its exact schema bytes for up to 64 separately checked marks. Keep only the
// immutable decoded wrapper; rehash the mutable byte buffer and match the full envelope binding on every use.
const schemaEnvelopes = new WeakMap<
  Uint8Array,
  Readonly<{
    bytesSha256: string;
    name: string;
    requestSha256: string;
    valueSha256: string;
    value: Readonly<Record<string, unknown>>;
  }>
>();
/** Reuse one immutable schema parse only while the mutable bytes and complete binding still match. */
function readSchemaEnvelope(bytes: Uint8Array, binding: { name: string; requestSha256: string; valueSha256: string }) {
  const bytesSha256 = goalRawBytesSha256(bytes);
  const prior = schemaEnvelopes.get(bytes);
  if (
    prior?.bytesSha256 === bytesSha256 &&
    prior.name === binding.name &&
    prior.requestSha256 === binding.requestSha256 &&
    prior.valueSha256 === binding.valueSha256
  )
    return prior.value;
  const value = readGoalRawEnvelope(bytes, binding);
  schemaEnvelopes.set(bytes, Object.freeze({ bytesSha256, ...binding, value }));
  return value;
}

// Only readSchemaEnvelope's privately owned frozen schema snapshots key these pure legacy decoders.
// A cache hit never owns a market state: all source/context joins and selected-block decoding still run.
const legacySchemaDecoders = new WeakMap<
  RecordValue,
  Readonly<{
    genesisHash: string;
    anchorHash: string;
    metadataHex: unknown;
    codeHash: string;
    specName: string;
    specVersion: number;
    transactionVersion: number;
    layout: Readonly<ReturnType<typeof timestampLayout>>;
    anchorCodec: ReturnType<typeof createHistoricalExecutionPoolCodec>;
  }>
>();

/** Shared pure decoders for retained JSON RPC results; these confer no canonicality or finality authority. */
export {
  header as readGoalArchivedHeader,
  timestamp as readGoalArchivedTimestamp,
  timestampLayout as readGoalArchivedTimestampLayout,
};

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Keep retained ownership checks independent of the per-mark raw schema and RPC parsing scope. */
function makeMarketLifetime(catalog?: GoalRuntimeCatalog, metadata?: GoalBundleCatalogMetadataVerification) {
  return () => {
    if (catalog && metadata) assertGoalBundleCatalogMetadata(metadata, metadata.provenance.binding, catalog);
  };
}

/**
 * Rebuild one valuation from the original ten schema RPC rows, four block rows and seven-key batch.
 * RPC canonical/finality assertions are checked against pinned identities; this is not a GRANDPA or trie proof.
 * Original acquisition timestamps remain in the hashed envelopes. Modeled times are supplied by the causal caller.
 */
function verifyMark(
  rawBinding: GoalBundleValuationBinding | GoalBundleCatalogValuationBinding,
  bytes: GoalBundleValuationBytes,
  kind: 'valuation' | 'opening' | 'terminal',
  accountingAtMs?: number,
  catalogDependencies?: GoalBundleCatalogValuationDependencies
): Readonly<GoalEpisodeMarkEvidence> {
  let catalog: GoalRuntimeCatalog | undefined;
  let metadata: GoalBundleCatalogMetadataVerification | undefined;
  if (catalogDependencies) {
    const deps = object(catalogDependencies, ['catalog', 'metadata']);
    assertGoalRuntimeCatalog(deps.catalog);
    catalog = deps.catalog;
    const candidate = deps.metadata;
    check(getGoalBundleVerifiedMetadataCatalog(candidate) === catalog, 'catalog-ownership');
    assertGoalBundleCatalogMetadata(
      candidate,
      (candidate as GoalBundleCatalogMetadataVerification).provenance.binding,
      catalog
    );
    metadata = candidate;
  }
  const assertCurrent = makeMarketLifetime(catalog, metadata);
  assertCurrent();
  // Validate the complete own-data graph before making an isolated copy or accessing nested fields.
  goalRawEvidenceDigest(rawBinding);
  const expected: GoalBundleValuationBinding | GoalBundleCatalogValuationBinding = JSON.parse(
    JSON.stringify(rawBinding)
  );
  object(expected, [
    'requestSha256',
    'sourceManifestSha256',
    'genesisHash',
    'denominator',
    'source',
    'runtimeProfiles',
    'block',
    'captureStartedAtMs',
    'receivedAtMs',
    'timingKind',
    'schema',
    'state',
    'valuation',
  ]);
  check(SHA.test(expected.requestSha256) && SHA.test(expected.sourceManifestSha256), 'binding');
  check(expected.genesisHash === HISTORICAL_EXECUTION_GENESIS, 'genesis');
  check(
    typeof expected.denominator === 'string' &&
      /^[1-9]\d{0,38}$/.test(expected.denominator) &&
      BigInt(expected.denominator) < 1n << 128n,
    'denominator'
  );
  object(expected.source, catalog ? ['kind', 'finalizedSource', 'schemaAnchors'] : ['finalizedSource', 'schemaAnchor']);
  const { finalizedSource } = expected.source;
  object(finalizedSource, ['hash', 'height', 'receiptSha256']);
  hash(finalizedSource.hash);
  positive(finalizedSource.height);
  check(typeof finalizedSource.receiptSha256 === 'string' && SHA.test(finalizedSource.receiptSha256), 'source');
  const schemaAnchors = catalog
    ? (expected.source as GoalBundleCatalogMetadataSource).schemaAnchors
    : [(expected.source as GoalBundleValuationBinding['source']).schemaAnchor];
  if (catalog && metadata) same(expected.source, metadata.provenance.source, 'catalog-source');
  check(Array.isArray(schemaAnchors) && schemaAnchors.length === (catalog ? 3 : 1), 'source');
  for (const anchor of schemaAnchors) {
    object(anchor, catalog ? ['specVersion', 'height', 'hash'] : ['height', 'hash']);
    hash(anchor.hash);
    positive(anchor.height);
    check(
      anchor.height <= finalizedSource.height &&
        (anchor.height === finalizedSource.height) === (anchor.hash === finalizedSource.hash),
      'source'
    );
  }
  const schemaAnchor = schemaAnchors[0];
  const selected = expected.block;
  object(selected, ['height', 'hash', 'parentHash', 'timestampMs']);
  positive(selected.height);
  positive(selected.timestampMs);
  hash(selected.hash);
  hash(selected.parentHash);
  check(selected.height <= finalizedSource.height, 'finality');
  positive(expected.captureStartedAtMs);
  positive(expected.receivedAtMs);
  const ageAtMs = kind === 'terminal' ? positive(accountingAtMs) : expected.receivedAtMs;
  check(
    expected.timingKind === 'fixed-pinned-capture-delays-v1' &&
      selected.timestampMs <= expected.captureStartedAtMs &&
      expected.captureStartedAtMs <= expected.receivedAtMs &&
      selected.timestampMs <= ageAtMs &&
      ageAtMs <= expected.receivedAtMs &&
      (kind !== 'terminal' || ageAtMs <= expected.captureStartedAtMs) &&
      ageAtMs - selected.timestampMs <= 60_000,
    'modeled-time'
  );
  check(
    Array.isArray(expected.runtimeProfiles) &&
      expected.runtimeProfiles.length > 0 &&
      expected.runtimeProfiles.length <= 8,
    'profiles'
  );
  for (const profile of expected.runtimeProfiles) {
    object(profile, ['specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
    check(
      (catalog ? [128, 129, 130] : [130, 131]).includes(profile.specVersion) &&
        profile.transactionVersion === profile.specVersion &&
        SHA.test(profile.metadataSha256),
      'profiles'
    );
    hash(profile.codeHash);
  }
  for (const binding of [expected.schema, expected.state, expected.valuation]) object(binding, ['name', 'valueSha256']);
  check(
    /^market-schema-[1-9]\d{0,8}\.json$/.test(expected.schema.name) &&
      expected.state.name === `market-state-${selected.height}.json` &&
      (kind === 'valuation'
        ? /^valuation-[1-9]\d{0,8}\.json$/.test(expected.valuation.name)
        : expected.valuation.name === `${kind}.json`),
    'names'
  );
  const input = object(bytes, ['schemaBytes', 'stateBytes', 'valuationBytes']);
  const read = (part: 'schema' | 'state' | 'valuation') => {
    const envelope = {
      ...expected[part],
      requestSha256: expected.requestSha256,
    };
    const raw = input[`${part}Bytes`] as Uint8Array;
    return part === 'schema' ? readSchemaEnvelope(raw, envelope) : readGoalRawEnvelope(raw, envelope);
  };
  const schema = read('schema'),
    state = read('state'),
    valuation = read('valuation');
  object(schema, ['context', 'evidence']);
  object(state, ['schemaSha256', 'value', 'blockEvidence', 'storageEvidence', ...(catalog ? ['blockProfiles'] : [])]);
  check(state.schemaSha256 === expected.schema.valueSha256, 'schema-join');
  const evidence = object(schema.evidence, [
    'blockEvidence',
    'storageEvidence',
    'blockReads',
    'markReads',
    ...(catalog ? ['blockProfiles'] : []),
  ]);
  check(evidence.blockReads === 0 && evidence.markReads === 0, 'schema-counters');
  rows(evidence.storageEvidence, 0);
  if (catalog) rows(evidence.blockProfiles, 0);
  const initializationRows = catalog ? 20 : 10;
  const schemaRows = rows(evidence.blockEvidence, initializationRows),
    stateRows = rows(state.blockEvidence, 4);
  const storage = object(rows(state.storageEvidence, 1)[0], [
    'id',
    'method',
    'blockHash',
    'keys',
    'requestedAt',
    'completedAt',
    'httpStatus',
    'responseBody',
    'responseSha256',
  ]);
  const slot = positive(storage.id);
  check(slot <= 64, 'shard-limit');
  let metadataBytes = 0;
  const body = (row: RecordValue, maximum: number): RecordValue => {
    iso(row.requestedAt);
    iso(row.completedAt);
    check(row.httpStatus === 200 && typeof row.responseBody === 'string', 'response');
    const raw = new TextEncoder().encode(row.responseBody);
    check(raw.length > 0 && raw.length <= maximum && goalRawBytesSha256(raw) === row.responseSha256, 'response-hash');
    if (maximum === RESPONSE_LIMIT) {
      metadataBytes += raw.length;
      check(metadataBytes <= 12 * 1024 * 1024, 'response-limit');
    }
    const parsed = object(JSON.parse(row.responseBody));
    check(
      parsed.jsonrpc === '2.0' &&
        parsed.id === row.id &&
        Object.hasOwn(parsed, 'result') &&
        !Object.hasOwn(parsed, 'error'),
      'rpc'
    );
    return parsed;
  };
  const rpc = (row: unknown, id: number, method: string, params: readonly (number | string)[]): unknown => {
    const fields = object(row, [
      'id',
      'method',
      'params',
      'requestedAt',
      'completedAt',
      'httpStatus',
      'responseBody',
      'responseSha256',
    ]);
    check(fields.id === id && fields.method === method, 'request');
    same(fields.params, params, 'request');
    return body(fields, RESPONSE_LIMIT).result;
  };
  const known = new Map<string, ReturnType<typeof header>>();
  const remember = (blockHash: string, raw: unknown) => {
    const observed = header(raw);
    check(observed.parentHash !== blockHash, 'header-link');
    for (const [knownHash, prior] of known) {
      check(
        knownHash === blockHash ? prior.identity === observed.identity : prior.height !== observed.height,
        'header-identity'
      );
      if (observed.parentHash === knownHash) check(prior.height === observed.height - 1, 'header-link');
      if (prior.parentHash === blockHash) check(observed.height === prior.height - 1, 'header-link');
      if (prior.height === observed.height - 1) check(observed.parentHash === knownHash, 'header-link');
      if (observed.height === prior.height - 1) check(prior.parentHash === blockHash, 'header-link');
    }
    known.set(blockHash, observed);
    return observed;
  };
  const srpc = (i: number, method: string, params: readonly (number | string)[]) =>
    rpc(schemaRows[i - 1], i, method, params);
  check(srpc(1, 'chain_getBlockHash', [0]) === expected.genesisHash, 'genesis');
  const finalizedHash = hash(srpc(2, 'chain_getFinalizedHead', []));
  const finalizedHeader = remember(finalizedHash, srpc(3, 'chain_getHeader', [finalizedHash]));
  check(finalizedHeader.height >= finalizedSource.height, 'finality');
  check(srpc(4, 'chain_getBlockHash', [finalizedSource.height]) === finalizedSource.hash, 'finality');
  check(
    remember(finalizedSource.hash, srpc(5, 'chain_getHeader', [finalizedSource.hash])).height ===
      finalizedSource.height,
    'finality'
  );
  const observedCodes = new Map<string, string>();
  const rememberCode = (blockHash: string, codeHash: string) => {
    const prior = observedCodes.get(blockHash);
    check(!prior || prior === codeHash, 'block-profile-conflict');
    observedCodes.set(blockHash, codeHash);
  };
  type PoolCodec =
    | ReturnType<typeof createHistoricalExecutionPoolCodec>
    | ReturnType<typeof createCatalogHistoricalExecutionPoolCodec>;
  let metadataHex: unknown, codeHash: string, layout: ReturnType<typeof timestampLayout>;
  let runtimeProfile: GoalQualificationRuntimeProfile;
  let anchorCodec: PoolCodec;
  let blockProfile: GoalBundleCatalogBlockProfile | undefined;
  if (catalog && metadata) {
    blockProfile = metadata.profileForBlock(selected.hash, selected.height);
    const canonicalBlock = metadata.blocks[selected.height - metadata.firstHeight];
    same(canonicalBlock, selected, 'catalog-clock-block');
    for (const [index, anchor] of (expected.source as GoalBundleCatalogMetadataSource).schemaAnchors.entries()) {
      const offset = 5 + index * 5;
      check(srpc(offset + 1, 'chain_getBlockHash', [anchor.height]) === anchor.hash, 'anchor');
      check(
        remember(anchor.hash, srpc(offset + 2, 'chain_getHeader', [anchor.hash])).height === anchor.height,
        'anchor'
      );
      const profile = metadata.provenance.schema.profiles[index];
      check(profile.schemaAnchor.specVersion === anchor.specVersion, 'catalog-anchor');
      const runtime = object(srpc(offset + 3, 'state_getRuntimeVersion', [anchor.hash]));
      check(
        runtime.specName === 'sora-substrate' &&
          runtime.specVersion === profile.profile.specVersion &&
          runtime.transactionVersion === profile.profile.transactionVersion,
        'runtime'
      );
      const anchorCode = hash(srpc(offset + 4, 'state_getStorageHash', [CODE_KEY, anchor.hash]));
      check(anchorCode === profile.profile.codeHash, 'catalog-anchor-code');
      rememberCode(anchor.hash, anchorCode);
      const entry = lookupGoalRuntimeCatalogEntry(catalog, anchorCode);
      const rawMetadata = srpc(offset + 5, 'state_getMetadata', [anchor.hash]);
      check(
        typeof rawMetadata === 'string' && rawMetadata.toLowerCase() === entry.metadataHex,
        'catalog-metadata-bytes'
      );
      same(catalogTimestampLayout(entry), profile.timestampLayout, 'catalog-timestamp-layout');
      same(entry.profile, profile.profile, 'catalog-profile');
    }
    const entry = lookupGoalRuntimeCatalogEntry(catalog, blockProfile.codeHash);
    check(entry.role === 'historical-source', 'catalog-source-role');
    metadataHex = entry.metadataHex;
    codeHash = entry.profile.codeHash;
    layout = catalogTimestampLayout(entry);
    runtimeProfile = {
      specVersion: entry.profile.specVersion,
      transactionVersion: entry.profile.transactionVersion,
      metadataSha256: entry.profile.metadataSha256,
      codeHash,
    };
    anchorCodec = createCatalogHistoricalExecutionPoolCodec({
      catalog,
      sourceCodeHash: codeHash,
      blockHash: schemaAnchor.hash,
    });
    same(
      schema.context,
      {
        endpoint: ENDPOINT,
        genesisHash: expected.genesisHash,
        source: expected.source,
        finalizedObservation: { kind: 'rpc-canonical-finalized', hash: finalizedHash, height: finalizedHeader.height },
        catalogSha256: catalog.catalogSha256,
        profiles: metadata.provenance.schema.profiles,
        observedFill: false,
        expectedDenominator: expected.denominator,
        protocol: 'historical-goal-market-catalog-shard-v1-development',
        maximumBlockReads: 64,
        maximumMarkReads: 64,
        maximumStorageResponseBytes: STORAGE_LIMIT,
        maximumStorageTotalBytes: 64 * STORAGE_LIMIT,
        transactionSubmitted: false,
      },
      'context'
    );
  } else {
    check(srpc(6, 'chain_getBlockHash', [schemaAnchor.height]) === schemaAnchor.hash, 'anchor');
    check(
      remember(schemaAnchor.hash, srpc(7, 'chain_getHeader', [schemaAnchor.hash])).height === schemaAnchor.height,
      'anchor'
    );
    const runtime = object(srpc(8, 'state_getRuntimeVersion', [schemaAnchor.hash]));
    check(
      runtime.specName === 'sora-substrate' &&
        [130, 131].includes(runtime.specVersion as number) &&
        runtime.specVersion === runtime.transactionVersion,
      'runtime'
    );
    const runtimeVersion = {
      specName: 'sora-substrate',
      specVersion: runtime.specVersion as 130 | 131,
      transactionVersion: runtime.transactionVersion as 130 | 131,
    };
    codeHash = hash(srpc(9, 'state_getStorageHash', [CODE_KEY, schemaAnchor.hash]));
    metadataHex = srpc(10, 'state_getMetadata', [schemaAnchor.hash]);
    const prior = legacySchemaDecoders.get(schema);
    const cached =
      prior?.genesisHash === expected.genesisHash &&
      prior.anchorHash === schemaAnchor.hash &&
      prior.metadataHex === metadataHex &&
      prior.codeHash === codeHash &&
      prior.specName === runtimeVersion.specName &&
      prior.specVersion === runtimeVersion.specVersion &&
      prior.transactionVersion === runtimeVersion.transactionVersion
        ? prior
        : undefined;
    layout = cached?.layout ?? Object.freeze(timestampLayout(metadataHex));
    runtimeProfile = {
      specVersion: runtimeVersion.specVersion,
      transactionVersion: runtimeVersion.transactionVersion,
      metadataSha256: layout.metadataSha256,
      codeHash,
    };
    same(
      schema.context,
      {
        endpoint: ENDPOINT,
        genesisHash: expected.genesisHash,
        ...expected.source,
        finalizedObservation: { kind: 'rpc-canonical-finalized', hash: finalizedHash, height: finalizedHeader.height },
        schema: { ...layout, codeHash, runtimeVersion },
        observedFill: false,
        expectedDenominator: expected.denominator,
        protocol: 'historical-goal-market-shard-v1-development',
        maximumBlockReads: 64,
        maximumMarkReads: 64,
        maximumStorageResponseBytes: STORAGE_LIMIT,
        maximumStorageTotalBytes: 64 * STORAGE_LIMIT,
        transactionSubmitted: false,
      },
      'context'
    );
    anchorCodec =
      cached?.anchorCodec ??
      createHistoricalExecutionPoolCodec({
        genesisHash: expected.genesisHash,
        metadataHex,
        runtimeVersion: {
          specVersion: runtimeVersion.specVersion,
          transactionVersion: runtimeVersion.transactionVersion,
        },
        blockHash: schemaAnchor.hash,
      });
    if (!cached)
      legacySchemaDecoders.set(
        schema,
        Object.freeze({
          genesisHash: expected.genesisHash,
          anchorHash: schemaAnchor.hash,
          metadataHex,
          codeHash,
          ...runtimeVersion,
          layout,
          anchorCodec,
        })
      );
  }
  check(
    expected.runtimeProfiles.some(
      (profile) => goalRawEvidenceDigest(profile) === goalRawEvidenceDigest(runtimeProfile)
    ),
    'profile'
  );
  const brpc = (i: number, method: string, params: readonly (number | string)[]) =>
    rpc(stateRows[i - 1], initializationRows + (slot - 1) * 4 + i, method, params);
  const blockHash = hash(brpc(1, 'chain_getBlockHash', [selected.height]));
  check(blockHash === selected.hash, 'block');
  if (selected.height === finalizedSource.height) check(blockHash === finalizedSource.hash, 'finality');
  for (const anchor of schemaAnchors) if (selected.height === anchor.height) check(blockHash === anchor.hash, 'anchor');
  const observedHeader = remember(blockHash, brpc(2, 'chain_getHeader', [blockHash]));
  check(observedHeader.height === selected.height, 'block');
  const observedCodeHash = hash(brpc(3, 'state_getStorageHash', [CODE_KEY, blockHash]));
  rememberCode(blockHash, observedCodeHash);
  check(observedCodeHash === codeHash, 'runtime-changed');
  const timestampMs = timestamp(brpc(4, 'state_getStorage', [TIMESTAMP_KEY, blockHash]));
  const block = { hash: blockHash, parentHash: observedHeader.parentHash, height: observedHeader.height, timestampMs };
  same(block, selected, 'block');
  if (blockProfile)
    same(
      state.blockProfiles,
      [
        {
          height: blockProfile.height,
          hash: blockProfile.hash,
          codeHash: blockProfile.codeHash,
          profileSha256: blockProfile.profileSha256,
        },
      ],
      'block-profiles'
    );
  const codec: PoolCodec = catalog
    ? createCatalogHistoricalExecutionPoolCodec({ catalog, sourceCodeHash: codeHash, blockHash })
    : createHistoricalExecutionPoolCodec(
        prepareHistoricalExecutionPoolIdentity(anchorCodec, {
          genesisHash: expected.genesisHash,
          metadataHex,
          runtimeVersion: {
            specVersion: runtimeProfile.specVersion,
            transactionVersion: runtimeProfile.transactionVersion,
          },
          blockHash,
        })
      );
  check(
    codec.binding.metadataSha256 === layout.metadataSha256 &&
      anchorCodec.binding.metadataSha256 === layout.metadataSha256,
    'codec'
  );
  const keys = codec.storageKeys(),
    labels = Object.keys(keys) as (keyof typeof keys)[];
  same(keys, anchorCodec.storageKeys(), 'storage-keys');
  check(storage.method === 'state_queryStorageAt' && storage.blockHash === blockHash, 'storage-request');
  same(
    storage.keys,
    labels.map((label) => keys[label]),
    'storage-keys'
  );
  const changeset = object(rows(body(storage, STORAGE_LIMIT).result, 1)[0], ['block', 'changes']);
  check(changeset.block === blockHash, 'storage-block');
  const values = new Map<string, string | null>();
  for (const item of rows(changeset.changes, 7)) {
    const change = rows(item, 2);
    check(
      typeof change[0] === 'string' && Object.values(keys).includes(change[0]) && !values.has(change[0]),
      'storage-key'
    );
    check(
      change[1] === null || (typeof change[1] === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(change[1])),
      'storage-value'
    );
    values.set(change[0], change[1]);
  }
  const poolEvidence = codec.decodeStorage(Object.fromEntries(labels.map((label) => [label, values.get(keys[label])])));
  check(
    poolEvidence.status === 'present' &&
      poolEvidence.binding.blockHash === blockHash &&
      poolEvidence.state.timestampMs === timestampMs &&
      poolEvidence.state.denominator === expected.denominator,
    'pool'
  );
  const mark = {
    timestampMs,
    blockHash,
    kusdReserveCodec: poolEvidence.reserves.kusdCodec,
    xorReserveCodec: poolEvidence.reserves.xorCodec,
  };
  same(
    state.value,
    {
      block,
      poolEvidence,
      mark,
      ...('runtimeProfile' in codec
        ? { runtimeProfile: codec.runtimeProfile, catalogBinding: codec.catalogBinding }
        : {}),
    },
    'state-projection'
  );
  const projection = {
    sourceManifestSha256: expected.sourceManifestSha256,
    genesisHash: expected.genesisHash,
    block,
    mark: { ...mark, blockNumber: selected.height, denominator: expected.denominator },
    runtimeProfile,
    captureStartedAtMs: expected.captureStartedAtMs,
    receivedAtMs: expected.receivedAtMs,
  };
  same(
    valuation,
    { ...projection, rawSha256: expected.state.valueSha256, timingKind: expected.timingKind },
    'valuation-projection'
  );
  const verified = freeze({ ...projection, evidenceSha256: expected.valuation.valueSha256 });
  const sourcePropertiesHex = values.get(keys.properties);
  check(typeof metadataHex === 'string' && typeof sourcePropertiesHex === 'string', 'source-state');
  const sourceState = freeze({
    sourceBlock: block,
    sourceMark: projection.mark,
    finalizedSource: expected.source.finalizedSource,
    genesisHash: expected.genesisHash,
    denominator: expected.denominator,
    runtimeProfile,
    sourceMetadataHex: metadataHex,
    sourcePropertiesHex,
    sourceRawSha256: expected.state.valueSha256,
    requestSha256: expected.requestSha256,
    sourceManifestSha256: expected.sourceManifestSha256,
    ...(catalog && blockProfile
      ? {
          kind: 'catalog-verified-market-state-v1' as const,
          catalogBinding: { catalogSha256: catalog.catalogSha256, profileSha256: blockProfile.profileSha256 },
          blockProfile,
        }
      : {}),
  });
  assertCurrent();
  ownedStates.set(sourceState, { assertCurrent, ...(catalog ? { catalog } : {}) });
  verifiedStates.set(verified, sourceState);
  return verified;
}

/** Verify an in-episode valuation with the original receipt-time state-age limit. */
export function verifyGoalBundleValuation(binding: GoalBundleValuationBinding, bytes: GoalBundleValuationBytes) {
  return verifyMark(binding, bytes, 'valuation');
}

/** Verify opening.json with the original funding-time receipt clock. The valuation field pins that artifact. */
export function verifyGoalBundleOpening(binding: GoalBundleValuationBinding, bytes: GoalBundleValuationBytes) {
  return verifyMark(binding, bytes, 'opening');
}

/** Verify terminal.json against original deadline age, not its later retrospective receipt time. */
export function verifyGoalBundleTerminal(
  binding: GoalBundleValuationBinding,
  bytes: GoalBundleValuationBytes,
  accountingAtMs: number
) {
  return verifyMark(binding, bytes, 'terminal', accountingAtMs);
}

/** Reconstruct catalog valuations with the exact independently verified block profile. */
export function verifyGoalBundleCatalogValuation(
  binding: GoalBundleCatalogValuationBinding,
  bytes: GoalBundleValuationBytes,
  dependencies: GoalBundleCatalogValuationDependencies
) {
  return verifyMark(binding, bytes, 'valuation', undefined, dependencies);
}
/** Reconstruct the original catalog opening mark without changing its funding-time clock. */
export function verifyGoalBundleCatalogOpening(
  binding: GoalBundleCatalogValuationBinding,
  bytes: GoalBundleValuationBytes,
  dependencies: GoalBundleCatalogValuationDependencies
) {
  return verifyMark(binding, bytes, 'opening', undefined, dependencies);
}
/** Preserve the original deadline when catalog terminal evidence arrives later. */
export function verifyGoalBundleCatalogTerminal(
  binding: GoalBundleCatalogValuationBinding,
  bytes: GoalBundleValuationBytes,
  accountingAtMs: number,
  dependencies: GoalBundleCatalogValuationDependencies
) {
  return verifyMark(binding, bytes, 'terminal', accountingAtMs, dependencies);
}
