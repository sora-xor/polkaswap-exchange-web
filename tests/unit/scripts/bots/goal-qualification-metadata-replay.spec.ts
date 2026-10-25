// @vitest-environment node
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalExecutionBlockReader } from '../../../../scripts/bots/historical-execution-block-reader';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { createHistoricalGoalMarketReader } from '../../../../scripts/bots/historical-goal-market-reader';
import {
  collectGoalQualificationMetadata,
  goalQualificationMetadataBudget,
  type GoalQualificationMetadataProtocol,
} from '../../../../scripts/bots/goal-qualification-metadata-collector';
import {
  buildGoalMetadataReplayRawManifest,
  createGoalMetadataReplayTransport,
  GOAL_METADATA_REPLAY_POLICY,
  type GoalMetadataReplayInput,
  type GoalMetadataReplayEvidence,
} from '../../../../scripts/bots/goal-qualification-metadata-replay';

const endpoint = 'https://mof2.sora.org/';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const le = (n: number) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return `0x${b.toString('hex')}`;
};
const block = (height: number) => ({
  height,
  hash: hash(height),
  parentHash: hash(height - 1),
  timestampMs: height * 6000,
});
const source = {
  finalizedSource: { height: 1000, hash: hash(1000), receiptSha256: 'a'.repeat(64) },
  schemaAnchor: { height: 100, hash: hash(100) },
};
const pool = createHistoricalPoolFixture();
const keys = Object.values(
  createHistoricalExecutionPoolCodec({ ...pool.identity, blockHash: hash(100) }).storageKeys()
);
type Rpc = { jsonrpc: '2.0'; id: number; method: string; params: unknown[] };
function answer(r: Rpc) {
  const height = Number(BigInt(String(r.params[0] ?? 0)));
  let result: unknown;
  switch (r.method) {
    case 'chain_getBlockHash':
      result = r.params[0] === 0 ? pool.identity.genesisHash : hash(Number(r.params[0]));
      break;
    case 'chain_getFinalizedHead':
      result = hash(1100);
      break;
    case 'chain_getHeader':
      result = {
        number: `0x${height.toString(16)}`,
        parentHash: hash(height - 1),
        stateRoot: hash(3),
        extrinsicsRoot: hash(4),
        digest: { logs: [] },
      };
      break;
    case 'state_getRuntimeVersion':
      result = { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 };
      break;
    case 'state_getStorageHash':
      result = hash(900);
      break;
    case 'state_getMetadata':
      result = pool.identity.metadataHex;
      break;
    case 'state_getStorage':
      result = le(Number(BigInt(String(r.params[1]))) * 6000);
      break;
    default:
      throw Error(`Unexpected invented metadata method: ${r.method}`);
  }
  return { jsonrpc: '2.0', id: r.id, result };
}
let baseFiles: Map<string, string>;
let baseInput: GoalMetadataReplayInput;
let protocol: GoalQualificationMetadataProtocol;

/** The actual collector and block reader create invented wire/shard evidence; no network or market observations. */
beforeAll(async () => {
  const initial = await createHistoricalExecutionBlockReader(source, {
    fetch: async (_url, init) => new Response(JSON.stringify(answer(JSON.parse(String(init?.body))))),
  });
  const ranges = [
    {
      id: 'development' as const,
      startAtMs: block(100).timestampMs + 60001,
      endAtMs: block(165).timestampMs - 1,
      first: block(100),
      last: block(165),
    },
  ];
  protocol = {
    version: 1,
    kind: 'qualification-callback-metadata-v1',
    source,
    schema: initial.context.schema,
    sourceHashes: { 'invented-reader.ts': 'b'.repeat(64) },
    ranges,
    budget: goalQualificationMetadataBudget(ranges),
  };
  const stored = new Map<string, unknown>();
  let now = 1000;
  const result = await collectGoalQualificationMetadata(protocol, {
    store: {
      read: async (name) => stored.get(name),
      writeOnce: async (name, value) => {
        if (stored.has(name)) throw Error('duplicate fixture');
        stored.set(name, value);
      },
    },
    fetch: async (_url, init) => new Response(JSON.stringify((JSON.parse(String(init?.body)) as Rpc[]).map(answer))),
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
  });
  expect(result.status).toBe('complete');
  baseFiles = new Map(
    [...stored]
      .filter(([name]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(name))
      .map(([name, value]) => [name, `${JSON.stringify(value)}\n`])
  );
  baseFiles.set('run-protocol', `${JSON.stringify(stored.get('protocol'))}\n`);
  baseFiles.set('blocks-development', JSON.stringify(result.blocks));
  const manifestSha256 = sha(baseFiles.get('run-protocol')!);
  const blocksSha256 = sha(baseFiles.get('blocks-development')!);
  const verification = {
    verified: true,
    networkAttempts: 0,
    sourceHashesUnchanged: true,
    preparedManifestSha256: manifestSha256,
    protocolSha256: sha(canonical(protocol)),
    sourceHashes: protocol.sourceHashes,
    partitions: [
      { id: 'development', sha256: blocksSha256, blocks: result.blocks.length, first: block(100), last: block(165) },
    ],
  };
  baseFiles.set('verification', JSON.stringify(verification));
  baseInput = {
    policy: GOAL_METADATA_REPLAY_POLICY.id,
    manifestSha256,
    verificationSha256: sha(baseFiles.get('verification')!),
    rawManifestSha256: '',
    partition: 'development',
    blocksSha256,
    initShardIndex: 0,
  };
  reseal(baseFiles, baseInput);
}, 30000);
function reseal(files: Map<string, string>, input: GoalMetadataReplayInput) {
  const entries = [...files]
    .filter(([name]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(name))
    .map(([name, raw]) => ({ name, sha256: sha(raw), bytes: Buffer.byteLength(raw) }));
  const manifest = buildGoalMetadataReplayRawManifest(
    { manifestSha256: input.manifestSha256, verificationSha256: input.verificationSha256 },
    entries
  );
  files.set('raw-manifest', JSON.stringify(manifest));
  input.rawManifestSha256 = sha(files.get('raw-manifest')!);
}
function setup() {
  const files = new Map(baseFiles);
  const input = { ...baseInput };
  const receipts: Readonly<GoalMetadataReplayEvidence>[] = [];
  const readArtifact = vi.fn(async (name: string) => {
    const v = files.get(name);
    if (v === undefined) throw Error('missing fixture');
    return v;
  });
  const liveFetch = vi.fn<typeof fetch>(async (_url, init) => {
    const r = JSON.parse(String(init?.body)) as Rpc;
    const h = Number(BigInt(String(r.params[1])));
    const values = { ...pool.proof, timestamp: le(block(h).timestampMs) };
    const namedKeys = createHistoricalExecutionPoolCodec({ ...pool.identity, blockHash: hash(100) }).storageKeys();
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: r.id,
        result: [
          {
            block: r.params[1],
            changes: Object.entries(namedKeys).map(([label, key]) => [key, values[label as keyof typeof values]]),
          },
        ],
      })
    );
  });
  const retainEvidence = vi.fn(async (receipt: Readonly<GoalMetadataReplayEvidence>) => {
    receipts.push(receipt);
  });
  const options = { readArtifact, liveFetch, retainEvidence };
  return {
    files,
    input,
    options,
    receipts,
    readArtifact,
    liveFetch,
    retainEvidence,
    create: () => createGoalMetadataReplayTransport(input, options),
  };
}
const request = (method: string, params: unknown[], id = 99, signal?: AbortSignal) => ({
  method: 'POST',
  body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  ...(signal ? { signal } : {}),
});

describe('verified metadata replay for the market reader', () => {
  it('replays the actual collector through the actual block and pool readers while only pool storage is delegated', async () => {
    const f = setup();
    const replay = await f.create();
    const reader = await createHistoricalGoalMarketReader(
      { source, expectedDenominator: '1' },
      { fetch: replay.fetch }
    );
    const result = await reader.readMark(164);
    expect(result.block).toEqual(block(164));
    expect(result.mark?.kusdReserveCodec).toBe('2000000000000000000');
    expect(f.liveFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(f.liveFetch.mock.calls[0][1]?.body))).toMatchObject({
      method: 'state_queryStorageAt',
      params: [keys, hash(164)],
    });
    expect(replay.counts()).toMatchObject({ cachedReplies: 14, delegatedPoolCalls: 1, stopped: false });
    expect(f.receipts.slice(-4).every((r) => r.shardIndex === 1)).toBe(true);
    expect(f.receipts.every((r) => r.arrivalTimeKnown === false && r.wireMatches.length > 0)).toBe(true);
    expect(Object.isFrozen(replay.binding.source.schemaAnchor)).toBe(true);
  });
  it('retains each exact projection before releasing a response and changes only the caller ID', async () => {
    const f = setup();
    let release!: () => void;
    f.options.retainEvidence = vi.fn(async (r) => {
      f.receipts.push(r);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const replay = await f.create();
    let resolved = false;
    const pending = replay.fetch(endpoint, request('chain_getBlockHash', [164], 515)).then((r) => {
      resolved = true;
      return r;
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(resolved).toBe(false);
    release();
    const body = await (await pending).text();
    expect(JSON.parse(body)).toEqual({ jsonrpc: '2.0', id: 515, result: hash(164) });
    expect(f.receipts[0]).toMatchObject({
      callerId: 515,
      returnedProjectionSha256: sha(body),
      method: 'chain_getBlockHash',
      params: [164],
      shardIndex: 1,
    });
    expect(Object.isFrozen(f.receipts[0].wireMatches[0])).toBe(true);
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it.each([
    'run-protocol',
    'verification',
    'raw-manifest',
    'blocks-development',
    'shard-00000.complete',
    'group-00000.complete',
    'group-00000.batch-00000',
  ])('rejects raw byte changes to %s without making a live call', async (name) => {
    const f = setup();
    f.files.set(name, `${f.files.get(name)} `);
    await expect(f.create()).rejects.toThrow();
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it('rejects a rehashed shard with a wire projection mismatch through exact original wire joining', async () => {
    const f = setup();
    const shard = JSON.parse(f.files.get('shard-00000.complete')!);
    const r = shard.rpcEvidence[10];
    r.responseBody = JSON.stringify({ jsonrpc: '2.0', id: r.id, result: hash(777) });
    r.responseSha256 = sha(r.responseBody);
    delete shard.sha256;
    shard.sha256 = sha(canonical(shard));
    f.files.set('shard-00000.complete', JSON.stringify(shard));
    reseal(f.files, f.input);
    await expect(f.create()).rejects.toThrow();
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it('rejects a rehashed canonical block contradiction by replaying the real block reader', async () => {
    const f = setup();
    const shard = JSON.parse(f.files.get('shard-00000.complete')!);
    shard.blocks[1].timestampMs++;
    delete shard.sha256;
    shard.sha256 = sha(canonical(shard));
    f.files.set('shard-00000.complete', JSON.stringify(shard));
    reseal(f.files, f.input);
    await expect(f.create()).rejects.toThrow();
  });
  it.each([
    ['liquidityProxy_quote', [0]],
    ['payment_queryInfo', ['0x00', hash(164)]],
    ['state_getMetadata', [hash(164)]],
    ['chain_getBlockHash', [166]],
    ['state_queryStorageAt', [keys.slice(0, 6), hash(164)]],
    ['state_queryStorageAt', [[...keys].reverse(), hash(164)]],
    ['state_queryStorageAt', [keys, hash(166)]],
    ['state_getStorage', ['0x00', hash(164)]],
  ])('rejects unsupported or out-of-range %s with no fallback, then stays stopped', async (method, params) => {
    const f = setup();
    const replay = await f.create();
    await expect(replay.fetch(endpoint, request(method as string, params as unknown[]))).rejects.toThrow(
      'metadata-cache-unavailable'
    );
    await expect(replay.fetch(endpoint, request('chain_getBlockHash', [100]))).rejects.toThrow(
      'metadata-cache-unavailable'
    );
    expect(f.liveFetch).not.toHaveBeenCalled();
    expect(replay.counts().stopped).toBe(true);
  });
  it('requires a durable sink and does not execute rejected input getters', async () => {
    const f = setup();
    const getter = vi.fn(() => f.input.manifestSha256);
    Object.defineProperty(f.input, 'manifestSha256', { enumerable: true, get: getter });
    await expect(f.create()).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    await expect(
      createGoalMetadataReplayTransport(baseInput, { ...f.options, retainEvidence: undefined } as never)
    ).rejects.toThrow();
    expect(f.readArtifact).not.toHaveBeenCalled();
  });
  it('stops permanently when retaining a response fails', async () => {
    const f = setup();
    f.options.retainEvidence = vi.fn(async () => {
      throw Error('disk full');
    });
    const replay = await f.create();
    await expect(replay.fetch(endpoint, request('chain_getBlockHash', [100]))).rejects.toThrow();
    expect(replay.evidence()).toHaveLength(0);
    expect(replay.counts().stopped).toBe(true);
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it('copies input bindings and transport options before asynchronous artifact reads', async () => {
    const f = setup();
    f.options.readArtifact = vi.fn(async (name) => {
      f.input.partition = 'validation';
      f.options.liveFetch = vi.fn();
      return f.files.get(name)!;
    });
    const replay = await f.create();
    expect(replay.binding.partition).toBe('development');
    await replay.fetch(endpoint, request('state_queryStorageAt', [keys, hash(164)]));
    expect(f.liveFetch).toHaveBeenCalledTimes(1);
  });
  it('aborts an uncooperative artifact read without falling back', async () => {
    const f = setup();
    const abort = new AbortController();
    const pending = createGoalMetadataReplayTransport(f.input, {
      ...f.options,
      readArtifact: () => new Promise(() => undefined),
      signal: abort.signal,
    });
    abort.abort();
    await expect(pending).rejects.toThrow('metadata-cache-unavailable');
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it('rejects missing lazy shards without live fallback', async () => {
    const f = setup();
    const replay = await f.create();
    f.files.delete('shard-00001.complete');
    await expect(replay.fetch(endpoint, request('chain_getBlockHash', [164]))).rejects.toThrow(
      'metadata-cache-unavailable'
    );
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it('rejects duplicate, path, sparse and accessor raw manifest entries', () => {
    const binding = { manifestSha256: 'a'.repeat(64), verificationSha256: 'b'.repeat(64) };
    const entry = { name: 'shard-00000.complete', sha256: 'c'.repeat(64), bytes: 1 };
    expect(() => buildGoalMetadataReplayRawManifest(binding, [entry, entry])).toThrow();
    expect(() =>
      buildGoalMetadataReplayRawManifest(binding, [{ ...entry, name: '../shard-00000.complete' }])
    ).toThrow();
    expect(() => buildGoalMetadataReplayRawManifest(binding, Array(1))).toThrow();
    const getter = vi.fn(() => entry);
    const entries = [] as (typeof entry)[];
    Object.defineProperty(entries, '0', { enumerable: true, get: getter });
    expect(() => buildGoalMetadataReplayRawManifest(binding, entries)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});
