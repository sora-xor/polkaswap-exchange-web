// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { TypeRegistry } from '@polkadot/types';
import { createGoalRuntimeCatalog } from '@/features/bot-trading/execution-codecs/runtime-catalog';
import {
  collectGoalQualificationCatalogMetadata,
  collectGoalQualificationMetadata,
  goalQualificationCatalogMetadataBudget,
  goalQualificationCatalogMetadataSchema,
  type GoalQualificationCatalogMetadataProtocol,
  type GoalQualificationMetadataProtocol,
  type GoalQualificationMetadataStore,
} from '../../../../scripts/bots/goal-qualification-metadata-collector';
import {
  createCatalogHistoricalExecutionBlockReader,
  historicalCatalogProfileSha256,
  type CatalogHistoricalBlockReaderSource,
  type CatalogHistoricalBlockProfile,
  type HistoricalBlockRpcEvidence,
} from '../../../../scripts/bots/historical-execution-block-reader';

const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (raw: string) => createHash('sha256').update(raw).digest('hex');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const digest = (v: unknown) => sha(canonical(v));
const block = (height: number) => ({
  height,
  hash: hash(height),
  parentHash: hash(height - 1),
  timestampMs: height * 6000,
});
const TIME = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const CODE = '0x3a636f6465';
const network = vi.fn(() => {
  throw Error('No actual network in collector tests');
});
let catalog: ReturnType<typeof createGoalRuntimeCatalog>;
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  const schemas = await Promise.all(
    [128, 129, 130].map(
      async (version) =>
        JSON.parse(
          await readFile(
            `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
            'utf8'
          )
        ).metadataHex as string
    )
  );
  const target = JSON.parse(
    await readFile(
      'output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json',
      'utf8'
    )
  );
  catalog = createGoalRuntimeCatalog({
    source128MetadataHex: schemas[0],
    source129MetadataHex: schemas[1],
    source130MetadataHex: schemas[2],
    target131MetadataHex: new TypeRegistry()
      .createType('Bytes', Buffer.from(target.actualExport.resultHex.slice(2), 'hex'))
      .toHex(),
  });
});
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
const epoch = (height: number) => (height < 125 ? 128 : height < 150 ? 129 : 130);
const entry = (version: number) => catalog.entries.find((value) => value.profile.specVersion === version)!;
type Rpc = { id: number; method: string; params: (string | number)[] };
type Shard = {
  blockProfiles: CatalogHistoricalBlockProfile[];
  rpcEvidence: HistoricalBlockRpcEvidence[];
  schema: GoalQualificationCatalogMetadataProtocol['schema'];
  blocks: ReturnType<typeof block>[];
  sha256: string;
};

/** Actual reader/transport composition around invented canonical blocks and genuine public metadata only. */
function setup(count = 70) {
  const source: CatalogHistoricalBlockReaderSource = {
    kind: 'catalog-source-v1',
    finalizedSource: { height: 5000, hash: hash(5000), receiptSha256: 'a'.repeat(64) },
    schemaAnchors: [128, 129, 130].map((version, i) => ({
      specVersion: version as 128 | 129 | 130,
      height: 100 + i * 25,
      hash: hash(100 + i * 25),
    })),
  };
  const range = {
    id: 'development' as const,
    startAtMs: block(100).timestampMs + 60001,
    endAtMs: block(100 + count - 1).timestampMs - 1,
    first: block(100),
    last: block(100 + count - 1),
  };
  const protocol: GoalQualificationCatalogMetadataProtocol = {
    version: 2,
    kind: 'qualification-callback-metadata-catalog-v2',
    source,
    schema: goalQualificationCatalogMetadataSchema(source, catalog),
    sourceHashes: { 'catalog-reader.ts': 'a'.repeat(64) },
    ranges: [range],
    budget: goalQualificationCatalogMetadataBudget([range]),
  };
  const records = new Map<string, unknown>();
  const store: GoalQualificationMetadataStore = {
    read: async (name) => records.get(name),
    writeOnce: async (name, value) => {
      if (records.has(name)) throw Error('exists');
      records.set(name, structuredClone(value));
    },
  };
  let clock = 0,
    created = 0,
    unknownCodeAt: number | undefined,
    failureAt: number | undefined;
  let mutateProfiles = (values: readonly Readonly<CatalogHistoricalBlockProfile>[]) => values;
  let badContext = false;
  const wireReplies: string[] = [];
  const starts: number[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(url).toBe('https://mof2.sora.org/');
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' });
    starts.push(clock);
    const requests = JSON.parse(init!.body as string) as Rpc[];
    if (requests.some((r) => r.method === 'state_getStorage' && Number(BigInt(r.params[1])) === failureAt)) {
      wireReplies.push('temporary outage');
      return new Response('temporary outage', { status: 502 });
    }
    const reply = JSON.stringify(
      requests
        .map((r) => {
          const height = Number(
            BigInt(r.params[r.method === 'state_getStorage' || r.method === 'state_getStorageHash' ? 1 : 0] ?? 0)
          );
          let result: unknown;
          if (r.method === 'chain_getBlockHash')
            result = r.params[0] === 0 ? entry(128).profile.genesisHash : hash(height);
          else if (r.method === 'chain_getFinalizedHead') result = hash(6000);
          else if (r.method === 'chain_getHeader')
            result = {
              number: `0x${height.toString(16)}`,
              parentHash: hash(height - 1),
              stateRoot: hash(9998),
              extrinsicsRoot: hash(9999),
              digest: { logs: [] },
            };
          else if (r.method === 'state_getRuntimeVersion')
            result = { specName: 'sora-substrate', specVersion: epoch(height), transactionVersion: epoch(height) };
          else if (r.method === 'state_getStorageHash') {
            expect(r.params[0]).toBe(CODE);
            result = height === unknownCodeAt ? hash(9997) : entry(epoch(height)).profile.codeHash;
          } else if (r.method === 'state_getMetadata') result = entry(epoch(height)).metadataHex;
          else if (r.method === 'state_getStorage') {
            expect(r.params[0]).toBe(TIME);
            const value = Buffer.alloc(8);
            value.writeBigUInt64LE(BigInt(block(height).timestampMs));
            result = `0x${value.toString('hex')}`;
          } else throw Error('Out-of-scope fixture method');
          return { jsonrpc: '2.0', id: r.id, result };
        })
        .reverse()
    );
    wireReplies.push(reply);
    return new Response(reply, { status: 200 });
  });
  const readerFactory: typeof createCatalogHistoricalExecutionBlockReader = async (selected, options) => {
    created++;
    const reader = await createCatalogHistoricalExecutionBlockReader(selected, options);
    return {
      ...reader,
      context: badContext ? { ...reader.context, catalogSha256: 'f'.repeat(64) } : reader.context,
      blockProfiles: () => mutateProfiles(reader.blockProfiles()),
    };
  };
  const options = {
    catalog,
    store,
    fetch: fetcher,
    readerFactory,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
  };
  return {
    protocol,
    options,
    records,
    fetcher,
    wireReplies,
    starts,
    get created() {
      return created;
    },
    setUnknown: (height: number) => {
      unknownCodeAt = height;
    },
    setFailure: (height: number) => {
      failureAt = height;
    },
    setProfiles: (f: typeof mutateProfiles) => {
      mutateProfiles = f;
    },
    setBadContext: () => {
      badContext = true;
    },
  };
}
function rehash(record: { sha256: string }) {
  const { sha256: old, ...body } = record;
  expect(old).toMatch(/^[0-9a-f]{64}$/);
  record.sha256 = digest(body);
}

describe('catalog callback metadata collector', () => {
  it('uses exact20 initialization/4 per block budgets and catalog-derived schema', () => {
    const f = setup();
    expect(f.protocol.budget).toEqual({
      blocks: 70,
      shards: 2,
      rpcCalls: 320,
      responseBytes: 6291456,
      totalBytes: 12582912,
      httpIntervalMs: 125,
      maximumParallelShards: 32,
      maximumBatchRpc: 32,
      maximumHttpStarts: 320,
    });
    expect(f.protocol.schema.catalogSha256).toBe(catalog.catalogSha256);
    expect(
      f.protocol.schema.profiles.map((p) => [p.profile.specVersion, p.profileSha256, p.timestampLayout.key])
    ).toEqual(
      [128, 129, 130].map((version) => [version, historicalCatalogProfileSha256(entry(version).profile), TIME])
    );
  });
  it('joins actual reader+transport across128→129→130 and preserves all physical and projected raw receipts', async () => {
    const f = setup(),
      result = await collectGoalQualificationCatalogMetadata(f.protocol, f.options);
    expect(result.status).toBe('complete');
    expect(result.counts).toMatchObject({ blocks: 70, shards: 2, rpcCalls: 320, wireRpcCalls: 300 });
    expect(result.blockProfiles?.map((p) => p.codeHash)).toEqual(
      Array.from({ length: 70 }, (_, i) => entry(epoch(i + 100)).profile.codeHash)
    );
    expect(result.blockProfiles?.map((p) => [p.height, p.hash])).toEqual(result.blocks.map((b) => [b.height, b.hash]));
    const shards = [f.records.get('shard-00000.complete'), f.records.get('shard-00001.complete')] as Shard[];
    expect(shards.map((s) => s.rpcEvidence.length)).toEqual([276, 44]);
    expect(
      shards
        .flatMap((s) => s.rpcEvidence)
        .every(
          (r) => r.httpStatus === 200 && typeof r.responseBody === 'string' && sha(r.responseBody) === r.responseSha256
        )
    ).toBe(true);
    const batches = [...f.records.entries()]
      .filter(([name]) => name.includes('.batch-'))
      .map(([, value]) => value as { responseBody: string; responseSha256: string });
    expect(batches.map((b) => b.responseBody)).toEqual(f.wireReplies);
    expect(batches.every((b) => sha(b.responseBody) === b.responseSha256)).toBe(true);
    expect(f.starts.slice(1).every((at, i) => at - f.starts[i] >= 125)).toBe(true);
    expect(result).toMatchObject({ marketDataRead: false, qualification: false });
  });
  it('pauses after durable shards, resumes without replacing profiles and reuses complete collection without requests', async () => {
    const f = setup(),
      first = await collectGoalQualificationCatalogMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
    expect(first.status).toBe('paused');
    expect(first.blocks).toHaveLength(64);
    const snapshot = JSON.stringify(first.blockProfiles),
      saved = JSON.stringify(f.records.get('shard-00000.complete'));
    const second = await collectGoalQualificationCatalogMetadata(f.protocol, f.options);
    expect(second.status).toBe('complete');
    expect(second.reusedShards).toBe(1);
    expect(second.freshShards).toBe(1);
    expect(JSON.stringify(first.blockProfiles)).toBe(snapshot);
    expect(JSON.stringify(f.records.get('shard-00000.complete'))).toBe(saved);
    expect(Object.isFrozen(first.blockProfiles)).toBe(true);
    expect(Object.isFrozen(first.blockProfiles![0])).toBe(true);
    const calls = f.fetcher.mock.calls.length;
    const third = await collectGoalQualificationCatalogMetadata(f.protocol, f.options);
    expect(third.counts).toEqual(second.counts);
    expect(third.reusedShards).toBe(2);
    expect(f.fetcher).toHaveBeenCalledTimes(calls);
  });
  it.each(['missing', 'hash', 'known-profile', 'order'] as const)(
    'rejects %s per-block association before accepting a shard',
    async (kind) => {
      const f = setup();
      f.setProfiles((values) =>
        kind === 'missing'
          ? values.slice(1)
          : kind === 'order'
            ? [...values].reverse()
            : values.map((v, i) =>
                i
                  ? v
                  : kind === 'hash'
                    ? { ...v, hash: hash(999) }
                    : {
                        ...v,
                        codeHash: entry(129).profile.codeHash,
                        profileSha256: historicalCatalogProfileSha256(entry(129).profile),
                      }
              )
      );
      const result = await collectGoalQualificationCatalogMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
      expect(result.status).toBe('unavailable');
      expect(result.blocks).toEqual([]);
      expect(result.blockProfiles).toEqual([]);
      expect(f.records.has('shard-00000.failed')).toBe(true);
    }
  );
  it.each(['association-only', 'association-and-projection'] as const)(
    'rejects rehashed cached %s relabeling against original block :code evidence',
    async (mutation) => {
      const f = setup();
      await collectGoalQualificationCatalogMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
      const shard = f.records.get('shard-00000.complete') as Shard;
      shard.blockProfiles[1] = {
        ...shard.blockProfiles[1],
        codeHash: entry(129).profile.codeHash,
        profileSha256: historicalCatalogProfileSha256(entry(129).profile),
      };
      if (mutation === 'association-and-projection') {
        const index = 20 + 4 + 2;
        const original = shard.rpcEvidence[index];
        const response = JSON.parse(original.responseBody!);
        response.result = entry(129).profile.codeHash;
        const responseBody = JSON.stringify(response);
        expect(Buffer.byteLength(responseBody)).toBe(Buffer.byteLength(original.responseBody!));
        shard.rpcEvidence[index] = { ...original, responseBody, responseSha256: sha(responseBody) };
      }
      rehash(shard);
      const before = f.fetcher.mock.calls.length;
      await expect(collectGoalQualificationCatalogMetadata(f.protocol, f.options)).rejects.toThrow();
      expect(f.fetcher).toHaveBeenCalledTimes(before);
    }
  );
  it('rejects changed cached schema and missing original batch evidence before new requests', async () => {
    const f = setup();
    await collectGoalQualificationCatalogMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
    const original = structuredClone(f.records.get('shard-00000.complete')) as Shard;
    const shard = f.records.get('shard-00000.complete') as Shard;
    shard.schema = { ...shard.schema, catalogSha256: 'b'.repeat(64) };
    rehash(shard);
    const before = f.fetcher.mock.calls.length;
    await expect(collectGoalQualificationCatalogMetadata(f.protocol, f.options)).rejects.toThrow();
    f.records.set('shard-00000.complete', original);
    f.records.delete('group-00000.batch-00000');
    await expect(collectGoalQualificationCatalogMetadata(f.protocol, f.options)).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(before);
  });
  it('rejects forged catalogs and legacy constructors before any store or RPC activity', async () => {
    const f = setup();
    await expect(
      collectGoalQualificationCatalogMetadata(f.protocol, { ...f.options, catalog: { ...catalog } })
    ).rejects.toThrow();
    await expect(
      collectGoalQualificationMetadata(f.protocol as unknown as GoalQualificationMetadataProtocol, {
        store: f.options.store,
        fetch: f.options.fetch,
      })
    ).rejects.toThrow();
    expect(f.records.size).toBe(0);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each([
    'missing',
    'duplicate-height',
    'duplicate-hash',
    'wrong-version',
    'beyond-finality',
    'extra-field',
  ] as const)('rejects malformed %s anchors without RPC', async (kind) => {
    const f = setup(),
      p = structuredClone(f.protocol);
    const anchors = p.source.schemaAnchors as unknown as Array<Record<string, unknown>>;
    if (kind === 'missing') anchors.pop();
    if (kind === 'duplicate-height') anchors[1].height = anchors[0].height;
    if (kind === 'duplicate-hash') anchors[1].hash = anchors[0].hash;
    if (kind === 'wrong-version') anchors[1].specVersion = 130;
    if (kind === 'beyond-finality') anchors[2].height = 5001;
    if (kind === 'extra-field') anchors[0].extra = true;
    await expect(collectGoalQualificationCatalogMetadata(p, f.options)).rejects.toThrow();
    expect(f.records.size).toBe(0);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each(['unknown-code', 'http-failure', 'context'] as const)(
    'retains %s diagnostics and refuses to retry failed shards',
    async (kind) => {
      const f = setup();
      if (kind === 'unknown-code') f.setUnknown(140);
      else if (kind === 'http-failure') f.setFailure(140);
      else f.setBadContext();
      const result = await collectGoalQualificationCatalogMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
      expect(result.status).toBe('unavailable');
      expect(result.blocks).toEqual([]);
      expect(result.blockProfiles).toEqual([]);
      expect(f.records.has('shard-00000.failed')).toBe(true);
      expect(f.records.has('group-00000.failed')).toBe(true);
      const failure = f.records.get('shard-00000.failed') as { rpcEvidence: unknown[] };
      expect(failure.rpcEvidence.length).toBeGreaterThanOrEqual(20);
      const before = f.fetcher.mock.calls.length;
      expect((await collectGoalQualificationCatalogMetadata(f.protocol, f.options)).reason).toBe(
        'previous-shard-failure'
      );
      expect(f.fetcher).toHaveBeenCalledTimes(before);
    }
  );
});
