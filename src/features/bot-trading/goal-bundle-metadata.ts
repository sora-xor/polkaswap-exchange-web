/** Offline callback metadata reconstruction from original collector wires. No market, network or wallet surface. */
import { goalRawBytesSha256 } from './goal-raw-envelope';
import {
  readGoalArchivedHeader,
  readGoalArchivedTimestamp,
  readGoalArchivedTimestampLayout,
} from './goal-bundle-market';
import { assertGoalBundleStudySelection, type GoalBundleStudySelection } from './goal-bundle-study';
import type { GoalValidationBundleBinding } from './goal-bundle-reader';
import type { GoalQualificationClockBlock } from './goal-qualification-clock';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
  type GoalRuntimeCatalogProfile,
} from './execution-codecs/runtime-catalog';

const SHA = /^[0-9a-f]{64}$/,
  HASH = /^0x[0-9a-f]{64}$/;
const TIME = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb',
  CODE = '0x3a636f6465';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
type Json = Record<string, any>; // Only bounded, detached JSON parsed below reaches semantic checks.
/** All pins come from the sealed archive/bundle index. Validation admission is intentionally unavailable. */
export interface GoalBundleMetadataBinding {
  partition: 'training' | 'validation';
  manifestSha256: string;
  verificationSha256: string;
  rawManifestSha256: string;
  blocksFileSha256: string;
  /** Archive identity: SHA256(JSON.stringify(canonical-height-order blocks)), without an added newline. */
  blocksSha256: string;
}
export interface GoalBundleMetadataDependencies {
  readArtifact(name: string, signal: AbortSignal): Promise<Uint8Array>;
  signal?: AbortSignal;
}
export interface GoalBundleMetadataVerification {
  readonly blocks: readonly Readonly<GoalQualificationClockBlock>[];
  readonly firstHeight: number;
  readonly lastHeight: number;
  readonly provenance: Readonly<{
    kind: 'raw-verified-training-callback-metadata-v1' | 'raw-verified-validation-callback-metadata-v1';
    attestation: 'rpc-canonical-finalized';
    genesisHash: string;
    binding: Readonly<GoalBundleMetadataBinding>;
    protocolSha256: string;
    source: Readonly<{
      finalizedSource: { height: number; hash: string; receiptSha256: string };
      schemaAnchor: { height: number; hash: string };
    }>;
    schema: Readonly<{
      key: string;
      type: 'u64';
      unit: 'milliseconds';
      metadataSha256: string;
      codeHash: string;
      runtimeVersion: { specName: string; specVersion: number; transactionVersion: number };
    }>;
    sourceHashes: Readonly<Record<string, string>>;
    groups: readonly Readonly<{
      name: string;
      fileSha256: string;
      valueSha256: string;
      batches: readonly Readonly<{
        name: string;
        fileSha256: string;
        responseSha256: string;
        startedAtMs: number;
        completedAtMs: number;
      }>[];
    }>[];
    shards: readonly Readonly<{
      name: string;
      fileSha256: string;
      valueSha256: string;
      transportGroup: string;
      firstRequestedAt: string;
      lastCompletedAt: string;
      logicalReceipts: number;
    }>[];
    artifactReads: number;
    artifactBytes: number;
    arrivalTimeKnown: false;
    marketDataRead: false;
  }>;
}
/** Explicit three-anchor source; clocks retain their existing four-field block shape. */
export interface GoalBundleCatalogMetadataSource {
  readonly kind: 'catalog-source-v1';
  readonly finalizedSource: { readonly height: number; readonly hash: string; readonly receiptSha256: string };
  readonly schemaAnchors: readonly {
    readonly specVersion: 128 | 129 | 130;
    readonly height: number;
    readonly hash: string;
  }[];
}
export interface GoalBundleCatalogMetadataSchema {
  readonly catalogSha256: string;
  readonly profiles: readonly {
    readonly profileSha256: string;
    readonly profile: GoalRuntimeCatalogProfile;
    readonly schemaAnchor: GoalBundleCatalogMetadataSource['schemaAnchors'][number];
    readonly timestampLayout: {
      readonly key: string;
      readonly type: 'u64';
      readonly unit: 'milliseconds';
      readonly metadataSha256: string;
    };
  }[];
}
export interface GoalBundleCatalogBlockProfile {
  readonly height: number;
  readonly hash: string;
  readonly codeHash: string;
  readonly profileSha256: string;
  readonly profile: GoalRuntimeCatalogProfile;
}
export interface GoalBundleCatalogMetadataDependencies extends GoalBundleMetadataDependencies {
  readonly catalog: GoalRuntimeCatalog;
}
export interface GoalBundleCatalogMetadataVerification extends Omit<GoalBundleMetadataVerification, 'provenance'> {
  readonly kind: 'goal-bundle-catalog-metadata-v2';
  readonly blockProfiles: readonly GoalBundleCatalogBlockProfile[];
  profileForBlock(hash: string, height: number): GoalBundleCatalogBlockProfile;
  readonly provenance: Readonly<
    Omit<GoalBundleMetadataVerification['provenance'], 'kind' | 'source' | 'schema'> & {
      kind:
        | 'raw-verified-training-callback-metadata-catalog-v2'
        | 'raw-verified-validation-callback-metadata-catalog-v2';
      source: GoalBundleCatalogMetadataSource;
      schema: GoalBundleCatalogMetadataSchema;
    }
  >;
}
export type GoalBundleAnyMetadataVerification = GoalBundleMetadataVerification | GoalBundleCatalogMetadataVerification;
export interface GoalBundleMetadataValidationAdmission {
  selection: GoalBundleStudySelection;
  binding: GoalValidationBundleBinding;
}
const owned = new WeakMap<
  object,
  {
    bindingSha256: string;
    assertCurrent(): void;
    admission?: GoalBundleMetadataValidationAdmission;
    catalog?: GoalRuntimeCatalog;
  }
>();
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-bundle-metadata:${reason}`);
}
function object(value: unknown, fields?: readonly string[]): Json {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'object'
  );
  const d = Object.getOwnPropertyDescriptors(value),
    keys = Reflect.ownKeys(d);
  check(
    keys.every((k) => typeof k === 'string' && d[k].enumerable && 'value' in d[k]),
    'own-data'
  );
  if (fields) check(keys.length === fields.length && fields.every((k) => Object.hasOwn(d, k)), 'fields');
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.value]));
}
function canonical(v: unknown): string {
  return Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Json)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
}
const utf8 = (value: string) => new TextEncoder().encode(value);
const digest = (value: unknown) => goalRawBytesSha256(utf8(canonical(value)));
const same = (a: unknown, b: unknown, reason: string) => check(digest(a) === digest(b), reason);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** Collector arrays may contain100k metadata blocks, unlike the smaller per-episode raw wrapper contract. */
function parse(bytes: Uint8Array): any {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch {
    throw Error('goal-bundle-metadata:json');
  }
  let nodes = 0;
  const visit = (v: unknown, depth: number): unknown => {
    check(++nodes <= 800000 && depth <= 24, 'complexity');
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
    if (typeof v === 'number') {
      check(Number.isSafeInteger(v), 'number');
      return v;
    }
    if (Array.isArray(v)) {
      check(v.length <= 100000, 'array');
      return v.map((x) => visit(x, depth + 1));
    }
    const o = object(v);
    check(Object.keys(o).length <= 256, 'object-size');
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, visit(x, depth + 1)]));
  };
  return visit(parsed, 0);
}
function bindingCopy(raw: GoalBundleMetadataBinding): GoalBundleMetadataBinding {
  const value = object(raw, [
    'partition',
    'manifestSha256',
    'verificationSha256',
    'rawManifestSha256',
    'blocksFileSha256',
    'blocksSha256',
  ]);
  check(value.partition === 'training' || value.partition === 'validation', 'partition');
  for (const key of ['manifestSha256', 'verificationSha256', 'rawManifestSha256', 'blocksFileSha256', 'blocksSha256'])
    check(typeof value[key] === 'string' && SHA.test(value[key]), 'pin');
  return freeze(value) as GoalBundleMetadataBinding;
}
function block(raw: unknown): GoalQualificationClockBlock {
  const b = object(raw, ['height', 'hash', 'parentHash', 'timestampMs']);
  check(
    integer(b.height) &&
      b.height > 0 &&
      b.height <= 0xffffffff &&
      integer(b.timestampMs) &&
      typeof b.hash === 'string' &&
      HASH.test(b.hash) &&
      typeof b.parentHash === 'string' &&
      HASH.test(b.parentHash) &&
      b.hash !== b.parentHash,
    'block'
  );
  return b as GoalQualificationClockBlock;
}
function iso(raw: unknown): asserts raw is string {
  check(
    typeof raw === 'string' &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(raw) &&
      Number.isFinite(Date.parse(raw)) &&
      new Date(raw).toISOString() === raw,
    'acquisition-time'
  );
}
/** Accept only a privately owned reconstruction with exactly the caller's original pins. */
export function assertGoalBundleMetadata(
  value: unknown,
  expected: GoalBundleMetadataBinding
): asserts value is GoalBundleAnyMetadataVerification {
  const owner = value && typeof value === 'object' ? owned.get(value) : undefined;
  check(owner && owner.bindingSha256 === digest(bindingCopy(expected)), 'unowned-metadata');
  owner.assertCurrent();
}
/** Require the exact live selection capability that admitted this validation metadata reconstruction. */
export function assertGoalBundleValidationMetadata(
  value: unknown,
  expected: GoalBundleMetadataBinding,
  admission: GoalBundleMetadataValidationAdmission
): asserts value is GoalBundleAnyMetadataVerification {
  assertGoalBundleStudySelection(admission.selection, admission.binding);
  assertGoalBundleMetadata(value, expected);
  const owner = owned.get(value)!;
  const { requestSha256: _request, ...binding } = admission.binding;
  const { requestSha256: _originalRequest, ...original } = owner.admission?.binding ?? {};
  check(
    expected.partition === 'validation' &&
      owner.admission?.selection === admission.selection &&
      digest(original) === digest(binding),
    'validation-admission'
  );
}
/** Require the explicit catalog result, optionally from the exact caller catalog instance. */
export function assertGoalBundleCatalogMetadata(
  value: unknown,
  expected: GoalBundleMetadataBinding,
  catalog?: GoalRuntimeCatalog
): asserts value is GoalBundleCatalogMetadataVerification {
  assertGoalBundleMetadata(value, expected);
  const owner = owned.get(value)!;
  assertGoalRuntimeCatalog(owner.catalog);
  if (catalog !== undefined) {
    assertGoalRuntimeCatalog(catalog);
    check(owner.catalog === catalog, 'catalog-ownership');
  }
  check('kind' in value && value.kind === 'goal-bundle-catalog-metadata-v2', 'catalog-kind');
}
/** Return the actual catalog only for a live privately owned catalog reconstruction. */
export function getGoalBundleVerifiedMetadataCatalog(value: unknown): GoalRuntimeCatalog {
  const owner = value && typeof value === 'object' ? owned.get(value) : undefined;
  check(owner, 'unowned');
  owner.assertCurrent();
  assertGoalRuntimeCatalog(owner.catalog);
  return owner.catalog;
}
/** Retain the original selection capability's exact validation binding and lifetime for catalog metadata. */
export function assertGoalBundleCatalogValidationMetadata(
  value: unknown,
  expected: GoalBundleMetadataBinding,
  admission: GoalBundleMetadataValidationAdmission,
  catalog?: GoalRuntimeCatalog
): asserts value is GoalBundleCatalogMetadataVerification {
  assertGoalBundleValidationMetadata(value, expected, admission);
  assertGoalBundleCatalogMetadata(value, expected, catalog);
}
/** Reconstruct catalog training metadata only; the owned catalog is a required trusted dependency. */
export async function verifyGoalBundleCatalogMetadata(
  raw: GoalBundleMetadataBinding,
  dependencies: GoalBundleCatalogMetadataDependencies
): Promise<GoalBundleCatalogMetadataVerification> {
  const binding = bindingCopy(raw);
  check(binding.partition === 'training', 'validation-unsupported');
  const result = await verifyMetadata(binding, dependencies, () => undefined, undefined, true);
  assertGoalBundleCatalogMetadata(result, binding);
  return result;
}
/** Catalog validation remains behind the same privately owned training-selection capability. */
export async function verifyGoalBundleCatalogValidationMetadata(
  raw: GoalBundleMetadataBinding,
  dependencies: GoalBundleCatalogMetadataDependencies,
  admission: GoalBundleMetadataValidationAdmission
): Promise<GoalBundleCatalogMetadataVerification> {
  const input = object(admission, ['selection', 'binding']);
  const binding = freeze(
    object(input.binding, ['indexSha256', 'planSha256', 'sourceSha256', 'candidateSha256', 'requestSha256'])
  ) as unknown as GoalValidationBundleBinding;
  const selected = input.selection as GoalBundleStudySelection,
    assertCurrent = () => assertGoalBundleStudySelection(selected, binding);
  assertCurrent();
  const metadataBinding = bindingCopy(raw);
  check(metadataBinding.partition === 'validation', 'partition');
  const result = await verifyMetadata(
    metadataBinding,
    dependencies,
    assertCurrent,
    { selection: selected, binding },
    true
  );
  assertGoalBundleCatalogValidationMetadata(result, metadataBinding, { selection: selected, binding });
  return result;
}
/** Reconstruct training metadata only. Validation always requires the separate guarded entrypoint. */
export async function verifyGoalBundleMetadata(
  raw: GoalBundleMetadataBinding,
  dependencies: GoalBundleMetadataDependencies
): Promise<GoalBundleMetadataVerification> {
  check(bindingCopy(raw).partition === 'training', 'validation-unsupported');
  return verifyMetadata(raw, dependencies, () => undefined) as Promise<GoalBundleMetadataVerification>;
}
/** Reconstruct validation metadata only after the original training selection has been independently sealed. */
export async function verifyGoalBundleValidationMetadata(
  raw: GoalBundleMetadataBinding,
  dependencies: GoalBundleMetadataDependencies,
  admission: GoalBundleMetadataValidationAdmission
): Promise<GoalBundleMetadataVerification> {
  const input = object(admission, ['selection', 'binding']);
  const binding = freeze(
    object(input.binding, ['indexSha256', 'planSha256', 'sourceSha256', 'candidateSha256', 'requestSha256'])
  ) as unknown as GoalValidationBundleBinding;
  const selected = input.selection as GoalBundleStudySelection,
    assertCurrent = () => assertGoalBundleStudySelection(selected, binding);
  assertCurrent();
  check(bindingCopy(raw).partition === 'validation', 'partition');
  return verifyMetadata(raw, dependencies, assertCurrent, {
    selection: selected,
    binding,
  }) as Promise<GoalBundleMetadataVerification>;
}
/** Rebuild exact batch/shard joins; RPC finality remains an attestation, not a GRANDPA or trie proof. */
async function verifyMetadata(
  raw: GoalBundleMetadataBinding,
  dependencies: GoalBundleMetadataDependencies | GoalBundleCatalogMetadataDependencies,
  assertCurrent: () => void,
  admission?: GoalBundleMetadataValidationAdmission,
  catalogMode = false
): Promise<GoalBundleAnyMetadataVerification> {
  const binding = bindingCopy(raw),
    deps = object(dependencies, [
      'readArtifact',
      ...(Object.hasOwn(dependencies, 'signal') ? ['signal'] : []),
      ...(catalogMode ? ['catalog'] : []),
    ]);
  const catalog = catalogMode ? (deps.catalog as GoalRuntimeCatalog) : undefined;
  if (catalogMode) assertGoalRuntimeCatalog(catalog);
  const initialRpcCalls = catalogMode ? 20 : 10,
    maximumShardBytes = catalogMode ? 6291456 : 2097152;
  check(
    typeof deps.readArtifact === 'function' && (deps.signal === undefined || deps.signal instanceof AbortSignal),
    'dependencies'
  );
  const readArtifact = deps.readArtifact as GoalBundleMetadataDependencies['readArtifact'],
    parentSignal = deps.signal as AbortSignal | undefined;
  let artifactReads = 0,
    artifactBytes = 0;
  const readNames = new Set<string>(),
    files = new Map<string, { sha256: string; bytes: number }>();
  const fresh = () => {
    assertCurrent();
    check(!parentSignal?.aborted, 'aborted');
  };
  const read = async (name: string, pin?: string, maximum = 8 * 1024 * 1024) => {
    fresh();
    check(
      /^(?:run-protocol|verification|raw-manifest|blocks-(?:training|validation)|shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(
        name
      ) &&
        !readNames.has(name) &&
        ++artifactReads <= 25004,
      'artifact-name'
    );
    readNames.add(name);
    const controller = new AbortController(),
      abort = () => controller.abort();
    parentSignal?.addEventListener('abort', abort, { once: true });
    if (parentSignal?.aborted) abort();
    const timer = setTimeout(abort, 30000);
    let bytes: Uint8Array;
    try {
      bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const cancelled = () => reject(Error('goal-bundle-metadata:aborted'));
        controller.signal.addEventListener('abort', cancelled, { once: true });
        Promise.resolve()
          .then(() => {
            check(!controller.signal.aborted, 'aborted');
            return readArtifact(name, controller.signal);
          })
          .then(
            (v) => {
              controller.signal.removeEventListener('abort', cancelled);
              controller.signal.aborted ? cancelled() : resolve(v);
            },
            (e) => {
              controller.signal.removeEventListener('abort', cancelled);
              reject(e);
            }
          );
        if (controller.signal.aborted) cancelled();
      });
      check(bytes instanceof Uint8Array && bytes.length > 0 && bytes.length <= maximum, 'artifact-size');
      bytes = new Uint8Array(bytes);
      artifactBytes += bytes.length;
      check(artifactBytes <= (catalogMode ? 12 : 4) * 1024 ** 3, 'aggregate-size');
      const sha256 = goalRawBytesSha256(bytes),
        entry = files.get(name);
      check(!pin || pin === sha256, 'artifact-pin');
      if (name.startsWith('group-') || name.startsWith('shard-'))
        check(entry && entry.sha256 === sha256 && entry.bytes === bytes.length, 'raw-file-pin');
      fresh();
      return { value: parse(bytes), sha256, bytes };
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
      controller.abort();
    }
  };
  const manifest = (await read('run-protocol', binding.manifestSha256)).value;
  const verification = (await read('verification', binding.verificationSha256)).value;
  const inventory = object((await read('raw-manifest', binding.rawManifestSha256)).value, [
    'version',
    'kind',
    'manifestSha256',
    'verificationSha256',
    'files',
  ]);
  check(
    inventory.version === 1 &&
      inventory.kind === 'verified-callback-raw-manifest-v1' &&
      inventory.manifestSha256 === binding.manifestSha256 &&
      inventory.verificationSha256 === binding.verificationSha256 &&
      Array.isArray(inventory.files) &&
      inventory.files.length > 0 &&
      inventory.files.length <= 25000,
    'inventory'
  );
  for (const rawFile of inventory.files) {
    const f = object(rawFile, ['name', 'sha256', 'bytes']);
    check(
      typeof f.name === 'string' &&
        /^(?:shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(f.name) &&
        !files.has(f.name) &&
        typeof f.sha256 === 'string' &&
        SHA.test(f.sha256) &&
        integer(f.bytes) &&
        f.bytes > 0 &&
        f.bytes <= 8 * 1024 * 1024,
      'inventory-file'
    );
    files.set(f.name, { sha256: f.sha256, bytes: f.bytes });
  }
  const protocol = object(manifest.protocol, [
      'version',
      'kind',
      'source',
      'schema',
      'sourceHashes',
      'ranges',
      'budget',
    ]),
    protocolSha256 = digest(protocol);
  check(
    manifest.protocolSha256 === protocolSha256 &&
      protocol.version === (catalogMode ? 2 : 1) &&
      protocol.kind ===
        (catalogMode ? 'qualification-callback-metadata-catalog-v2' : 'qualification-callback-metadata-v1'),
    'protocol'
  );
  check(
    verification.verified === true &&
      verification.networkAttempts === 0 &&
      verification.sourceHashesUnchanged === true &&
      verification.preparedManifestSha256 === binding.manifestSha256 &&
      verification.protocolSha256 === protocolSha256,
    'verification'
  );
  same(verification.sourceHashes, protocol.sourceHashes, 'source-hashes');
  check(
    Object.keys(object(protocol.sourceHashes)).length > 0 &&
      Object.entries(protocol.sourceHashes).every(
        ([name, hash]) => name.length > 0 && name.length <= 512 && typeof hash === 'string' && SHA.test(hash)
      ),
    'source-hashes'
  );
  const source = object(
    protocol.source,
    catalogMode ? ['kind', 'finalizedSource', 'schemaAnchors'] : ['finalizedSource', 'schemaAnchor']
  );
  const finalized = object(source.finalizedSource, ['height', 'hash', 'receiptSha256']);
  check(
    integer(finalized.height) &&
      finalized.height > 0 &&
      finalized.height <= 0xffffffff &&
      HASH.test(finalized.hash) &&
      SHA.test(finalized.receiptSha256),
    'source'
  );
  let anchor: Json | undefined, runtime: Json | undefined;
  const schema = object(
    protocol.schema,
    catalogMode
      ? ['catalogSha256', 'profiles']
      : ['key', 'type', 'unit', 'metadataSha256', 'codeHash', 'runtimeVersion']
  );
  if (catalogMode) {
    assertGoalRuntimeCatalog(catalog);
    check(
      source.kind === 'catalog-source-v1' && Array.isArray(source.schemaAnchors) && source.schemaAnchors.length === 3,
      'source'
    );
    const heights = new Set<number>(),
      hashes = new Set<string>();
    const profiles = source.schemaAnchors.map((rawAnchor: unknown, i: number) => {
      const anchor = object(rawAnchor, ['specVersion', 'height', 'hash']);
      check(
        anchor.specVersion === 128 + i &&
          integer(anchor.height) &&
          anchor.height > 0 &&
          anchor.height <= finalized.height &&
          HASH.test(anchor.hash) &&
          !heights.has(anchor.height) &&
          !hashes.has(anchor.hash) &&
          (anchor.height === finalized.height) === (anchor.hash === finalized.hash),
        'source'
      );
      heights.add(anchor.height);
      hashes.add(anchor.hash);
      const entry = catalog.entries.find(
        (e) => e.role === 'historical-source' && e.profile.specVersion === anchor.specVersion
      );
      check(entry, 'catalog-profile');
      return {
        profileSha256: digest(entry.profile),
        profile: entry.profile,
        schemaAnchor: anchor,
        timestampLayout: {
          key: entry.storage.timestamp.keyHex,
          type: 'u64',
          unit: 'milliseconds',
          metadataSha256: entry.profile.metadataSha256,
        },
      };
    });
    same(schema, { catalogSha256: catalog.catalogSha256, profiles }, 'catalog-schema');
  } else {
    anchor = object(source.schemaAnchor, ['height', 'hash']);
    check(
      integer(anchor.height) &&
        anchor.height > 0 &&
        anchor.height <= finalized.height &&
        HASH.test(anchor.hash) &&
        (anchor.height === finalized.height) === (anchor.hash === finalized.hash),
      'source'
    );
    runtime = object(schema.runtimeVersion, ['specName', 'specVersion', 'transactionVersion']);
    check(
      schema.key === TIME &&
        schema.type === 'u64' &&
        schema.unit === 'milliseconds' &&
        SHA.test(schema.metadataSha256) &&
        HASH.test(schema.codeHash) &&
        runtime.specName === 'sora-substrate' &&
        [130, 131].includes(runtime.specVersion) &&
        runtime.transactionVersion === runtime.specVersion,
      'schema'
    );
  }
  check(Array.isArray(protocol.ranges) && protocol.ranges.length >= 1 && protocol.ranges.length <= 2, 'ranges');
  const plan: Array<{ index: number; rangeId: string; first: number; last: number }> = [];
  let count = 0;
  const rangeIds = new Set<string>();
  for (const [i, value] of protocol.ranges.entries()) {
    const r = object(value, ['id', 'startAtMs', 'endAtMs', 'first', 'last']),
      first = block(r.first),
      last = block(r.last);
    check(
      ['training', 'validation', 'development'].includes(r.id) &&
        !rangeIds.has(r.id) &&
        integer(r.startAtMs) &&
        r.startAtMs >= 60001 &&
        integer(r.endAtMs) &&
        r.endAtMs > r.startAtMs &&
        r.endAtMs - r.startAtMs <= 116 * 3600000 &&
        first.timestampMs <= r.startAtMs - 60001 &&
        last.timestampMs > r.endAtMs &&
        last.height > first.height &&
        last.height <= finalized.height,
      'range'
    );
    if (i)
      check(
        protocol.ranges[i - 1].last.height < first.height && protocol.ranges[i - 1].endAtMs < r.startAtMs,
        'range-order'
      );
    rangeIds.add(r.id);
    count += last.height - first.height + 1;
    for (let h = first.height; h <= last.height; h += 64) {
      check(plan.length < 2000, 'shards');
      plan.push({ index: plan.length, rangeId: r.id, first: h, last: Math.min(h + 63, last.height) });
    }
  }
  check(count <= 100000, 'blocks');
  same(
    protocol.budget,
    {
      blocks: count,
      shards: plan.length,
      rpcCalls: count * 4 + plan.length * initialRpcCalls,
      responseBytes: maximumShardBytes,
      totalBytes: plan.length * maximumShardBytes,
      httpIntervalMs: 125,
      maximumParallelShards: 32,
      maximumBatchRpc: 32,
      maximumHttpStarts: Math.min(
        count * 4 + plan.length * initialRpcCalls,
        Math.ceil(plan.length / 32) * (catalogMode ? 552 : 532)
      ),
    },
    'budget'
  );
  check(Array.isArray(verification.partitions), 'partitions');
  const selected = protocol.ranges.filter((r: Json) => r.id === binding.partition),
    reported = verification.partitions.filter((p: Json) => p.id === binding.partition);
  check(selected.length === 1 && reported.length === 1 && reported[0].sha256 === binding.blocksFileSha256, 'partition');
  same(selected[0].first, reported[0].first, 'partition');
  same(selected[0].last, reported[0].last, 'partition');
  const rawBlocks = (await read(`blocks-${binding.partition}`, binding.blocksFileSha256, 32 * 1024 * 1024)).value;
  check(
    Array.isArray(rawBlocks) &&
      rawBlocks.length > 1 &&
      rawBlocks.length <= 100000 &&
      rawBlocks.length === reported[0].blocks,
    'block-list'
  );
  const expectedBlocks = rawBlocks.map(block);
  check(goalRawBytesSha256(utf8(JSON.stringify(expectedBlocks))) === binding.blocksSha256, 'blocks-digest');
  same(expectedBlocks[0], selected[0].first, 'first');
  same(expectedBlocks.at(-1), selected[0].last, 'last');
  check(expectedBlocks.length === selected[0].last.height - selected[0].first.height + 1, 'block-count');
  const hashes = new Set<string>();
  for (const [i, b] of expectedBlocks.entries()) {
    check(
      !hashes.has(b.hash) &&
        (!i ||
          (b.height === expectedBlocks[i - 1].height + 1 &&
            b.parentHash === expectedBlocks[i - 1].hash &&
            b.timestampMs > expectedBlocks[i - 1].timestampMs)),
      'block-chain'
    );
    hashes.add(b.hash);
  }
  const reconstructedProfiles = new Map<number, GoalBundleCatalogBlockProfile>(),
    observedCodes = new Map<string, string>();
  const reconstructed = new Map<number, GoalQualificationClockBlock>(),
    visited = new Set<number>();
  const groups: GoalBundleMetadataVerification['provenance']['groups'][number][] = [],
    shards: GoalBundleMetadataVerification['provenance']['shards'][number][] = [];
  let lastGroupStartedAtMs = 0,
    totalLogicalCalls = 0,
    totalWireCalls = 0,
    totalHttpStarts = 0,
    totalResponseBytes = 0;
  const layouts = new Map<string, ReturnType<typeof readGoalArchivedTimestampLayout>>();
  const knownHeaders = new Map<string, ReturnType<typeof readGoalArchivedHeader>>(),
    knownHeights = new Map<number, string>(),
    children = new Map<string, number>();
  const shardName = (index: number) => `shard-${String(index).padStart(5, '0')}.complete`;
  const wireKey = (id: unknown, method: unknown, params: unknown, responseBody: unknown) =>
    digest({ id, method, params, responseBody });
  const verifyShard = (
    rawShard: Json,
    index: number,
    groupName: string,
    wire: Map<string, number>,
    fileSha256: string
  ) => {
    fresh();
    const p = plan[index],
      s = object(rawShard, [
        'version',
        'kind',
        'protocolSha256',
        'index',
        'rangeId',
        'firstHeight',
        'lastHeight',
        'schema',
        'blocks',
        ...(catalogMode ? ['blockProfiles'] : []),
        'rpcEvidence',
        'counts',
        'transportGroup',
        'sha256',
      ]),
      { sha256, ...body } = s;
    check(
      s.version === (catalogMode ? 2 : 1) &&
        s.kind === (catalogMode ? 'complete-catalog-metadata-shard' : 'complete-metadata-shard') &&
        s.protocolSha256 === protocolSha256 &&
        s.index === index &&
        s.rangeId === p.rangeId &&
        s.firstHeight === p.first &&
        s.lastHeight === p.last &&
        s.transportGroup === groupName &&
        SHA.test(sha256) &&
        digest(body) === sha256,
      'shard'
    );
    same(s.schema, schema, 'shard-schema');
    check(
      Array.isArray(s.blocks) &&
        s.blocks.length === p.last - p.first + 1 &&
        Array.isArray(s.rpcEvidence) &&
        s.rpcEvidence.length === initialRpcCalls + 4 * s.blocks.length,
      'shard-count'
    );
    let responseBytes = 0,
      cursor = 0;
    const remember = (hash: string, rawHeader: unknown) => {
      check(HASH.test(hash), 'rpc-hash');
      const header = readGoalArchivedHeader(rawHeader),
        prior = knownHeaders.get(hash),
        sameHeight = knownHeights.get(header.height),
        parent = knownHeaders.get(header.parentHash),
        predecessor = knownHeights.get(header.height - 1),
        successorHash = knownHeights.get(header.height + 1),
        successor = successorHash ? knownHeaders.get(successorHash) : undefined,
        priorChild = children.get(header.parentHash),
        ownChild = children.get(hash);
      check(
        header.parentHash !== hash &&
          (!prior || prior.identity === header.identity) &&
          (!sameHeight || sameHeight === hash),
        'header-identity'
      );
      check(
        (!parent || parent.height === header.height - 1) &&
          (!predecessor || predecessor === header.parentHash) &&
          (!successor || successor.parentHash === hash) &&
          (priorChild === undefined || priorChild === header.height) &&
          (ownChild === undefined || ownChild === header.height + 1),
        'header-link'
      );
      knownHeaders.set(hash, header);
      knownHeights.set(header.height, hash);
      children.set(header.parentHash, header.height);
      return header;
    };
    const rpc = (method: string, params: unknown[]) => {
      const r = object(s.rpcEvidence[cursor], [
        'id',
        'method',
        'params',
        'requestedAt',
        'completedAt',
        'httpStatus',
        'responseBody',
        'responseSha256',
      ]);
      cursor++;
      check(
        r.id === cursor && r.method === method && r.httpStatus === 200 && typeof r.responseBody === 'string',
        'logical-rpc'
      );
      same(r.params, params, 'logical-request');
      iso(r.requestedAt);
      iso(r.completedAt);
      check(Date.parse(r.completedAt) >= Date.parse(r.requestedAt), 'logical-time');
      const bytes = utf8(r.responseBody);
      responseBytes += bytes.length;
      check(
        bytes.length > 0 &&
          bytes.length <= 2097152 &&
          responseBytes <= maximumShardBytes &&
          goalRawBytesSha256(bytes) === r.responseSha256,
        'logical-response'
      );
      const key = wireKey(r.id, r.method, r.params, r.responseBody),
        remaining = wire.get(key);
      check(remaining && remaining > 0, 'wire-join');
      wire.set(key, remaining - 1);
      const result = object(parse(bytes));
      check(
        result.jsonrpc === '2.0' &&
          result.id === r.id &&
          Object.hasOwn(result, 'result') &&
          !Object.hasOwn(result, 'error'),
        'logical-result'
      );
      return result.result;
    };
    check(rpc('chain_getBlockHash', [0]) === GENESIS, 'genesis');
    const finalizedHash = rpc('chain_getFinalizedHead', []),
      observed = remember(finalizedHash, rpc('chain_getHeader', [finalizedHash]));
    check(observed.height >= finalized.height, 'finality');
    check(rpc('chain_getBlockHash', [finalized.height]) === finalized.hash, 'source-finality');
    check(
      remember(finalized.hash, rpc('chain_getHeader', [finalized.hash])).height === finalized.height,
      'source-finality'
    );
    const authenticatedProfiles = new Map<string, GoalRuntimeCatalogProfile>();
    if (catalogMode) {
      assertGoalRuntimeCatalog(catalog);
      for (const declared of schema.profiles) {
        const anchor = declared.schemaAnchor,
          expected = declared.profile as GoalRuntimeCatalogProfile;
        check(rpc('chain_getBlockHash', [anchor.height]) === anchor.hash, 'anchor');
        check(remember(anchor.hash, rpc('chain_getHeader', [anchor.hash])).height === anchor.height, 'anchor');
        const version = object(rpc('state_getRuntimeVersion', [anchor.hash]));
        same(
          {
            specName: version.specName,
            specVersion: version.specVersion,
            transactionVersion: version.transactionVersion,
          },
          {
            specName: 'sora-substrate',
            specVersion: expected.specVersion,
            transactionVersion: expected.transactionVersion,
          },
          'runtime'
        );
        const code = rpc('state_getStorageHash', [CODE, anchor.hash]);
        check(code === expected.codeHash, 'runtime-code');
        check(!observedCodes.has(anchor.hash) || observedCodes.get(anchor.hash) === code, 'block-profile-conflict');
        observedCodes.set(anchor.hash, code);
        const entry = lookupGoalRuntimeCatalogEntry(catalog, code),
          metadata = rpc('state_getMetadata', [anchor.hash]);
        check(
          entry.role === 'historical-source' &&
            typeof metadata === 'string' &&
            metadata.toLowerCase() === entry.metadataHex,
          'metadata-pin'
        );
        let layout = layouts.get(metadata);
        if (!layout) {
          layout = readGoalArchivedTimestampLayout(metadata);
          check(layouts.size < 8, 'layouts');
          layouts.set(metadata, layout);
        }
        same(layout, declared.timestampLayout, 'metadata-layout');
        same(entry.profile, expected, 'catalog-profile');
        check(digest(entry.profile) === declared.profileSha256, 'profile-digest');
        authenticatedProfiles.set(code, entry.profile);
      }
      check(
        authenticatedProfiles.size === 3 &&
          Array.isArray(s.blockProfiles) &&
          s.blockProfiles.length === s.blocks.length,
        'block-profiles'
      );
    } else {
      check(rpc('chain_getBlockHash', [anchor!.height]) === anchor!.hash, 'anchor');
      check(remember(anchor!.hash, rpc('chain_getHeader', [anchor!.hash])).height === anchor!.height, 'anchor');
      const version = object(rpc('state_getRuntimeVersion', [anchor!.hash]));
      same(
        {
          specName: version.specName,
          specVersion: version.specVersion,
          transactionVersion: version.transactionVersion,
        },
        runtime,
        'runtime'
      );
      check(rpc('state_getStorageHash', [CODE, anchor!.hash]) === schema.codeHash, 'runtime-code');
      const metadata = rpc('state_getMetadata', [anchor!.hash]);
      check(typeof metadata === 'string', 'metadata');
      let layout = layouts.get(metadata);
      if (!layout) {
        layout = readGoalArchivedTimestampLayout(metadata);
        check(layouts.size < 8, 'layouts');
        layouts.set(metadata, layout);
      }
      same({ ...layout, codeHash: schema.codeHash, runtimeVersion: runtime }, schema, 'metadata-layout');
    }
    for (let height = p.first; height <= p.last; height++) {
      const hash = rpc('chain_getBlockHash', [height]),
        header = remember(hash, rpc('chain_getHeader', [hash]));
      check(
        header.height === height &&
          (catalogMode
            ? source.schemaAnchors.every((a: Json) => height !== a.height || hash === a.hash)
            : height !== anchor!.height || hash === anchor!.hash) &&
          (height !== finalized.height || hash === finalized.hash),
        'canonical-block'
      );
      const code = rpc('state_getStorageHash', [CODE, hash]);
      if (catalogMode) {
        const profile = authenticatedProfiles.get(code);
        check(profile, 'block-runtime');
        check(!observedCodes.has(hash) || observedCodes.get(hash) === code, 'block-profile-conflict');
        observedCodes.set(hash, code);
        const association = { height, hash, codeHash: code, profileSha256: digest(profile) };
        same(s.blockProfiles[height - p.first], association, 'block-profile');
        if (p.rangeId === binding.partition) {
          check(!reconstructedProfiles.has(height), 'duplicate-profile');
          reconstructedProfiles.set(height, freeze({ ...association, profile }));
        }
      } else check(code === schema.codeHash, 'block-runtime');
      const timestampMs = readGoalArchivedTimestamp(rpc('state_getStorage', [TIME, hash]));
      const decoded = { height, hash, parentHash: header.parentHash, timestampMs };
      same(decoded, s.blocks[height - p.first], 'block-projection');
      if (p.rangeId === binding.partition) {
        same(decoded, expectedBlocks[height - selected[0].first.height], 'exported-block');
        check(!reconstructed.has(height), 'duplicate-block');
        reconstructed.set(height, decoded);
      }
    }
    same(s.counts, { blocks: s.blocks.length, rpcCalls: s.rpcEvidence.length, responseBytes }, 'shard-counts');
    shards.push({
      name: shardName(index),
      fileSha256,
      valueSha256: sha256,
      transportGroup: groupName,
      firstRequestedAt: s.rpcEvidence[0].requestedAt,
      lastCompletedAt: s.rpcEvidence.at(-1).completedAt,
      logicalReceipts: cursor,
    });
    visited.add(index);
  };
  for (const p of plan.filter((p) => p.rangeId === binding.partition)) {
    if (visited.has(p.index)) continue;
    const first = await read(shardName(p.index)),
      groupName = first.value.transportGroup;
    check(typeof groupName === 'string' && /^group-\d{5}$/.test(groupName), 'group-name');
    const groupFile = await read(groupName + '.complete'),
      g = object(groupFile.value, ['protocolSha256', 'indices', 'stats', 'batches', 'sha256']),
      { sha256, ...groupBody } = g;
    check(
      g.protocolSha256 === protocolSha256 &&
        SHA.test(sha256) &&
        digest(groupBody) === sha256 &&
        Array.isArray(g.indices) &&
        g.indices.length > 0 &&
        g.indices.length <= 32 &&
        g.indices.includes(p.index) &&
        g.indices.every(
          (n: number, i: number) => integer(n) && !!plan[n] && !visited.has(n) && (!i || n === g.indices[i - 1] + 1)
        ) &&
        groupName === `group-${String(g.indices[0]).padStart(5, '0')}`,
      'group'
    );
    check(Array.isArray(g.batches) && g.batches.length > 0 && g.batches.length <= (catalogMode ? 552 : 532), 'batches');
    const wire = new Map<string, number>(),
      logicalIds = new Set<number>();
    let previous = lastGroupStartedAtMs,
      wireCalls = 0,
      logicalCalls = 0,
      responseBytes = 0;
    const batchProvenance: GoalBundleMetadataVerification['provenance']['groups'][number]['batches'][number][] = [];
    for (const [i, entry] of g.batches.entries()) {
      object(entry, ['index', 'sha256']);
      check(entry.index === i && SHA.test(entry.sha256), 'batch-index');
      const name = `${groupName}.batch-${String(i).padStart(5, '0')}`,
        file = await read(name),
        b = object(file.value, [
          'version',
          'index',
          'request',
          'mapping',
          'complete',
          'startedAtMs',
          'httpStatus',
          'responseBody',
          'responseSha256',
          'bytes',
          'completedAtMs',
        ]);
      check(
        digest(b) === entry.sha256 &&
          b.version === 1 &&
          b.index === i &&
          b.complete === true &&
          b.httpStatus === 200 &&
          integer(b.startedAtMs) &&
          b.startedAtMs >= previous + 125 &&
          integer(b.completedAtMs) &&
          b.completedAtMs >= b.startedAtMs &&
          typeof b.responseBody === 'string',
        'batch'
      );
      previous = b.startedAtMs;
      const rawResponse = utf8(b.responseBody);
      check(
        rawResponse.length > 0 &&
          rawResponse.length <= 8 * 1024 * 1024 &&
          rawResponse.length === b.bytes &&
          goalRawBytesSha256(rawResponse) === b.responseSha256,
        'batch-response'
      );
      responseBytes += b.bytes;
      check(
        Array.isArray(b.request) &&
          b.request.length > 0 &&
          b.request.length <= 32 &&
          Array.isArray(b.mapping) &&
          b.mapping.length === b.request.length,
        'batch-request'
      );
      const replies = parse(rawResponse);
      check(Array.isArray(replies) && replies.length === b.request.length, 'batch-replies');
      const responses = new Map<number, Json>();
      for (const value of replies) {
        const r = object(value);
        check(
          integer(r.id) &&
            r.id > 0 &&
            !responses.has(r.id) &&
            r.jsonrpc === '2.0' &&
            Object.hasOwn(r, 'result') &&
            !Object.hasOwn(r, 'error'),
          'batch-result'
        );
        responses.set(r.id, r);
      }
      const requestKeys = new Set<string>();
      wireCalls += b.request.length;
      for (const [j, value] of b.request.entries()) {
        const request = object(value, ['jsonrpc', 'id', 'method', 'params']);
        check(
          request.jsonrpc === '2.0' &&
            request.id === j + 1 &&
            typeof request.method === 'string' &&
            Array.isArray(request.params),
          'wire-request'
        );
        const rk = canonical([request.method, request.params]);
        check(!requestKeys.has(rk), 'wire-dedup');
        requestKeys.add(rk);
        const mappings = b.mapping.filter((m: Json) => m.wireId === request.id);
        check(mappings.length === 1, 'mapping');
        const mapping = object(mappings[0], ['wireId', 'requests']);
        check(
          Array.isArray(mapping.requests) && mapping.requests.length > 0 && mapping.requests.length <= 32,
          'mapping'
        );
        const response = responses.get(request.id);
        check(response, 'batch-result');
        for (const rawMember of mapping.requests) {
          const m = object(rawMember, ['logicalRequestId', 'originalId']);
          check(
            integer(m.logicalRequestId) &&
              m.logicalRequestId > 0 &&
              !logicalIds.has(m.logicalRequestId) &&
              integer(m.originalId) &&
              m.originalId > 0,
            'logical-id'
          );
          logicalIds.add(m.logicalRequestId);
          logicalCalls++;
          const projected = JSON.stringify({ ...response, id: m.originalId });
          check(utf8(projected).length <= 2097152, 'projection-size');
          const key = wireKey(m.originalId, request.method, request.params, projected);
          wire.set(key, (wire.get(key) ?? 0) + 1);
        }
      }
      batchProvenance.push({
        name,
        fileSha256: file.sha256,
        responseSha256: b.responseSha256,
        startedAtMs: b.startedAtMs,
        completedAtMs: b.completedAtMs,
      });
    }
    check(
      logicalCalls ===
        g.indices.reduce((n: number, i: number) => n + initialRpcCalls + 4 * (plan[i].last - plan[i].first + 1), 0) &&
        logicalIds.size === logicalCalls &&
        Array.from(logicalIds).every((n) => n <= logicalCalls),
      'logical-count'
    );
    same(
      g.stats,
      {
        logicalRpcCalls: logicalCalls,
        wireRpcCalls: wireCalls,
        httpStarts: g.batches.length,
        responseBytes,
        lastStartedAtMs: previous,
      },
      'group-stats'
    );
    lastGroupStartedAtMs = previous;
    totalLogicalCalls += logicalCalls;
    totalWireCalls += wireCalls;
    totalHttpStarts += g.batches.length;
    totalResponseBytes += responseBytes;
    check(
      totalLogicalCalls <= protocol.budget.rpcCalls &&
        totalWireCalls <= totalLogicalCalls &&
        totalHttpStarts <= protocol.budget.maximumHttpStarts &&
        totalResponseBytes <= protocol.budget.totalBytes,
      'group-budget'
    );
    for (const index of g.indices) {
      const file = index === p.index ? first : await read(shardName(index));
      verifyShard(file.value, index, groupName, wire, file.sha256);
    }
    check(
      [...wire.values()].every((n) => n === 0),
      'unmatched-wire'
    );
    groups.push({ name: groupName, fileSha256: groupFile.sha256, valueSha256: sha256, batches: batchProvenance });
  }
  check(reconstructed.size === expectedBlocks.length, 'incomplete');
  fresh();
  // Archive identity hashes JSON.stringify of the original block array. Rebuild every value while
  // preserving its recorded property order; the callback builder has its own normalized digest.
  const blocks = expectedBlocks.map((b) => {
    const decoded = reconstructed.get(b.height)!;
    return Object.fromEntries(
      Object.keys(b).map((key) => [key, decoded[key as keyof GoalQualificationClockBlock]])
    ) as unknown as GoalQualificationClockBlock;
  });
  check(goalRawBytesSha256(utf8(JSON.stringify(blocks))) === binding.blocksSha256, 'reconstructed-digest');
  const common = {
    blocks,
    firstHeight: blocks[0].height,
    lastHeight: blocks[blocks.length - 1].height,
  };
  const provenance = {
    attestation: 'rpc-canonical-finalized' as const,
    genesisHash: GENESIS,
    binding,
    protocolSha256,
    sourceHashes: protocol.sourceHashes,
    groups,
    shards,
    artifactReads,
    artifactBytes,
    arrivalTimeKnown: false as const,
    marketDataRead: false as const,
  };
  let result: GoalBundleAnyMetadataVerification;
  if (catalogMode) {
    assertGoalRuntimeCatalog(catalog);
    check(reconstructedProfiles.size === blocks.length, 'incomplete-profiles');
    const blockProfiles = blocks.map((b) => reconstructedProfiles.get(b.height)!);
    const profileForBlock = (hash: string, height: number): GoalBundleCatalogBlockProfile => {
      fresh();
      const profile = reconstructedProfiles.get(height);
      check(profile && profile.hash === hash, 'profile-block');
      return profile;
    };
    result = freeze({
      ...common,
      kind: 'goal-bundle-catalog-metadata-v2' as const,
      blockProfiles,
      profileForBlock,
      provenance: {
        ...provenance,
        kind:
          binding.partition === 'training'
            ? ('raw-verified-training-callback-metadata-catalog-v2' as const)
            : ('raw-verified-validation-callback-metadata-catalog-v2' as const),
        source: source as unknown as GoalBundleCatalogMetadataSource,
        schema: schema as unknown as GoalBundleCatalogMetadataSchema,
      },
    });
  } else {
    result = freeze({
      ...common,
      provenance: {
        ...provenance,
        kind:
          binding.partition === 'training'
            ? ('raw-verified-training-callback-metadata-v1' as const)
            : ('raw-verified-validation-callback-metadata-v1' as const),
        source: source as GoalBundleMetadataVerification['provenance']['source'],
        schema: schema as GoalBundleMetadataVerification['provenance']['schema'],
      },
    });
  }
  owned.set(result, {
    bindingSha256: digest(binding),
    assertCurrent: catalogMode ? fresh : assertCurrent,
    ...(admission ? { admission } : {}),
    ...(catalog ? { catalog } : {}),
  });
  return result;
}
