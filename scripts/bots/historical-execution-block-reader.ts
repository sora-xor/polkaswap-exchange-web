/**
 * Bounded metadata-only archive adapter for the historical execution locator.
 * Finality/canonicality are RPC-attested. A fixed historical runtime code hash
 * guards the timestamp storage layout, not quote execution compatibility.
 * Limits: 64 block reads, 272 RPC calls, 2 MiB per response and 12 MiB in total.
 * Each RPC has a 20-second default timeout (at most 30 seconds), covering its body.
 */
import { createHash } from 'node:crypto';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { xxhashAsHex } from '@polkadot/util-crypto';
import {
  assertGoalRuntimeCatalog,
  lookupGoalRuntimeCatalogEntry,
  type GoalRuntimeCatalog,
  type GoalRuntimeCatalogEntry,
  type GoalRuntimeCatalogProfile,
} from '../../src/features/bot-trading/execution-codecs/runtime-catalog';
import type { HistoricalClockBlock } from './historical-execution-clock';

const ENDPOINT = 'https://mof2.sora.org/';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const TIMESTAMP_KEY = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const CODE_KEY = '0x3a636f6465';
const HASH = /^0x[0-9a-f]{64}$/;
const HEX = /^0x(?:[0-9a-fA-F]{2})+$/;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_RPC_CALLS = 272;
const MAX_BLOCK_READS = 64;

/** Three authenticated schema anchors add ten calls to the unchanged legacy initialization. */
export const CATALOG_HISTORICAL_BLOCK_READER_LIMITS = Object.freeze({
  initialRpcCalls: 20,
  blockRpcCalls: 4,
  blockReads: MAX_BLOCK_READS,
  rpcCalls: 20 + MAX_BLOCK_READS * 4,
  responseBytes: MAX_RESPONSE_BYTES,
  totalResponseBytes: MAX_TOTAL_BYTES,
});

/** The receipt is provenance supplied and independently verified by the caller. */
export interface HistoricalBlockReaderSource {
  finalizedSource: { hash: string; height: number; receiptSha256: string };
  schemaAnchor: { hash: string; height: number };
}

/** The transport is injectable for offline tests; authority and endpoint overrides are not accepted. */
export interface HistoricalBlockReaderOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Exact, ordered source anchors; a source version never stands in for its authenticated code identity. */
export interface CatalogHistoricalBlockReaderSource {
  readonly kind: 'catalog-source-v1';
  readonly finalizedSource: Readonly<HistoricalBlockReaderSource['finalizedSource']>;
  readonly schemaAnchors: readonly {
    readonly specVersion: 128 | 129 | 130;
    readonly hash: string;
    readonly height: number;
  }[];
}

export interface CatalogHistoricalBlockReaderOptions extends HistoricalBlockReaderOptions {
  readonly catalog: GoalRuntimeCatalog;
}

type TimestampLayout = Readonly<{
  key: string;
  type: 'u64';
  unit: 'milliseconds';
  metadataSha256: string;
}>;
type FinalizedObservation = Readonly<{ kind: 'rpc-canonical-finalized'; hash: string; height: number }>;
export interface CatalogHistoricalBlockProfile {
  readonly height: number;
  readonly hash: string;
  readonly codeHash: string;
  readonly profileSha256: string;
}
export interface CatalogHistoricalBlockReaderContext {
  readonly endpoint: string;
  readonly genesisHash: string;
  readonly source: Readonly<CatalogHistoricalBlockReaderSource>;
  readonly finalizedObservation: FinalizedObservation;
  readonly catalogSha256: string;
  readonly profiles: readonly Readonly<{
    profileSha256: string;
    profile: GoalRuntimeCatalogProfile;
    schemaAnchor: CatalogHistoricalBlockReaderSource['schemaAnchors'][number];
    timestampLayout: TimestampLayout;
  }>[];
  readonly observedFill: false;
}
interface HistoricalBlockReaderContext {
  readonly finalizedSource: Readonly<HistoricalBlockReaderSource['finalizedSource']>;
  readonly schemaAnchor: Readonly<HistoricalBlockReaderSource['schemaAnchor']>;
  readonly endpoint: string;
  readonly genesisHash: string;
  readonly finalizedObservation: FinalizedObservation;
  readonly schema: TimestampLayout & {
    readonly codeHash: string;
    readonly runtimeVersion: Readonly<{ specName: string; specVersion: number; transactionVersion: number }>;
  };
  readonly observedFill: false;
}
export interface HistoricalExecutionBlockReader {
  readonly context: Readonly<HistoricalBlockReaderContext>;
  readBlock(height: number): Promise<HistoricalClockBlock>;
  evidence(): readonly Readonly<HistoricalBlockRpcEvidence>[];
}
export interface CatalogHistoricalExecutionBlockReader {
  readonly context: Readonly<CatalogHistoricalBlockReaderContext>;
  readBlock(height: number): Promise<HistoricalClockBlock>;
  evidence(): readonly Readonly<HistoricalBlockRpcEvidence>[];
  /** Successful reads only, in exact read order; frozen snapshots never gain later associations. */
  blockProfiles(): readonly Readonly<CatalogHistoricalBlockProfile>[];
}

/** Only headers, runtime/schema information, and timestamps are requested. */
export interface HistoricalBlockRpcEvidence {
  id: number;
  method: string;
  params: readonly (string | number)[];
  requestedAt: string;
  completedAt?: string;
  httpStatus?: number;
  responseBody?: string;
  responseBodyBase64?: string;
  responseSha256?: string;
  failure?: string;
}

/** Failure snapshots remain unchanged even if a transport ignores an abort and resolves later. */
export class HistoricalExecutionBlockReadError extends Error {
  constructor(
    readonly diagnostic: Readonly<{
      stage: string;
      reason: string;
      blockHeight?: number;
      blockReads: number;
      rpcEvidence: readonly Readonly<HistoricalBlockRpcEvidence>[];
      blockProfiles?: readonly Readonly<CatalogHistoricalBlockProfile>[];
      financialActions: false;
    }>
  ) {
    super(`Historical block read failed: ${diagnostic.stage} (${diagnostic.reason})`);
    this.name = 'HistoricalExecutionBlockReadError';
  }
}

const requireValue = (condition: unknown, reason = 'invalid-evidence'): void => {
  if (!condition) throw new Error(reason);
};

/** Reject accessors before copying any request scalar. */
function object(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  requireValue(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype);
  const fields = value as Record<string, unknown>;
  const own = Reflect.ownKeys(fields);
  requireValue(own.every((key) => typeof key === 'string'));
  if (keys) requireValue(own.length === keys.length && own.every((key) => keys.includes(key as string)));
  requireValue(
    Object.values(Object.getOwnPropertyDescriptors(fields)).every((entry) => 'value' in entry && entry.enumerable)
  );
  return fields;
}
function hash(value: unknown): string {
  requireValue(typeof value === 'string' && HASH.test(value));
  return value as string;
}
function height(value: unknown): number {
  requireValue(Number.isSafeInteger(value) && Number(value) > 0);
  return value as number;
}
function sourceCopy(value: HistoricalBlockReaderSource) {
  const input = object(value, ['finalizedSource', 'schemaAnchor']);
  const source = object(input.finalizedSource, ['hash', 'height', 'receiptSha256']);
  const schema = object(input.schemaAnchor, ['hash', 'height']);
  requireValue(typeof source.receiptSha256 === 'string' && /^[0-9a-f]{64}$/.test(source.receiptSha256));
  const finalizedSource = Object.freeze({
    hash: hash(source.hash),
    height: height(source.height),
    receiptSha256: source.receiptSha256 as string,
  });
  const schemaAnchor = Object.freeze({ hash: hash(schema.hash), height: height(schema.height) });
  requireValue(schemaAnchor.height <= finalizedSource.height);
  requireValue((schemaAnchor.height === finalizedSource.height) === (schemaAnchor.hash === finalizedSource.hash));
  return Object.freeze({ finalizedSource, schemaAnchor });
}

/** Snapshot the exact finite source set before the first asynchronous RPC. */
function catalogSourceCopy(value: CatalogHistoricalBlockReaderSource): Readonly<CatalogHistoricalBlockReaderSource> {
  const input = object(value, ['kind', 'finalizedSource', 'schemaAnchors']);
  requireValue(input.kind === 'catalog-source-v1');
  const raw = input.schemaAnchors;
  requireValue(Array.isArray(raw) && raw.length === 3);
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  requireValue(Reflect.ownKeys(descriptors).length === 4);
  const schemaAnchors = [128, 129, 130].map((version, i) => {
    requireValue(descriptors[i] && descriptors[i].enumerable && 'value' in descriptors[i]);
    const anchor = object(descriptors[i].value, ['specVersion', 'hash', 'height']);
    requireValue(anchor.specVersion === version);
    const original = sourceCopy({
      finalizedSource: input.finalizedSource as HistoricalBlockReaderSource['finalizedSource'],
      schemaAnchor: { hash: anchor.hash as string, height: anchor.height as number },
    });
    return Object.freeze({ specVersion: version as 128 | 129 | 130, ...original.schemaAnchor });
  });
  requireValue(new Set(schemaAnchors.map((a) => a.hash)).size === 3);
  requireValue(new Set(schemaAnchors.map((a) => a.height)).size === 3);
  const { finalizedSource } = sourceCopy({
    finalizedSource: input.finalizedSource as HistoricalBlockReaderSource['finalizedSource'],
    schemaAnchor: { hash: schemaAnchors[0].hash, height: schemaAnchors[0].height },
  });
  return Object.freeze({ kind: 'catalog-source-v1', finalizedSource, schemaAnchors: Object.freeze(schemaAnchors) });
}

/** Canonical sorted-JSON digest of the complete catalog profile, including its genesis hash. No authority. */
export function historicalCatalogProfileSha256(profile: GoalRuntimeCatalogProfile): string {
  const value = object(profile, ['genesisHash', 'specVersion', 'transactionVersion', 'metadataSha256', 'codeHash']);
  hash(value.genesisHash);
  hash(value.codeHash);
  requireValue([128, 129, 130, 131].includes(value.specVersion as number));
  requireValue(value.transactionVersion === value.specVersion);
  requireValue(typeof value.metadataSha256 === 'string' && /^[0-9a-f]{64}$/.test(value.metadataSha256));
  const canonical = `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${JSON.stringify(value[key])}`)
    .join(',')}}`;
  return createHash('sha256').update(canonical).digest('hex');
}
function header(value: unknown) {
  const input = object(value);
  requireValue(typeof input.number === 'string' && /^0x[0-9a-f]+$/.test(input.number));
  const number = BigInt(input.number as string);
  requireValue(number > 0n && number <= BigInt(Number.MAX_SAFE_INTEGER));
  hash(input.stateRoot);
  hash(input.extrinsicsRoot);
  const digest = object(input.digest);
  requireValue(Array.isArray(digest.logs) && digest.logs.length <= 128);
  requireValue(
    (digest.logs as unknown[]).every((log) => typeof log === 'string' && HEX.test(log) && log.length <= 65538)
  );
  const parentHash = hash(input.parentHash);
  return Object.freeze({
    height: Number(number),
    parentHash,
    identity: JSON.stringify([Number(number), parentHash, input.stateRoot, input.extrinsicsRoot, digest.logs]),
  });
}

/** Supported SORA runtimes use milliseconds in Timestamp.Now; no future runtime alias is inferred. */
function runtime(value: unknown) {
  const input = object(value);
  requireValue(input.specName === 'sora-substrate' && [130, 131].includes(input.specVersion as number));
  requireValue(input.transactionVersion === input.specVersion);
  return Object.freeze({
    specName: 'sora-substrate',
    specVersion: input.specVersion as number,
    transactionVersion: input.transactionVersion as number,
  });
}

/** Derive the exact storage key and require a plain primitive u64 from archived portable metadata. */
function timestampLayout(value: unknown) {
  requireValue(typeof value === 'string' && HEX.test(value) && value.length <= MAX_RESPONSE_BYTES * 2 + 2);
  const raw = Buffer.from((value as string).slice(2), 'hex');
  const registry = new TypeRegistry();
  const metadata = new Metadata(registry, raw);
  requireValue(metadata.version === 14 && Buffer.from(metadata.toU8a()).equals(raw));
  const pallets = metadata.asV14.pallets.filter((pallet) => pallet.name.toString() === 'Timestamp');
  requireValue(pallets.length === 1 && pallets[0].storage.isSome);
  const storage = pallets[0].storage.unwrap();
  const entries = storage.items.filter((entry) => entry.name.toString() === 'Now');
  requireValue(entries.length === 1 && entries[0].type.isPlain);
  const typeId = entries[0].type.asPlain.toNumber();
  const definitions = metadata.asV14.lookup.types.filter((entry) => entry.id.toNumber() === typeId);
  requireValue(
    definitions.length === 1 &&
      definitions[0].type.def.isPrimitive &&
      definitions[0].type.def.asPrimitive.toString() === 'U64'
  );
  const key = xxhashAsHex(storage.prefix.toString(), 128) + xxhashAsHex(entries[0].name.toString(), 128).slice(2);
  requireValue(key === TIMESTAMP_KEY);
  return Object.freeze({
    key,
    type: 'u64' as const,
    unit: 'milliseconds' as const,
    metadataSha256: createHash('sha256').update(raw).digest('hex'),
  });
}

// Catalog entries are privately owned and immutable; raw reply equality is still checked on every initialization.
const catalogTimestampLayouts = new WeakMap<GoalRuntimeCatalogEntry, TimestampLayout>();
function catalogTimestampLayout(entry: GoalRuntimeCatalogEntry): TimestampLayout {
  let layout = catalogTimestampLayouts.get(entry);
  if (!layout) {
    layout = timestampLayout(entry.metadataHex);
    catalogTimestampLayouts.set(entry, layout);
  }
  return layout;
}

/** Exact SCALE u64 decoding never substitutes a missing storage default or rounds a timestamp. */
function timestamp(value: unknown): number {
  requireValue(typeof value === 'string' && /^0x[0-9a-fA-F]{16}$/.test(value));
  const decoded = Buffer.from((value as string).slice(2), 'hex').readBigUInt64LE();
  requireValue(decoded > 0n && decoded <= BigInt(Number.MAX_SAFE_INTEGER));
  return Number(decoded);
}

/**
 * Initialize one fixed historical schema and finalized source, then expose serial
 * metadata-only reads for at most 64 blocks. The schema anchor may use runtime 130
 * while the finalized source uses 131; every located block must match the schema's
 * code hash. An upgrade or missing state stops the session without another anchor.
 */
export function createHistoricalExecutionBlockReader(
  input: HistoricalBlockReaderSource,
  options: HistoricalBlockReaderOptions = {}
): Promise<HistoricalExecutionBlockReader> {
  return createBlockReader(input, options, false) as Promise<HistoricalExecutionBlockReader>;
}

/** Authenticate all catalog anchors, then bind each unchanged clock block to its genuine observed source code. */
export function createCatalogHistoricalExecutionBlockReader(
  input: CatalogHistoricalBlockReaderSource,
  options: CatalogHistoricalBlockReaderOptions
): Promise<CatalogHistoricalExecutionBlockReader> {
  return createBlockReader(input, options, true) as Promise<CatalogHistoricalExecutionBlockReader>;
}

/** Shared bounded transport and canonical-header rules; version-specific provenance remains explicit. */
async function createBlockReader(
  input: HistoricalBlockReaderSource | CatalogHistoricalBlockReaderSource,
  options: HistoricalBlockReaderOptions | CatalogHistoricalBlockReaderOptions,
  catalogMode: boolean
): Promise<HistoricalExecutionBlockReader | CatalogHistoricalExecutionBlockReader> {
  const rpcEvidence: HistoricalBlockRpcEvidence[] = [];
  const blockProfiles: Readonly<CatalogHistoricalBlockProfile>[] = [];
  const profileSnapshot = () => Object.freeze([...blockProfiles]);
  let totalBytes = 0;
  let blockReads = 0;
  let stage = 'input';
  let blockHeight: number | undefined;
  let stopped: HistoricalExecutionBlockReadError | undefined;
  let active = false;
  const snapshot = () =>
    Object.freeze(rpcEvidence.map((item) => Object.freeze({ ...item, params: Object.freeze([...item.params]) })));
  const failure = (error: unknown) => {
    const allowed = [
      'aborted',
      'timeout',
      'response-limit',
      'rpc-limit',
      'block-limit',
      'rpc-failed',
      'missing-block',
      'missing-timestamp',
      'runtime-changed',
      'concurrent-read',
    ];
    const reason = error instanceof Error && allowed.includes(error.message) ? error.message : 'invalid-evidence';
    return new HistoricalExecutionBlockReadError(
      Object.freeze({
        stage,
        reason,
        ...(blockHeight === undefined ? {} : { blockHeight }),
        blockReads,
        rpcEvidence: snapshot(),
        ...(catalogMode ? { blockProfiles: profileSnapshot() } : {}),
        financialActions: false,
      })
    );
  };
  try {
    const source = catalogMode
      ? catalogSourceCopy(input as CatalogHistoricalBlockReaderSource)
      : sourceCopy(input as HistoricalBlockReaderSource);
    object(options);
    requireValue(
      Object.keys(options).every((key) =>
        ['fetch', 'signal', 'timeoutMs', ...(catalogMode ? ['catalog'] : [])].includes(key)
      )
    );
    const catalog = catalogMode ? (options as CatalogHistoricalBlockReaderOptions).catalog : undefined;
    if (catalogMode) assertGoalRuntimeCatalog(catalog);
    const timeoutMs = options.timeoutMs ?? 20_000;
    const signal = options.signal;
    const transport = options.fetch ?? globalThis.fetch;
    requireValue(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 30_000);
    requireValue(typeof transport === 'function');
    const checkAbort = () => {
      if (signal?.aborted) throw new Error('aborted');
    };
    const headers = new Map<string, ReturnType<typeof header>>();
    /** A canonical finalized height has one hash; repeated hashes must retain their complete header identity. */
    const rememberHeader = (blockHash: string, observed: ReturnType<typeof header>) => {
      requireValue(observed.parentHash !== blockHash);
      for (const [knownHash, known] of headers) {
        if (knownHash === blockHash) requireValue(known.identity === observed.identity);
        else requireValue(known.height !== observed.height);
        if (observed.parentHash === knownHash) requireValue(known.height === observed.height - 1);
        if (known.parentHash === blockHash) requireValue(observed.height === known.height - 1);
        if (known.height === observed.height - 1) requireValue(observed.parentHash === knownHash);
        if (observed.height === known.height - 1) requireValue(known.parentHash === blockHash);
      }
      headers.set(blockHash, observed);
      return observed;
    };

    /** A timeout covers response headers and the entire streamed body, including transports that ignore abort. */
    const rpc = async (method: string, params: readonly (string | number)[]): Promise<unknown> => {
      checkAbort();
      requireValue(
        rpcEvidence.length < (catalogMode ? CATALOG_HISTORICAL_BLOCK_READER_LIMITS.rpcCalls : MAX_RPC_CALLS),
        'rpc-limit'
      );
      const item: HistoricalBlockRpcEvidence = {
        id: rpcEvidence.length + 1,
        method,
        params: Object.freeze([...params]),
        requestedAt: new Date().toISOString(),
      };
      rpcEvidence.push(item);
      const controller = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let ended = false;
      let reason = 'aborted';
      let rejectAbort!: (error: Error) => void;
      const aborted = new Promise<never>((_, reject) => {
        rejectAbort = reject;
      });
      const abort = () => {
        if (ended) return;
        controller.abort();
        void reader?.cancel().catch(() => undefined);
        rejectAbort(new Error(reason));
      };
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => {
        reason = 'timeout';
        abort();
      }, timeoutMs);
      const check = () => {
        if (ended || controller.signal.aborted) throw new Error(reason);
        checkAbort();
      };
      const pending = async () => {
        const response = await transport(ENDPOINT, {
          method: 'POST',
          redirect: 'error',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: item.id, method, params }),
          signal: controller.signal,
        });
        try {
          check();
        } catch (error) {
          void response.body?.cancel().catch(() => undefined);
          throw error;
        }
        item.httpStatus = response.status;
        const declared = response.headers.get('content-length');
        try {
          requireValue(!response.redirected && (!response.url || response.url === ENDPOINT));
          if (declared !== null)
            requireValue(/^\d+$/.test(declared) && Number(declared) <= MAX_RESPONSE_BYTES, 'response-limit');
          requireValue(response.body);
        } catch (error) {
          void response.body?.cancel().catch(() => undefined);
          throw error;
        }
        reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            check();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            totalBytes += chunk.value.byteLength;
            requireValue(bytes <= MAX_RESPONSE_BYTES && totalBytes <= MAX_TOTAL_BYTES, 'response-limit');
            chunks.push(chunk.value);
          }
        } finally {
          if (controller.signal.aborted || bytes > MAX_RESPONSE_BYTES || totalBytes > MAX_TOTAL_BYTES)
            void reader.cancel().catch(() => undefined);
          reader.releaseLock();
          reader = undefined;
        }
        check();
        const rawBytes = Buffer.concat(chunks);
        item.responseSha256 = createHash('sha256').update(rawBytes).digest('hex');
        let raw: string;
        try {
          raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(rawBytes);
        } catch (error) {
          item.responseBodyBase64 = rawBytes.toString('base64');
          throw error;
        }
        item.responseBody = raw;
        requireValue(response.status === 200);
        const result = object(JSON.parse(raw));
        requireValue(result.jsonrpc === '2.0' && result.id === item.id && !('error' in result) && 'result' in result);
        return result.result;
      };
      try {
        checkAbort();
        return await Promise.race([pending(), aborted]);
      } catch (error) {
        controller.abort();
        item.failure =
          error instanceof Error && ['aborted', 'timeout', 'response-limit'].includes(error.message)
            ? error.message
            : 'rpc-failed';
        throw new Error(item.failure);
      } finally {
        ended = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        item.completedAt = new Date().toISOString();
      }
    };

    stage = 'finality';
    requireValue((await rpc('chain_getBlockHash', [0])) === GENESIS);
    const finalizedHash = hash(await rpc('chain_getFinalizedHead', []));
    const finalizedHeader = rememberHeader(finalizedHash, header(await rpc('chain_getHeader', [finalizedHash])));
    requireValue(finalizedHeader.height >= source.finalizedSource.height);
    requireValue((await rpc('chain_getBlockHash', [source.finalizedSource.height])) === source.finalizedSource.hash);
    requireValue(
      rememberHeader(source.finalizedSource.hash, header(await rpc('chain_getHeader', [source.finalizedSource.hash])))
        .height === source.finalizedSource.height
    );
    stage = 'schema';
    const finalizedObservation = Object.freeze({
      kind: 'rpc-canonical-finalized' as const,
      hash: finalizedHash,
      height: finalizedHeader.height,
    });
    let context: HistoricalBlockReaderContext | CatalogHistoricalBlockReaderContext;
    let legacySchema: HistoricalBlockReaderContext['schema'] | undefined;
    const authenticatedProfiles = new Map<string, CatalogHistoricalBlockReaderContext['profiles'][number]>();
    const observedCodes = new Map<string, string>();
    if ('schemaAnchors' in source) {
      assertGoalRuntimeCatalog(catalog);
      const profiles: CatalogHistoricalBlockReaderContext['profiles'][number][] = [];
      for (const anchor of source.schemaAnchors) {
        const expected = catalog.entries.find(
          (entry) => entry.role === 'historical-source' && entry.profile.specVersion === anchor.specVersion
        );
        requireValue(expected);
        const entry = expected!;
        requireValue((await rpc('chain_getBlockHash', [anchor.height])) === anchor.hash);
        requireValue(
          rememberHeader(anchor.hash, header(await rpc('chain_getHeader', [anchor.hash]))).height === anchor.height
        );
        const version = object(await rpc('state_getRuntimeVersion', [anchor.hash]));
        requireValue(
          version.specName === 'sora-substrate' &&
            version.specVersion === entry.profile.specVersion &&
            version.transactionVersion === entry.profile.transactionVersion
        );
        const codeHash = hash(await rpc('state_getStorageHash', [CODE_KEY, anchor.hash]));
        requireValue(codeHash === entry.profile.codeHash && lookupGoalRuntimeCatalogEntry(catalog, codeHash) === entry);
        const metadataHex = await rpc('state_getMetadata', [anchor.hash]);
        requireValue(typeof metadataHex === 'string' && metadataHex.toLowerCase() === entry.metadataHex);
        const layout = catalogTimestampLayout(entry);
        requireValue(
          layout.metadataSha256 === entry.profile.metadataSha256 &&
            layout.key === entry.storage.timestamp.keyHex &&
            entry.profile.genesisHash === GENESIS
        );
        const profile = Object.freeze({
          profileSha256: historicalCatalogProfileSha256(entry.profile),
          profile: entry.profile,
          schemaAnchor: anchor,
          timestampLayout: layout,
        });
        profiles.push(profile);
        authenticatedProfiles.set(codeHash, profile);
        observedCodes.set(anchor.hash, codeHash);
      }
      requireValue(authenticatedProfiles.size === 3);
      context = Object.freeze({
        endpoint: ENDPOINT,
        genesisHash: GENESIS,
        source,
        finalizedObservation,
        catalogSha256: catalog.catalogSha256,
        profiles: Object.freeze(profiles),
        observedFill: false,
      });
    } else {
      requireValue((await rpc('chain_getBlockHash', [source.schemaAnchor.height])) === source.schemaAnchor.hash);
      requireValue(
        rememberHeader(source.schemaAnchor.hash, header(await rpc('chain_getHeader', [source.schemaAnchor.hash])))
          .height === source.schemaAnchor.height
      );
      const version = runtime(await rpc('state_getRuntimeVersion', [source.schemaAnchor.hash]));
      const codeHash = hash(await rpc('state_getStorageHash', [CODE_KEY, source.schemaAnchor.hash]));
      const layout = timestampLayout(await rpc('state_getMetadata', [source.schemaAnchor.hash]));
      legacySchema = Object.freeze({ ...layout, codeHash, runtimeVersion: version });
      context = Object.freeze({
        endpoint: ENDPOINT,
        genesisHash: GENESIS,
        ...source,
        finalizedObservation,
        schema: legacySchema,
        observedFill: false,
      });
    }

    /** Query one canonical hash, exact header, compatible runtime-code hash and exact timestamp; never retry.
     * Concurrent requests are rejected without affecting the already active serial read.
     */
    const readBlock = async (requestedHeight: number): Promise<HistoricalClockBlock> => {
      if (stopped) throw stopped;
      if (active) throw failure(new Error('concurrent-read'));
      active = true;
      blockHeight = Number.isSafeInteger(requestedHeight) && requestedHeight > 0 ? requestedHeight : undefined;
      stage = 'block';
      try {
        height(requestedHeight);
        requireValue(requestedHeight <= source.finalizedSource.height);
        requireValue(blockReads < MAX_BLOCK_READS, 'block-limit');
        blockReads += 1;
        const observedHash = await rpc('chain_getBlockHash', [requestedHeight]);
        requireValue(observedHash !== null, 'missing-block');
        const blockHash = hash(observedHash);
        if (requestedHeight === source.finalizedSource.height) requireValue(blockHash === source.finalizedSource.hash);
        const anchors = 'schemaAnchors' in source ? source.schemaAnchors : [source.schemaAnchor];
        for (const anchor of anchors) if (requestedHeight === anchor.height) requireValue(blockHash === anchor.hash);
        const observedHeader = rememberHeader(blockHash, header(await rpc('chain_getHeader', [blockHash])));
        requireValue(observedHeader.height === requestedHeight && observedHeader.parentHash !== blockHash);
        const observedCode = hash(await rpc('state_getStorageHash', [CODE_KEY, blockHash]));
        const selected = authenticatedProfiles.get(observedCode);
        if (catalogMode) {
          requireValue(selected, 'runtime-changed');
          const owned = lookupGoalRuntimeCatalogEntry(catalog, observedCode);
          requireValue(owned.role === 'historical-source' && selected!.profile === owned.profile, 'runtime-changed');
          const priorCode = observedCodes.get(blockHash);
          requireValue(priorCode === undefined || priorCode === observedCode, 'runtime-changed');
          observedCodes.set(blockHash, observedCode);
        } else requireValue(observedCode === legacySchema!.codeHash, 'runtime-changed');
        const layout = catalogMode ? selected!.timestampLayout : legacySchema!;
        const rawTimestamp = await rpc('state_getStorage', [layout.key, blockHash]);
        requireValue(rawTimestamp !== null, 'missing-timestamp');
        const timestampMs = timestamp(rawTimestamp);
        checkAbort();
        if (catalogMode)
          blockProfiles.push(
            Object.freeze({
              height: requestedHeight,
              hash: blockHash,
              codeHash: observedCode,
              profileSha256: selected!.profileSha256,
            })
          );
        return Object.freeze({
          hash: blockHash,
          parentHash: observedHeader.parentHash,
          height: requestedHeight,
          timestampMs,
        });
      } catch (error) {
        stopped = failure(error);
        throw stopped;
      } finally {
        active = false;
      }
    };
    checkAbort();
    if (catalogMode)
      return Object.freeze({
        context: context as CatalogHistoricalBlockReaderContext,
        readBlock,
        evidence: snapshot,
        blockProfiles: profileSnapshot,
      });
    return Object.freeze({ context: context as HistoricalBlockReaderContext, readBlock, evidence: snapshot });
  } catch (error) {
    throw failure(error);
  }
}
