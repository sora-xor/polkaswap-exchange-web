import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  loadCatalogPoolFixture,
  catalogPoolStorageFixture,
  catalogPoolHash as hash,
  CATALOG_POOL_DENOMINATOR,
} from '../../../fixtures/bots/catalog-pool';
import { createCatalogHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/catalog-pool';
import {
  createCatalogHistoricalGoalMarketReader,
  createHistoricalGoalMarketReader,
} from '../../../../scripts/bots/historical-goal-market-reader';
import {
  historicalCatalogProfileSha256,
  type CatalogHistoricalBlockReaderSource,
} from '../../../../scripts/bots/historical-execution-block-reader';

let catalog: Awaited<ReturnType<typeof loadCatalogPoolFixture>>;
const fixtures = new Map<number, ReturnType<typeof catalogPoolStorageFixture>>();
const network = vi.fn(() => {
  throw Error('No actual network');
});
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  catalog = await loadCatalogPoolFixture();
  for (const v of [128, 129, 130]) fixtures.set(v, catalogPoolStorageFixture(catalog, v));
});
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
const epoch = (height: number) => (height < 125 ? 128 : height < 150 ? 129 : 130);
type Rpc = { id: number; method: string; params: (string | number | string[])[] };
const source = (): CatalogHistoricalBlockReaderSource => ({
  kind: 'catalog-source-v1',
  finalizedSource: { height: 5000, hash: hash(5000), receiptSha256: 'a'.repeat(64) },
  schemaAnchors: [128, 129, 130].map((specVersion, i) => ({
    specVersion: specVersion as 128 | 129 | 130,
    height: 100 + i * 25,
    hash: hash(100 + i * 25),
  })),
});
/** Real block and storage readers, exact public metadata, and wholly invented transport replies. */
function setup() {
  let mutate = (call: Rpc, result: unknown): unknown => result;
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(url).toBe('https://mof2.sora.org/');
    expect(init).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit' });
    const r = JSON.parse(String(init?.body)) as Rpc;
    const height = Number(BigInt((r.params.at(-1) ?? 0) as string | number));
    const f = fixtures.get(epoch(height))!;
    let result: unknown;
    switch (r.method) {
      case 'chain_getBlockHash':
        result = height === 0 ? f.entry.profile.genesisHash : hash(height);
        break;
      case 'chain_getFinalizedHead':
        result = hash(6000);
        break;
      case 'chain_getHeader':
        result = {
          number: `0x${height.toString(16)}`,
          parentHash: hash(height - 1),
          stateRoot: hash(9998),
          extrinsicsRoot: hash(9999),
          digest: { logs: [] },
        };
        break;
      case 'state_getRuntimeVersion':
        result = { specName: 'sora-substrate', specVersion: epoch(height), transactionVersion: epoch(height) };
        break;
      case 'state_getStorageHash':
        expect(r.params[0]).toBe('0x3a636f6465');
        result = f.entry.profile.codeHash;
        break;
      case 'state_getMetadata':
        result = f.entry.metadataHex;
        break;
      case 'state_getStorage':
        expect(r.params[0]).toBe(f.entry.storage.timestamp.keyHex);
        result = f.encode('timestamp', height * 6000);
        break;
      case 'state_queryStorageAt': {
        const codec = createCatalogHistoricalExecutionPoolCodec({
            catalog,
            sourceCodeHash: f.entry.profile.codeHash,
            blockHash: hash(height),
          }),
          keys = codec.storageKeys(),
          proof = f.proof(height);
        expect(r.params[0]).toEqual(Object.values(keys));
        result = [
          {
            block: hash(height),
            changes: Object.entries(keys).map(([label, key]) => [key, proof[label as keyof typeof proof]]),
          },
        ];
        break;
      }
      default:
        throw Error('Unexpected RPC');
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: r.id, result: mutate(r, result) }), { status: 200 });
  });
  const input = { source: source(), expectedDenominator: CATALOG_POOL_DENOMINATOR };
  return {
    input,
    fetcher,
    setMutate: (next: typeof mutate) => {
      mutate = next;
    },
    create: (options: Record<string, unknown> = {}) =>
      createCatalogHistoricalGoalMarketReader(input, { catalog, fetch: fetcher, ...options }),
  };
}

describe('catalog historical goal market reader', () => {
  it('joins real block profiles and seven-key pool reads across both upgrades within one shard', async () => {
    const h = setup(),
      reader = await h.create();
    expect(h.fetcher).toHaveBeenCalledTimes(20);
    expect(reader.context.protocol).toBe('historical-goal-market-catalog-shard-v1-development');
    expect(reader.context.catalogSha256).toBe(catalog.catalogSha256);
    const initial = reader.evidence();
    expect(initial.blockEvidence).toHaveLength(20);
    expect(initial.blockProfiles).toEqual([]);
    const marks: Awaited<ReturnType<typeof reader.readMark>>[] = [];
    for (const height of [124, 125, 149, 150]) {
      await reader.readBlock(height);
      const mark = await reader.readMark(height);
      marks.push(mark);
      const p = fixtures.get(epoch(height))!.entry.profile;
      expect(mark.runtimeProfile).toEqual({
        specVersion: p.specVersion,
        transactionVersion: p.transactionVersion,
        metadataSha256: p.metadataSha256,
        codeHash: p.codeHash,
      });
      expect(mark.catalogBinding).toEqual({
        catalogSha256: catalog.catalogSha256,
        profileSha256: historicalCatalogProfileSha256(p),
      });
      expect(mark.poolEvidence.binding.blockHash).toBe(hash(height));
      expect(mark.mark).toEqual({
        timestampMs: height * 6000,
        blockHash: hash(height),
        xorReserveCodec: '3000000000000000000',
        kusdReserveCodec: '2000000000000000000',
      });
      expect(await reader.readMark(height)).toBe(mark);
      expect(await reader.readBlock(height)).toBe(mark.block);
    }
    expect(h.fetcher).toHaveBeenCalledTimes(40);
    expect(reader.evidence().blockEvidence).toHaveLength(36);
    expect(reader.evidence().storageEvidence).toHaveLength(4);
    expect(reader.evidence().blockProfiles.map((p) => p.height)).toEqual([124, 125, 149, 150]);
    expect(marks[0].poolEvidence.binding.blockHash).toBe(hash(124));
    expect(marks[1].poolEvidence.binding).not.toBe(marks[2].poolEvidence.binding);
    for (const row of [...reader.evidence().blockEvidence, ...reader.evidence().storageEvidence]) {
      expect(row.httpStatus).toBe(200);
      expect(row.responseSha256).toBe(createHash('sha256').update(row.responseBody!).digest('hex'));
    }
    expect(initial.blockEvidence).toHaveLength(20);
    expect(Object.isFrozen(marks[0].runtimeProfile)).toBe(true);
    expect(Object.isFrozen(reader.evidence().blockProfiles[0])).toBe(true);
  });
  it('permits exactly 64 unique marks and rejects the next before another physical request', async () => {
    const h = setup(),
      reader = await h.create();
    for (let height = 100; height < 164; height++) await reader.readMark(height);
    expect(h.fetcher).toHaveBeenCalledTimes(340);
    expect(reader.evidence()).toMatchObject({ blockReads: 64, markReads: 64 });
    expect(reader.evidence().blockEvidence).toHaveLength(276);
    expect(reader.evidence().storageEvidence).toHaveLength(64);
    await expect(reader.readMark(164)).rejects.toThrow('block-limit');
    expect(h.fetcher).toHaveBeenCalledTimes(340);
  });

  it('snapshots source and catalog options before transport awaits', async () => {
    const h = setup();
    h.setMutate((r, value) => {
      if (r.id === 1) {
        (h.input.source.schemaAnchors[0] as { hash: string }).hash = hash(777);
        h.input.expectedDenominator = '1';
      }
      return value;
    });
    const reader = await h.create();
    expect(reader.context.source.schemaAnchors[0].hash).toBe(hash(100));
    expect(reader.context.expectedDenominator).toBe(CATALOG_POOL_DENOMINATOR);
    expect((await reader.readMark(124)).poolEvidence.state.denominator).toBe(CATALOG_POOL_DENOMINATOR);
  });
  it.each(['copied-catalog', 'wrong-options', 'bad-source', 'legacy-source'])(
    'refuses %s before any transport',
    (kind) => {
      const h = setup();
      let promise: Promise<unknown>;
      if (kind === 'legacy-source') promise = createHistoricalGoalMarketReader(h.input as never, { fetch: h.fetcher });
      else {
        if (kind === 'bad-source') (h.input.source as { kind: string }).kind = 'invalid';
        promise = h.create(
          kind === 'copied-catalog' ? { catalog: { ...catalog } } : kind === 'wrong-options' ? { extra: true } : {}
        );
      }
      return expect(promise)
        .rejects.toThrow()
        .then(() => expect(h.fetcher).not.toHaveBeenCalled());
    }
  );
  it('rejects an unknown per-block runtime before the pool request, and latches the failed shard', async () => {
    const h = setup(),
      reader = await h.create();
    h.setMutate((r, value) => (r.method === 'state_getStorageHash' && r.params[1] === hash(124) ? hash(777) : value));
    await expect(reader.readMark(124)).rejects.toThrow();
    expect(h.fetcher).toHaveBeenCalledTimes(23);
    expect(reader.evidence().storageEvidence).toEqual([]);
    await expect(reader.readMark(125)).rejects.toThrow();
    expect(h.fetcher).toHaveBeenCalledTimes(23);
  });
  it.each(['denominator', 'timestamp', 'duplicate', 'wrong-block', 'trailing'])(
    'retains and rejects %s pool response',
    async (kind) => {
      const h = setup(),
        reader = await h.create();
      h.setMutate((r, value) => {
        if (r.method !== 'state_queryStorageAt') return value;
        const rows = value as { block: string; changes: [string, string | null][] }[],
          f = fixtures.get(128)!;
        if (kind === 'denominator') rows[0].changes[1][1] = f.encode('denominator', '1');
        if (kind === 'timestamp') rows[0].changes[0][1] = f.encode('timestamp', 123);
        if (kind === 'duplicate') rows[0].changes[1] = rows[0].changes[0];
        if (kind === 'wrong-block') rows[0].block = hash(125);
        if (kind === 'trailing') rows[0].changes[6][1] += '00';
        return rows;
      });
      await expect(reader.readMark(124)).rejects.toThrow();
      expect(reader.evidence().storageEvidence).toHaveLength(1);
      expect(reader.evidence().storageEvidence[0].responseBody).toBeTruthy();
      expect(h.fetcher).toHaveBeenCalledTimes(25);
      await expect(reader.readMark(125)).rejects.toThrow();
      expect(h.fetcher).toHaveBeenCalledTimes(25);
    }
  );
  it('retains an absent pool without a mark', async () => {
    const h = setup(),
      reader = await h.create();
    h.setMutate((r, value) => {
      if (r.method === 'state_queryStorageAt') {
        const rows = value as { changes: [string, string | null][] }[];
        rows[0].changes[5][1] = null;
        rows[0].changes[6][1] = null;
      }
      return value;
    });
    const result = await reader.readMark(124);
    expect(result.poolEvidence.status).toBe('absent');
    expect(result.mark).toBeUndefined();
    expect(result.runtimeProfile.specVersion).toBe(128);
  });
  it('honors cancellation even for a cached mark', async () => {
    const h = setup(),
      controller = new AbortController(),
      reader = await h.create({ signal: controller.signal });
    await reader.readMark(124);
    controller.abort();
    await expect(reader.readMark(124)).rejects.toThrow('aborted');
    expect(h.fetcher).toHaveBeenCalledTimes(25);
  });
});
