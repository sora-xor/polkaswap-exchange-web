// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  collectGoalQualificationMetadata,
  goalQualificationMetadataBudget,
  type GoalQualificationMetadataProtocol,
  type GoalQualificationMetadataStore,
} from '../../../../scripts/bots/goal-qualification-metadata-collector';
import type {
  createHistoricalExecutionBlockReader,
  HistoricalBlockRpcEvidence,
} from '../../../../scripts/bots/historical-execution-block-reader';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = 'a'.repeat(64);
const makeBlock = (height: number) => ({
  height,
  hash: hash(height),
  parentHash: hash(height - 1),
  timestampMs: height * 6000,
});
function setup(count = 70) {
  const range = {
    id: 'development' as const,
    startAtMs: makeBlock(100).timestampMs + 60001,
    endAtMs: makeBlock(100 + count - 1).timestampMs - 1,
    first: makeBlock(100),
    last: makeBlock(100 + count - 1),
  };
  const schema = {
    key: '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb',
    type: 'u64' as const,
    unit: 'milliseconds' as const,
    metadataSha256: sha,
    codeHash: hash(9),
    runtimeVersion: { specName: 'sora-substrate' as const, specVersion: 130, transactionVersion: 130 },
  };
  const protocol: GoalQualificationMetadataProtocol = {
    version: 1,
    kind: 'qualification-callback-metadata-v1',
    source: {
      finalizedSource: { height: 5000, hash: hash(5000), receiptSha256: sha },
      schemaAnchor: { height: 100, hash: hash(100) },
    },
    schema,
    sourceHashes: { 'reader.ts': sha },
    ranges: [range],
    budget: goalQualificationMetadataBudget([range]),
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
    readCount = 0,
    created = 0;
  const starts: number[] = [],
    methods: string[] = [];
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    starts.push(clock);
    const body = JSON.parse(init!.body as string);
    methods.push(...body.map((v: { method: string }) => v.method));
    return new Response(
      JSON.stringify(body.map((v: { id: number }) => ({ jsonrpc: '2.0', id: v.id, result: hash(5) }))),
      { status: 200 }
    );
  });
  let mutateBlock: (value: ReturnType<typeof makeBlock>) => ReturnType<typeof makeBlock> = (v) => v;
  let failAt: number | undefined;
  let badSchema = false;
  let forbidden = false;
  const readerFactory = (async (_source, options) => {
    created++;
    const evidence: HistoricalBlockRpcEvidence[] = [];
    const rpc = async (method: string, params: (string | number)[]) => {
      const id = evidence.length + 1;
      const response = await options!.fetch!('https://mof2.sora.org/', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      });
      const responseBody = await response.text();
      evidence.push({ id, method, params, requestedAt: new Date(clock).toISOString(), responseBody });
    };
    for (let i = 0; i < 10; i++) await rpc(forbidden ? 'assets_getAssetInfo' : 'chain_getBlockHash', [0]);
    return {
      context: { schema: badSchema ? { ...schema, codeHash: hash(8) } : schema },
      evidence: () => evidence,
      readBlock: async (height: number) => {
        readCount++;
        if (height === failAt) throw Error('unavailable');
        for (let i = 0; i < 4; i++) await rpc('chain_getBlockHash', [height]);
        return mutateBlock(makeBlock(height));
      },
    };
  }) as unknown as typeof createHistoricalExecutionBlockReader;
  const options = {
    store,
    readerFactory,
    fetch: fetcher as typeof fetch,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
  };
  return {
    protocol,
    records,
    store,
    options,
    starts,
    methods,
    fetcher,
    get readCount() {
      return readCount;
    },
    get created() {
      return created;
    },
    setMutation: (f: typeof mutateBlock) => {
      mutateBlock = f;
    },
    setFailure: (n: number) => {
      failAt = n;
    },
    setBadSchema: () => {
      badSchema = true;
    },
    setForbidden: () => {
      forbidden = true;
    },
  };
}
describe('canonical callback metadata collector', () => {
  it('derives exact64-block shard and RPC/byte budgets from immutable bounds', () => {
    const { protocol } = setup();
    expect(protocol.budget).toEqual({
      blocks: 70,
      shards: 2,
      rpcCalls: 300,
      responseBytes: 2097152,
      totalBytes: 4194304,
      httpIntervalMs: 125,
      maximumParallelShards: 32,
      maximumBatchRpc: 32,
      maximumHttpStarts: 300,
    });
  });
  it('retains every canonical block and raw shard receipt, paced at8starts/second', async () => {
    const f = setup();
    const result = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(result.status).toBe('complete');
    expect(result.blocks).toHaveLength(70);
    expect(result.counts.rpcCalls).toBe(300);
    expect(result.counts.httpStarts).toBeLessThan(300);
    expect(result.counts.wireRpcCalls).toBe(290);
    expect(result.blocks[0]).toEqual(f.protocol.ranges[0].first);
    expect(result.blocks.at(-1)).toEqual(f.protocol.ranges[0].last);
    expect(f.starts.slice(1).every((v, i) => v - f.starts[i] >= 125)).toBe(true);
    expect(f.records.has('protocol')).toBe(true);
    expect(f.records.has('shard-00001.complete')).toBe(true);
    expect(Object.isFrozen(result.blocks[0])).toBe(true);
    expect(result.marketDataRead).toBe(false);
    expect(result.qualification).toBe(false);
  });
  it('resumes only completed source-bound shards without repeating requests or changing pacing', async () => {
    const f = setup();
    const first = await collectGoalQualificationMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
    expect(first.status).toBe('paused');
    expect(first.blocks).toHaveLength(64);
    expect(f.readCount).toBe(64);
    const resumed = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(resumed.status).toBe('complete');
    expect(resumed.reusedShards).toBe(1);
    expect(resumed.freshShards).toBe(1);
    expect(f.readCount).toBe(70);
    expect(f.created).toBe(2);
    expect(f.starts.slice(1).every((v, i) => v - f.starts[i] >= 125)).toBe(true);
    const cached = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(cached.reusedShards).toBe(2);
    expect(f.created).toBe(2);
  });
  it('refuses unfinished started shards rather than silently retrying an uncertain read', async () => {
    const f = setup();
    await collectGoalQualificationMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
    f.records.set('shard-00001.started', { unknown: 'crashed-before-complete' });
    const result = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe('inflight-shard-unresolved');
    expect(f.created).toBe(1);
  });
  it('persists failures and never starts the unavailable height again on resume', async () => {
    const f = setup();
    f.setFailure(165);
    const first = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(first.status).toBe('unavailable');
    expect(f.records.has('shard-00001.failed')).toBe(true);
    const reads = f.readCount;
    const second = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(second.reason).toBe('previous-shard-failure');
    expect(f.readCount).toBe(reads);
  });
  it('rejects cross-shard parent contradictions and preserves the failing receipt', async () => {
    const f = setup();
    f.setMutation((v) => (v.height === 164 ? { ...v, parentHash: hash(1) } : v));
    expect((await collectGoalQualificationMetadata(f.protocol, f.options)).status).toBe('unavailable');
    expect(f.records.has('shard-00001.failed')).toBe(true);
  });
  it('rejects a changed source or changed cached block before another network read', async () => {
    const f = setup();
    await collectGoalQualificationMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
    const calls = f.created;
    await expect(
      collectGoalQualificationMetadata({ ...f.protocol, sourceHashes: { 'reader.ts': 'b'.repeat(64) } }, f.options)
    ).rejects.toThrow();
    const cached = f.records.get('shard-00000.complete') as { blocks: Array<{ timestampMs: number }> };
    cached.blocks[2].timestampMs++;
    await expect(collectGoalQualificationMetadata(f.protocol, f.options)).rejects.toThrow();
    expect(f.created).toBe(calls);
  });
  it('rejects incompatible schema without continuing or changing the range', async () => {
    const f = setup();
    f.setBadSchema();
    const result = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(result.status).toBe('unavailable');
    expect(f.readCount).toBe(0);
    expect(f.created).toBe(2);
  });
  it('transport refuses asset/pool methods before the injected network boundary', async () => {
    const f = setup();
    f.setForbidden();
    expect((await collectGoalQualificationMetadata(f.protocol, f.options)).status).toBe('unavailable');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('validates descriptor-safe range/protocol budgets before creating durable records', async () => {
    const f = setup();
    const getter = vi.fn();
    const hostile = Object.defineProperty({ ...f.protocol }, 'ranges', { enumerable: true, get: getter });
    await expect(collectGoalQualificationMetadata(hostile, f.options)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(f.records.size).toBe(0);
    await expect(
      collectGoalQualificationMetadata({ ...f.protocol, budget: { ...f.protocol.budget, rpcCalls: 999 } }, f.options)
    ).rejects.toThrow();
    const sparse = [f.protocol.ranges[0]];
    Reflect.deleteProperty(sparse, '0');
    expect(() => goalQualificationMetadataBudget(sparse)).toThrow();
  });
  it('permits a clean abort before a shard begins and a later explicit resume', async () => {
    const f = setup();
    const abort = new AbortController();
    abort.abort();
    expect((await collectGoalQualificationMetadata(f.protocol, { ...f.options, signal: abort.signal })).status).toBe(
      'paused'
    );
    expect(f.created).toBe(0);
    expect((await collectGoalQualificationMetadata(f.protocol, f.options)).status).toBe('complete');
  });
  it('joins32 concurrent reader shards in canonical order, with one batch at a time and raw wire evidence retained', async () => {
    const f = setup(2048);
    const r = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(r.status).toBe('complete');
    expect(r.blocks.map((b) => b.height)).toEqual(Array.from({ length: 2048 }, (_, i) => 100 + i));
    expect(r.counts).toMatchObject({ blocks: 2048, shards: 32, rpcCalls: 8512, httpStarts: 266 });
    expect(r.counts.wireRpcCalls).toBe(8202);
    expect(f.records.has('group-00000.batch-00265')).toBe(true);
    const reused = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(reused.counts).toEqual(r.counts);
    expect(f.created).toBe(32);
  });
  it('failed groups expose no partially accepted rows or completed counts', async () => {
    const f = setup();
    f.setFailure(165);
    const r = await collectGoalQualificationMetadata(f.protocol, f.options);
    expect(r.status).toBe('unavailable');
    expect(r.blocks).toHaveLength(0);
    expect(r.counts.blocks).toBe(0);
    expect(r.counts.shards).toBe(0);
    expect(f.records.has('group-00000.failed')).toBe(true);
    expect([...f.records.keys()].some((k) => k.endsWith('.complete'))).toBe(false);
  });
  it('rejects altered or missing original batch bytes before source-bound cache reuse', async () => {
    const f = setup();
    await collectGoalQualificationMetadata(f.protocol, f.options);
    const created = f.created;
    f.records.delete('group-00000.batch-00000');
    await expect(collectGoalQualificationMetadata(f.protocol, f.options)).rejects.toThrow();
    expect(f.created).toBe(created);
  });
  it('requires global HTTP pacing across resumed transport groups even when cache digests are internally consistent', async () => {
    const f = setup();
    await collectGoalQualificationMetadata(f.protocol, { ...f.options, maximumNewShards: 1 });
    await collectGoalQualificationMetadata(f.protocol, f.options);
    const canonical = (v: unknown): string =>
      Array.isArray(v)
        ? `[${v.map(canonical).join(',')}]`
        : v && typeof v === 'object'
          ? `{${Object.keys(v)
              .sort()
              .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
              .join(',')}}`
          : JSON.stringify(v);
    const digest = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
    const first = f.records.get('group-00000.complete') as { stats: { lastStartedAtMs: number } };
    const second = f.records.get('group-00001.complete') as { batches: Array<{ sha256: string }>; sha256: string };
    const batch = f.records.get('group-00001.batch-00000') as { startedAtMs: number };
    batch.startedAtMs = first.stats.lastStartedAtMs + 124;
    second.batches[0].sha256 = digest(batch);
    const { sha256: old, ...body } = second;
    expect(old).toHaveLength(64);
    second.sha256 = digest(body);
    const calls = f.created;
    await expect(collectGoalQualificationMetadata(f.protocol, f.options)).rejects.toThrow();
    expect(f.created).toBe(calls);
  });
});
