/** Bounded archived pool marks for development replay; no quote, signer, wallet or transaction API. */
import { createHash } from 'node:crypto';
import {
  createHistoricalExecutionBlockReader,
  createCatalogHistoricalExecutionBlockReader,
  historicalCatalogProfileSha256,
  type CatalogHistoricalBlockReaderSource,
  HistoricalExecutionBlockReadError,
  type HistoricalBlockReaderSource,
  type HistoricalBlockReaderOptions,
} from './historical-execution-block-reader';
import {
  createHistoricalExecutionPoolCodec,
  prepareHistoricalExecutionPoolIdentity,
} from './historical-execution-pool-codec';
import type { HistoricalClockBlock } from './historical-execution-clock';
import {
  createCatalogHistoricalExecutionPoolCodec,
  type CatalogHistoricalRuntimeProfile,
  type CatalogHistoricalPoolBinding,
} from '@/features/bot-trading/execution-codecs/catalog-pool';
import {
  assertGoalRuntimeCatalog,
  type GoalRuntimeCatalog,
} from '@/features/bot-trading/execution-codecs/runtime-catalog';

const ENDPOINT = 'https://mof2.sora.org/';
const LIMIT = 64;
const RESPONSE_LIMIT = 128 * 1024;
const TOTAL_LIMIT = LIMIT * RESPONSE_LIMIT;
const MAX_U128 = (1n << 128n) - 1n;
type BlockReader = Awaited<ReturnType<typeof createHistoricalExecutionBlockReader>>;
type CatalogBlockReader = Awaited<ReturnType<typeof createCatalogHistoricalExecutionBlockReader>>;
type PoolCodec = ReturnType<typeof createHistoricalExecutionPoolCodec>;
type CatalogPoolCodec = ReturnType<typeof createCatalogHistoricalExecutionPoolCodec>;
type PoolMark<P> = Readonly<{
  block: HistoricalClockBlock;
  poolEvidence: P;
  mark?: Readonly<{ timestampMs: number; blockHash: string; kusdReserveCodec: string; xorReserveCodec: string }>;
}>;
type CommonContext = Readonly<{
  expectedDenominator: string;
  maximumBlockReads: number;
  maximumMarkReads: number;
  maximumStorageResponseBytes: number;
  maximumStorageTotalBytes: number;
  transactionSubmitted: false;
}>;
type CommonEvidence = Readonly<{
  blockEvidence: ReturnType<BlockReader['evidence']>;
  storageEvidence: readonly Readonly<HistoricalGoalStorageRead>[];
  blockReads: number;
  markReads: number;
}>;
/** Strict single-runtime legacy reader; its context and evidence shape are unchanged. */
export interface HistoricalGoalMarketReader {
  readonly context: Readonly<
    BlockReader['context'] & CommonContext & { protocol: 'historical-goal-market-shard-v1-development' }
  >;
  readBlock(height: number): Promise<HistoricalClockBlock>;
  readMark(height: number): Promise<PoolMark<ReturnType<PoolCodec['decodeStorage']>>>;
  evidence(): CommonEvidence;
}
/** Catalog observations carry the exact block's profile, never the shard anchor's assumed runtime. */
export interface CatalogHistoricalGoalMarketReader {
  readonly context: Readonly<
    CatalogBlockReader['context'] & CommonContext & { protocol: 'historical-goal-market-catalog-shard-v1-development' }
  >;
  readBlock(height: number): Promise<HistoricalClockBlock>;
  readMark(height: number): Promise<
    PoolMark<ReturnType<CatalogPoolCodec['decodeStorage']>> &
      Readonly<{
        runtimeProfile: Readonly<CatalogHistoricalRuntimeProfile>;
        catalogBinding: Readonly<CatalogHistoricalPoolBinding>;
      }>
  >;
  evidence(): CommonEvidence & Readonly<{ blockProfiles: ReturnType<CatalogBlockReader['blockProfiles']> }>;
}
/** Predeclared source catalog and denomination shared by all catalog shards. */
export interface CatalogHistoricalGoalMarketSource {
  source: CatalogHistoricalBlockReaderSource;
  expectedDenominator: string;
}

/** Every shard must retain the same predeclared source, schema and denomination. */
export interface HistoricalGoalMarketSource {
  source: HistoricalBlockReaderSource;
  expectedDenominator: string;
}

/** Public archived bytes, retained for verification but never printed as a strategy result. */
export interface HistoricalGoalStorageRead {
  readonly id: number;
  readonly method: 'state_queryStorageAt';
  readonly blockHash: string;
  readonly keys: readonly string[];
  readonly requestedAt: string;
  completedAt?: string;
  httpStatus?: number;
  responseBody?: string;
  responseBodyBase64?: string;
  responseSha256?: string;
  failure?: string;
}

/** A failed shard cannot retry or silently switch its state, schema or transport. */
export class HistoricalGoalMarketReadError extends Error {
  constructor(
    readonly diagnostic: Readonly<{
      stage: string;
      reason: string;
      blockReads: number;
      markReads: number;
      blockEvidence: ReturnType<BlockReader['evidence']>;
      storageEvidence: readonly Readonly<HistoricalGoalStorageRead>[];
      financialActions: false;
    }>
  ) {
    super(`Historical market read failed: ${diagnostic.stage} (${diagnostic.reason})`);
    this.name = 'HistoricalGoalMarketReadError';
  }
}

function requireValue(value: unknown, reason = 'invalid-evidence'): asserts value {
  if (!value) throw new Error(reason);
}

/** Read plain own data without invoking getters. */
function record(input: unknown, keys?: readonly string[]): Record<string, unknown> {
  requireValue(input && typeof input === 'object' && Object.getPrototypeOf(input) === Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  requireValue(Reflect.ownKeys(descriptors).every((key) => typeof key === 'string'));
  requireValue(Object.values(descriptors).every((field) => field.enumerable && 'value' in field));
  if (keys)
    requireValue(
      Object.keys(descriptors).length === keys.length && keys.every((key) => Object.hasOwn(descriptors, key))
    );
  return Object.fromEntries(Object.entries(descriptors).map(([key, field]) => [key, field.value]));
}

/**
 * Initialize a shard of at most 64 unique canonical block reads and 64 pool reads. Each new mark costs
 * four metadata RPC reads and one seven-key storage batch. Block evidence retains its existing 12 MiB
 * budget; storage responses add at most 8 MiB, with 128 KiB/request and a whole-request deadline.
 * No per-state identity fields are reused across blocks. Missing pool states remain explicit.
 */
export async function createHistoricalGoalMarketReader(
  input: HistoricalGoalMarketSource,
  options: HistoricalBlockReaderOptions = {}
): Promise<HistoricalGoalMarketReader> {
  return createMarketReader(input, options, false) as Promise<HistoricalGoalMarketReader>;
}

/** Read only pool state across the three authenticated source runtimes; no quote or transaction authority. */
export function createCatalogHistoricalGoalMarketReader(
  input: CatalogHistoricalGoalMarketSource,
  options: HistoricalBlockReaderOptions & { catalog: GoalRuntimeCatalog }
): Promise<CatalogHistoricalGoalMarketReader> {
  return createMarketReader(input, options, true) as Promise<CatalogHistoricalGoalMarketReader>;
}

/** The fixed public constructors choose identity verification; bounded storage and caching are shared. */
async function createMarketReader(
  input: HistoricalGoalMarketSource | CatalogHistoricalGoalMarketSource,
  options: HistoricalBlockReaderOptions | (HistoricalBlockReaderOptions & { catalog: GoalRuntimeCatalog }),
  catalogMode: boolean
) {
  let reader: BlockReader | CatalogBlockReader | undefined;
  let stage = 'input';
  let stopped: HistoricalGoalMarketReadError | undefined;
  let active = false;
  let totalBytes = 0;
  let blockReads = 0;
  let markReads = 0;
  const storageEvidence: HistoricalGoalStorageRead[] = [];
  const snapshot = () =>
    Object.freeze(storageEvidence.map((item) => Object.freeze({ ...item, keys: Object.freeze([...item.keys]) })));
  const fail = (error: unknown) => {
    const permitted = [
      'aborted',
      'timeout',
      'response-limit',
      'rpc-failed',
      'block-limit',
      'mark-limit',
      'concurrent-read',
    ];
    const reason = error instanceof Error && permitted.includes(error.message) ? error.message : 'invalid-evidence';
    return new HistoricalGoalMarketReadError(
      Object.freeze({
        stage,
        reason,
        blockReads,
        markReads,
        blockEvidence:
          reader?.evidence() ??
          (error instanceof HistoricalExecutionBlockReadError ? error.diagnostic.rpcEvidence : Object.freeze([])),
        storageEvidence: snapshot(),
        financialActions: false as const,
      })
    );
  };
  try {
    const source = record(input, ['source', 'expectedDenominator']);
    const denominator = source.expectedDenominator;
    requireValue(
      typeof denominator === 'string' && /^[1-9]\d{0,38}$/.test(denominator) && BigInt(denominator) <= MAX_U128
    );
    const settings = record(options);
    requireValue(
      Object.keys(settings).every((key) =>
        ['fetch', 'signal', 'timeoutMs', ...(catalogMode ? ['catalog'] : [])].includes(key)
      )
    );
    const transport = (settings.fetch ?? globalThis.fetch) as typeof fetch;
    const signal = settings.signal as AbortSignal | undefined;
    const timeoutMs = (settings.timeoutMs ?? 20_000) as number;
    requireValue(
      typeof transport === 'function' && Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 30_000
    );
    const checkAbort = () => {
      if (signal?.aborted) throw new Error('aborted');
    };
    stage = 'schema';
    let anchorCodec: PoolCodec | CatalogPoolCodec;
    let codecFor: (block: HistoricalClockBlock) => PoolCodec | CatalogPoolCodec;
    let blockProfiles: CatalogBlockReader['blockProfiles'] | undefined;
    if (catalogMode) {
      assertGoalRuntimeCatalog(settings.catalog);
      const catalog = settings.catalog;
      const catalogReader = await createCatalogHistoricalExecutionBlockReader(
        source.source as CatalogHistoricalBlockReaderSource,
        {
          catalog,
          fetch: transport,
          signal,
          timeoutMs,
        }
      );
      reader = catalogReader;
      blockProfiles = catalogReader.blockProfiles;
      const first = catalogReader.context.profiles[0];
      requireValue(first && catalogReader.context.catalogSha256 === catalog.catalogSha256);
      anchorCodec = createCatalogHistoricalExecutionPoolCodec({
        catalog,
        sourceCodeHash: first.profile.codeHash,
        blockHash: first.schemaAnchor.hash,
      });
      codecFor = (block) => {
        const matches = catalogReader
          .blockProfiles()
          .filter((profile) => profile.height === block.height && profile.hash === block.hash);
        requireValue(matches.length === 1);
        const association = matches[0];
        const profiles = catalogReader.context.profiles.filter(
          (profile) => profile.profile.codeHash === association.codeHash
        );
        requireValue(
          profiles.length === 1 && historicalCatalogProfileSha256(profiles[0].profile) === association.profileSha256
        );
        const codec = createCatalogHistoricalExecutionPoolCodec({
          catalog,
          sourceCodeHash: association.codeHash,
          blockHash: block.hash,
        });
        requireValue(codec.catalogBinding.profileSha256 === association.profileSha256);
        return codec;
      };
    } else {
      const legacyReader = await createHistoricalExecutionBlockReader(source.source as HistoricalBlockReaderSource, {
        fetch: transport,
        signal,
        timeoutMs,
      });
      reader = legacyReader;
      const schema = legacyReader.context.schema;
      const metadataRows = legacyReader.evidence().filter((item) => item.method === 'state_getMetadata');
      requireValue(
        metadataRows.length === 1 &&
          metadataRows[0].params.length === 1 &&
          metadataRows[0].params[0] === legacyReader.context.schemaAnchor.hash
      );
      const metadataHex = (JSON.parse(metadataRows[0].responseBody ?? '') as { result?: unknown }).result;
      requireValue(typeof metadataHex === 'string' && /^0x(?:[0-9a-fA-F]{2})+$/.test(metadataHex));
      requireValue(
        createHash('sha256')
          .update(Buffer.from(metadataHex.slice(2), 'hex'))
          .digest('hex') === schema.metadataSha256
      );
      const identity = {
        genesisHash: legacyReader.context.genesisHash,
        metadataHex,
        runtimeVersion: {
          specVersion: schema.runtimeVersion.specVersion,
          transactionVersion: schema.runtimeVersion.transactionVersion,
        },
      };
      anchorCodec = createHistoricalExecutionPoolCodec({
        ...identity,
        blockHash: legacyReader.context.schemaAnchor.hash,
      });
      requireValue(anchorCodec.binding.metadataSha256 === schema.metadataSha256);
      codecFor = (block) => {
        const codec = createHistoricalExecutionPoolCodec(
          prepareHistoricalExecutionPoolIdentity(anchorCodec, { ...identity, blockHash: block.hash })
        );
        requireValue(codec.binding.metadataSha256 === schema.metadataSha256);
        return codec;
      };
    }
    const blockReader = reader;
    const keys = anchorCodec.storageKeys();
    const labels = Object.keys(keys) as (keyof typeof keys)[];
    requireValue(labels.length === 7 && new Set(Object.values(keys)).size === 7);
    const blocks = new Map<number, HistoricalClockBlock>();
    type Pool = ReturnType<PoolCodec['decodeStorage']> | ReturnType<CatalogPoolCodec['decodeStorage']>;
    const marks = new Map<
      number,
      PoolMark<Pool> &
        Partial<
          Readonly<{
            runtimeProfile: Readonly<CatalogHistoricalRuntimeProfile>;
            catalogBinding: Readonly<CatalogHistoricalPoolBinding>;
          }>
        >
    >();

    /** One canonical, code-hash-guarded metadata read; repeated heights reuse immutable evidence. */
    const canonical = async (height: number) => {
      requireValue(Number.isSafeInteger(height) && height > 0);
      const known = blocks.get(height);
      if (known) return known;
      requireValue(blockReads < LIMIT, 'block-limit');
      blockReads++;
      const found = await blockReader.readBlock(height);
      blocks.set(height, found);
      return found;
    };

    /** Bounded single batch: exactly one changeset, all seven keys exactly once, and no fallback RPC. */
    const storage = async (blockHash: string) => {
      checkAbort();
      requireValue(storageEvidence.length < LIMIT, 'mark-limit');
      const item: HistoricalGoalStorageRead = {
        id: storageEvidence.length + 1,
        method: 'state_queryStorageAt',
        blockHash,
        keys: Object.freeze(labels.map((label) => keys[label])),
        requestedAt: new Date().toISOString(),
      };
      storageEvidence.push(item);
      const controller = new AbortController();
      let ended = false;
      let rejectAbort: (error: Error) => void = () => undefined;
      const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = reject;
      });
      const stop = (reason: string) => {
        controller.abort();
        rejectAbort(new Error(reason));
      };
      const onAbort = () => stop('aborted');
      const timer = setTimeout(() => stop('timeout'), timeoutMs);
      signal?.addEventListener('abort', onAbort, { once: true });
      const check = () => {
        requireValue(!ended, 'aborted');
        checkAbort();
        if (controller.signal.aborted) throw new Error('aborted');
      };
      const pending = async () => {
        check();
        const response = await transport(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: item.id, method: item.method, params: [item.keys, blockHash] }),
          redirect: 'error',
          credentials: 'omit',
          signal: controller.signal,
        });
        try {
          check();
        } catch (error) {
          void response.body?.cancel().catch(() => undefined);
          throw error;
        }
        item.httpStatus = response.status;
        requireValue(!response.redirected && (!response.url || response.url === ENDPOINT), 'rpc-failed');
        const contentLength = response.headers.get('content-length');
        requireValue(
          contentLength === null || (/^\d+$/.test(contentLength) && Number(contentLength) <= RESPONSE_LIMIT),
          'response-limit'
        );
        requireValue(response.body, 'rpc-failed');
        const stream = response.body.getReader();
        const chunks: Buffer[] = [];
        let bytes = 0;
        try {
          while (true) {
            check();
            const chunk = await stream.read();
            check();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            totalBytes += chunk.value.byteLength;
            requireValue(bytes <= RESPONSE_LIMIT && totalBytes <= TOTAL_LIMIT, 'response-limit');
            chunks.push(Buffer.from(chunk.value));
          }
        } catch (error) {
          void stream.cancel().catch(() => undefined);
          throw error;
        } finally {
          stream.releaseLock();
        }
        check();
        const raw = Buffer.concat(chunks);
        item.responseSha256 = createHash('sha256').update(raw).digest('hex');
        let body: string;
        try {
          body = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
        } catch (error) {
          item.responseBodyBase64 = raw.toString('base64');
          throw error;
        }
        item.responseBody = body;
        requireValue(response.status === 200, 'rpc-failed');
        const result = record(JSON.parse(body));
        requireValue(result.jsonrpc === '2.0' && result.id === item.id && !Object.hasOwn(result, 'error'));
        requireValue(Array.isArray(result.result) && result.result.length === 1);
        const changeset = record(result.result[0], ['block', 'changes']);
        requireValue(
          changeset.block === blockHash && Array.isArray(changeset.changes) && changeset.changes.length === 7
        );
        const values = new Map<string, string | null>();
        for (const change of changeset.changes) {
          requireValue(
            Array.isArray(change) &&
              change.length === 2 &&
              typeof change[0] === 'string' &&
              item.keys.includes(change[0]) &&
              !values.has(change[0])
          );
          requireValue(
            change[1] === null || (typeof change[1] === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(change[1]))
          );
          values.set(change[0], change[1]);
        }
        return Object.fromEntries(labels.map((label) => [label, values.get(keys[label])]));
      };
      try {
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
        signal?.removeEventListener('abort', onAbort);
        item.completedAt = new Date().toISOString();
      }
    };

    const exclusive = async <T>(nextStage: string, action: () => Promise<T>): Promise<T> => {
      if (stopped) throw stopped;
      if (active) throw fail(new Error('concurrent-read'));
      active = true;
      stage = nextStage;
      try {
        checkAbort();
        return await action();
      } catch (error) {
        stopped = fail(error);
        throw stopped;
      } finally {
        active = false;
      }
    };
    const readBlock = (height: number) => exclusive('block', () => canonical(height));
    const readMark = (height: number) =>
      exclusive('mark', async () => {
        const observed = await canonical(height);
        const known = marks.get(height);
        if (known) return known;
        requireValue(markReads < LIMIT, 'mark-limit');
        markReads++;
        const codec = codecFor(observed);
        requireValue(labels.every((label) => codec.storageKeys()[label] === keys[label]));
        const pool = codec.decodeStorage(await storage(observed.hash));
        requireValue(
          pool.binding.blockHash === observed.hash &&
            pool.state.timestampMs === observed.timestampMs &&
            pool.state.denominator === denominator
        );
        checkAbort();
        const result = Object.freeze({
          block: observed,
          poolEvidence: pool,
          ...('runtimeProfile' in codec
            ? { runtimeProfile: codec.runtimeProfile, catalogBinding: codec.catalogBinding }
            : {}),
          ...(pool.status === 'present'
            ? {
                mark: Object.freeze({
                  timestampMs: observed.timestampMs,
                  blockHash: observed.hash,
                  kusdReserveCodec: pool.reserves.kusdCodec,
                  xorReserveCodec: pool.reserves.xorCodec,
                }),
              }
            : {}),
        });
        marks.set(height, result);
        return result;
      });
    checkAbort();
    return Object.freeze({
      context: Object.freeze({
        ...blockReader.context,
        expectedDenominator: denominator,
        protocol: catalogMode
          ? ('historical-goal-market-catalog-shard-v1-development' as const)
          : ('historical-goal-market-shard-v1-development' as const),
        maximumBlockReads: LIMIT,
        maximumMarkReads: LIMIT,
        maximumStorageResponseBytes: RESPONSE_LIMIT,
        maximumStorageTotalBytes: TOTAL_LIMIT,
        transactionSubmitted: false as const,
      }),
      readBlock,
      readMark,
      evidence: () =>
        Object.freeze({
          blockEvidence: blockReader.evidence(),
          storageEvidence: snapshot(),
          blockReads,
          markReads,
          ...(blockProfiles ? { blockProfiles: blockProfiles() } : {}),
        }),
    });
  } catch (error) {
    throw fail(error);
  }
}
