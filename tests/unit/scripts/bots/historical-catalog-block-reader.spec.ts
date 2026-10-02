import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createGoalRuntimeCatalog,
  type GoalRuntimeCatalog,
} from '../../../../src/features/bot-trading/execution-codecs/runtime-catalog';
import {
  createCatalogHistoricalExecutionBlockReader,
  createHistoricalExecutionBlockReader,
  historicalCatalogProfileSha256,
  CATALOG_HISTORICAL_BLOCK_READER_LIMITS,
  HistoricalExecutionBlockReadError,
  type CatalogHistoricalBlockReaderSource,
  type CatalogHistoricalBlockReaderOptions,
} from '../../../../scripts/bots/historical-execution-block-reader';

const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const source = (): CatalogHistoricalBlockReaderSource => ({
  kind: 'catalog-source-v1',
  finalizedSource: { height: 250, hash: hash(250), receiptSha256: 'f'.repeat(64) },
  schemaAnchors: [
    { specVersion: 128, height: 100, hash: hash(100) },
    { specVersion: 129, height: 150, hash: hash(150) },
    { specVersion: 130, height: 200, hash: hash(200) },
  ],
});
const header = (height: number) => ({
  number: `0x${height.toString(16)}`,
  parentHash: hash(height - 1),
  stateRoot: hash(999),
  extrinsicsRoot: hash(998),
  digest: { logs: [] },
});
const timestamp = (n: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(n));
  return `0x${bytes.toString('hex')}`;
};
let catalog: GoalRuntimeCatalog;
const network = vi.fn(() => {
  throw new Error('Network forbidden');
});
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  const originalMetadata = async (version: number): Promise<string> =>
    JSON.parse(
      await readFile(
        `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
        'utf8'
      )
    ).metadataHex;
  const target = JSON.parse(
    await readFile(
      'output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json',
      'utf8'
    )
  ).actualExport.resultHex;
  catalog = createGoalRuntimeCatalog({
    source128MetadataHex: await originalMetadata(128),
    source129MetadataHex: await originalMetadata(129),
    source130MetadataHex: await originalMetadata(130),
    target131MetadataHex: u8aToHex(compactStripLength(hexToU8a(target))[1]),
  });
}, 30000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

type Call = { id: number; method: string; params: (string | number)[] };
const profileAt = (n: number) => catalog.entries[n < 150 ? 0 : n < 200 ? 1 : 2];
/** Genuine pinned metadata, entirely invented canonical blocks and timestamp-only storage. */
function transport(mutate?: (call: Call, value: unknown) => unknown) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(url).toBe('https://mof2.sora.org/');
    expect(init).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store' });
    const call = JSON.parse(String(init?.body)) as Call;
    const n = Number(BigInt(call.params.at(-1) ?? 0));
    const entry = profileAt(n);
    let result: unknown;
    switch (call.method) {
      case 'chain_getBlockHash':
        result = n === 0 ? GENESIS : hash(n);
        break;
      case 'chain_getFinalizedHead':
        result = hash(260);
        break;
      case 'chain_getHeader':
        result = header(n);
        break;
      case 'state_getRuntimeVersion':
        result = {
          specName: 'sora-substrate',
          specVersion: entry.profile.specVersion,
          transactionVersion: entry.profile.transactionVersion,
        };
        break;
      case 'state_getStorageHash':
        result = entry.profile.codeHash;
        break;
      case 'state_getMetadata':
        result = entry.metadataHex;
        break;
      case 'state_getStorage':
        result = timestamp(1_000_000_000_000 + n);
        break;
      default:
        throw new Error('Unexpected fixture RPC');
    }
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: call.id, result: mutate ? mutate(call, result) : result })
    );
  });
}
async function failure(pending: Promise<unknown>) {
  try {
    await pending;
  } catch (error) {
    expect(error).toBeInstanceOf(HistoricalExecutionBlockReadError);
    return error as HistoricalExecutionBlockReadError;
  }
  throw new Error('Expected failure');
}

describe('catalog historical block reader', () => {
  it('authenticates all three anchors and preserves distinct profiles across both upgrades', async () => {
    const fetcher = transport();
    const reader = await createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher });
    expect(fetcher).toHaveBeenCalledTimes(20);
    expect(reader.context.source).toEqual(source());
    expect(reader.context.catalogSha256).toBe(catalog.catalogSha256);
    expect(reader.context.profiles.map((p) => p.profile.specVersion)).toEqual([128, 129, 130]);
    const initial = reader.blockProfiles();
    const rawBefore = reader.evidence();
    for (const height of [149, 150, 151, 199, 200]) {
      expect(await reader.readBlock(height)).toEqual({
        height,
        hash: hash(height),
        parentHash: hash(height - 1),
        timestampMs: 1_000_000_000_000 + height,
      });
    }
    expect(reader.blockProfiles()).toEqual(
      [149, 150, 151, 199, 200].map((height) => ({
        height,
        hash: hash(height),
        codeHash: profileAt(height).profile.codeHash,
        profileSha256: historicalCatalogProfileSha256(profileAt(height).profile),
      }))
    );
    expect(initial).toEqual([]);
    expect(rawBefore).toHaveLength(20);
    expect(reader.evidence()).toHaveLength(40);
    expect(
      reader
        .evidence()
        .filter((r) => r.method === 'state_getMetadata')
        .map((r) => r.params)
    ).toEqual([[hash(100)], [hash(150)], [hash(200)]]);
    expect(Object.isFrozen(reader.blockProfiles()[0])).toBe(true);
    expect(Object.isFrozen(reader.context.profiles[0].schemaAnchor)).toBe(true);
    expect(reader.evidence().some((r) => r.params.includes(catalog.target.profile.codeHash))).toBe(false);
  });

  it('reuses layout only for the same owned entry while retaining and checking every new metadata reply', async () => {
    const first = await createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: transport() });
    const fetcher = transport();
    const second = await createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher });
    expect(fetcher).toHaveBeenCalledTimes(20);
    for (let index = 0; index < 3; index++) {
      expect(second.context.profiles[index].timestampLayout).toBe(first.context.profiles[index].timestampLayout);
    }
    expect(second.evidence().filter((row) => row.method === 'state_getMetadata')).toHaveLength(3);
    const bad = transport((call, value) => (call.id === 15 ? catalog.entries[0].metadataHex : value));
    const rejected = await failure(createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: bad }));
    expect(bad).toHaveBeenCalledTimes(15);
    expect(rejected.diagnostic.stage).toBe('schema');
    const retained = rejected.diagnostic.rpcEvidence.at(-1)!;
    expect(retained.method).toBe('state_getMetadata');
    expect(JSON.parse(retained.responseBody!).result).toBe(catalog.entries[0].metadataHex);
    expect(retained.responseSha256).toBe(createHash('sha256').update(retained.responseBody!).digest('hex'));
  });

  it('defines the full canonical profile digest independently of input key order', () => {
    const p = catalog.entries[0].profile;
    const sorted = Object.fromEntries(
      Object.keys(p)
        .sort()
        .map((key) => [key, p[key as keyof typeof p]])
    );
    expect(historicalCatalogProfileSha256(p)).toBe(createHash('sha256').update(JSON.stringify(sorted)).digest('hex'));
    expect(historicalCatalogProfileSha256({ ...p })).toBe(historicalCatalogProfileSha256(p));
    expect(() => historicalCatalogProfileSha256({ ...p, metadataSha256: 'bad' })).toThrow();
  });

  it('snapshots caller sources before transport can change anchors', async () => {
    const input = JSON.parse(JSON.stringify(source()));
    const fetcher = transport((call, value) => {
      if (call.id === 1) {
        input.schemaAnchors[0].hash = hash(999);
        input.finalizedSource.height = 1;
      }
      return value;
    });
    const reader = await createCatalogHistoricalExecutionBlockReader(input, { catalog, fetch: fetcher });
    expect(reader.context.source).toEqual(source());
  });

  it.each([
    'copied-catalog',
    'missing-catalog',
    'option-getter',
    'source-getter',
    'array-getter',
    'duplicate',
    'missing',
    'reordered',
    'future-anchor',
  ])('refuses %s before any I/O', async (kind) => {
    const fetcher = transport(),
      getter = vi.fn(() => catalog);
    const input = JSON.parse(JSON.stringify(source()));
    const options: CatalogHistoricalBlockReaderOptions = { catalog, fetch: fetcher };
    if (kind === 'copied-catalog') Object.defineProperty(options, 'catalog', { value: { ...catalog } });
    if (kind === 'missing-catalog') Object.defineProperty(options, 'catalog', { value: undefined });
    if (kind === 'option-getter') Object.defineProperty(options, 'catalog', { enumerable: true, get: getter });
    if (kind === 'source-getter')
      Object.defineProperty(input.schemaAnchors[0], 'hash', { enumerable: true, get: getter });
    if (kind === 'array-getter') Object.defineProperty(input.schemaAnchors, '0', { enumerable: true, get: getter });
    if (kind === 'duplicate') input.schemaAnchors[1] = { ...input.schemaAnchors[0], specVersion: 129 };
    if (kind === 'missing') input.schemaAnchors.pop();
    if (kind === 'reordered') input.schemaAnchors.reverse();
    if (kind === 'future-anchor') input.schemaAnchors[2].height = 251;
    await failure(createCatalogHistoricalExecutionBlockReader(input, options));
    expect(fetcher).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it.each([
    'anchor-hash',
    'anchor-header',
    'runtime-name',
    'runtime-version',
    'transaction-version',
    'code',
    'metadata',
  ])('rejects mismatched %s at the second source anchor', async (kind) => {
    const fetcher = transport((call, value) => {
      if (kind === 'anchor-hash' && call.id === 11) return hash(151);
      if (kind === 'anchor-header' && call.id === 12) return header(149);
      if (kind === 'runtime-name' && call.id === 13)
        return { specName: 'other', specVersion: 129, transactionVersion: 129 };
      if (kind === 'runtime-version' && call.id === 13)
        return { specName: 'sora-substrate', specVersion: 128, transactionVersion: 128 };
      if (kind === 'transaction-version' && call.id === 13)
        return { specName: 'sora-substrate', specVersion: 129, transactionVersion: 128 };
      if (kind === 'code' && call.id === 14) return catalog.entries[0].profile.codeHash;
      if (kind === 'metadata' && call.id === 15) return catalog.entries[0].metadataHex;
      return value;
    });
    const error = await failure(createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher }));
    expect(error.diagnostic.stage).toBe('schema');
    expect(error.diagnostic.blockProfiles).toEqual([]);
    expect(error.diagnostic.rpcEvidence.at(-1)?.responseBody).toBeTruthy();
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(15);
  });

  it.each(['unknown', 'execution-target', 'missing-timestamp', 'changed-header', 'canonical-reorg'])(
    'stops on %s while retaining only earlier successful associations',
    async (kind) => {
      const fetcher = transport((call, value) => {
        if (call.id <= 24) return value;
        if (call.method === 'state_getStorageHash' && kind === 'unknown') return hash(900);
        if (call.method === 'state_getStorageHash' && kind === 'execution-target')
          return catalog.target.profile.codeHash;
        if (call.method === 'state_getStorage' && kind === 'missing-timestamp') return null;
        if (call.method === 'chain_getHeader' && kind === 'changed-header')
          return { ...header(150), stateRoot: hash(997) };
        if (call.method === 'chain_getBlockHash' && kind === 'canonical-reorg') return hash(999);
        return value;
      });
      const reader = await createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher });
      await reader.readBlock(149);
      const error = await failure(reader.readBlock(150));
      expect(error.diagnostic.blockProfiles).toEqual(reader.blockProfiles());
      expect(reader.blockProfiles()).toHaveLength(1);
      const count = fetcher.mock.calls.length;
      await expect(reader.readBlock(151)).rejects.toBe(error);
      expect(fetcher).toHaveBeenCalledTimes(count);
    }
  );

  it('permits exactly 64 reads and 276 RPCs with three full metadata attestations', async () => {
    expect(CATALOG_HISTORICAL_BLOCK_READER_LIMITS).toMatchObject({
      initialRpcCalls: 20,
      blockRpcCalls: 4,
      blockReads: 64,
      rpcCalls: 276,
    });
    const fetcher = transport();
    const reader = await createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher });
    for (let n = 1; n <= 64; n++) await reader.readBlock(n);
    expect(fetcher).toHaveBeenCalledTimes(276);
    expect(reader.blockProfiles()).toHaveLength(64);
    expect((await failure(reader.readBlock(65))).diagnostic.reason).toBe('block-limit');
    expect(fetcher).toHaveBeenCalledTimes(276);
  });

  it.each([150, 149])(
    'refuses relabeling an already authenticated block %s with another supported code',
    async (height) => {
      const fetcher = transport((call, value) =>
        call.id > 24 && call.method === 'state_getStorageHash'
          ? catalog.entries[height === 150 ? 0 : 1].profile.codeHash
          : value
      );
      const reader = await createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher });
      await reader.readBlock(149);
      expect((await failure(reader.readBlock(height))).diagnostic.reason).toBe('runtime-changed');
      expect(reader.blockProfiles()).toHaveLength(1);
      expect(reader.evidence().at(-1)?.method).toBe('state_getStorageHash');
    }
  );

  it('keeps the legacy constructor strict and its original diagnostic shape', async () => {
    const fetcher = transport();
    const error = await failure(
      createHistoricalExecutionBlockReader(
        { finalizedSource: source().finalizedSource, schemaAnchor: { hash: hash(100), height: 100 } },
        { fetch: fetcher }
      )
    );
    expect(error.diagnostic.stage).toBe('schema');
    expect(error.diagnostic).not.toHaveProperty('blockProfiles');
    expect(fetcher).toHaveBeenCalledTimes(8);
  });

  it('honors pre-abort and body timeout without inventing successful profile evidence', async () => {
    const aborted = new AbortController();
    aborted.abort();
    const fetcher = transport();
    expect(
      (
        await failure(
          createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: fetcher, signal: aborted.signal })
        )
      ).diagnostic.reason
    ).toBe('aborted');
    expect(fetcher).not.toHaveBeenCalled();
    const cancel = vi.fn();
    const stalled = vi.fn(async () => new Response(new ReadableStream<Uint8Array>({ cancel })));
    const error = await failure(
      createCatalogHistoricalExecutionBlockReader(source(), { catalog, fetch: stalled, timeoutMs: 2 })
    );
    expect(error.diagnostic.reason).toBe('timeout');
    expect(error.diagnostic.blockProfiles).toEqual([]);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
