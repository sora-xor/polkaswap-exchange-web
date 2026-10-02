// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import {
  createGoalRuntimeCatalog,
  type GoalRuntimeCatalog,
} from '../../../../src/features/bot-trading/execution-codecs/runtime-catalog';
import {
  createCatalogHistoricalExecutionBlockReader,
  historicalCatalogProfileSha256,
  type CatalogHistoricalBlockReaderSource,
} from '../../../../scripts/bots/historical-execution-block-reader';
import {
  collectGoalQualificationCatalogMetadata,
  goalQualificationCatalogMetadataBudget,
  goalQualificationCatalogMetadataSchema,
  type GoalQualificationCatalogMetadataProtocol,
} from '../../../../scripts/bots/goal-qualification-metadata-collector';
import {
  buildGoalMetadataReplayRawManifest,
  createGoalCatalogMetadataReplayTransport,
  createGoalMetadataReplayTransport,
  assertGoalCatalogMetadataBlockProfile,
  GOAL_CATALOG_METADATA_REPLAY_POLICY,
  GOAL_METADATA_REPLAY_POLICY,
  type GoalCatalogMetadataReplayInput,
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
const source: CatalogHistoricalBlockReaderSource = {
  kind: 'catalog-source-v1',
  finalizedSource: { height: 1000, hash: hash(1000), receiptSha256: 'a'.repeat(64) },
  schemaAnchors: [
    { specVersion: 128, height: 100, hash: hash(100) },
    { specVersion: 129, height: 130, hash: hash(130) },
    { specVersion: 130, height: 160, hash: hash(160) },
  ],
};
let catalog: GoalRuntimeCatalog,
  baseFiles: Map<string, string>,
  baseInput: GoalCatalogMetadataReplayInput,
  protocol: GoalQualificationCatalogMetadataProtocol;
const network = vi.fn(() => {
  throw Error('Network forbidden');
});
type Rpc = { jsonrpc: '2.0'; id: number; method: string; params: unknown[] };
const versionAt = (height: number) => (height === 164 ? 128 : height < 120 ? 128 : height < 150 ? 129 : 130);
const entryAt = (height: number) => catalog.entries.find((e) => e.profile.specVersion === versionAt(height))!;
function answer(r: Rpc) {
  const h = Number(BigInt(String(r.params[0] ?? 0)));
  let result: unknown;
  switch (r.method) {
    case 'chain_getBlockHash':
      result = r.params[0] === 0 ? catalog.target.profile.genesisHash : hash(Number(r.params[0]));
      break;
    case 'chain_getFinalizedHead':
      result = hash(1100);
      break;
    case 'chain_getHeader':
      result = {
        number: `0x${h.toString(16)}`,
        parentHash: hash(h - 1),
        stateRoot: hash(3),
        extrinsicsRoot: hash(4),
        digest: { logs: [] },
      };
      break;
    case 'state_getRuntimeVersion':
      result = { specName: 'sora-substrate', specVersion: versionAt(h), transactionVersion: versionAt(h) };
      break;
    case 'state_getStorageHash':
      result = entryAt(Number(BigInt(String(r.params[1])))).profile.codeHash;
      break;
    case 'state_getMetadata':
      result = entryAt(h).metadataHex;
      break;
    case 'state_getStorage':
      result = le(Number(BigInt(String(r.params[1]))) * 6000);
      break;
    default:
      throw Error('Unexpected invented metadata RPC');
  }
  return { jsonrpc: '2.0', id: r.id, result };
}
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  const metadata = (version: number) =>
    JSON.parse(
      readFileSync(
        `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
        'utf8'
      )
    ).metadataHex;
  const target = JSON.parse(
    readFileSync('output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json', 'utf8')
  ).actualExport.resultHex;
  catalog = createGoalRuntimeCatalog({
    source128MetadataHex: metadata(128),
    source129MetadataHex: metadata(129),
    source130MetadataHex: metadata(130),
    target131MetadataHex: u8aToHex(compactStripLength(hexToU8a(target))[1]),
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
    version: 2,
    kind: 'qualification-callback-metadata-catalog-v2',
    source,
    schema: goalQualificationCatalogMetadataSchema(source, catalog),
    sourceHashes: { 'invented-reader.ts': 'b'.repeat(64) },
    ranges,
    budget: goalQualificationCatalogMetadataBudget(ranges),
  };
  const stored = new Map<string, unknown>();
  let now = 1000;
  const result = await collectGoalQualificationCatalogMetadata(protocol, {
    catalog,
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
  const manifestSha256 = sha(baseFiles.get('run-protocol')!),
    blocksSha256 = sha(baseFiles.get('blocks-development')!);
  baseFiles.set(
    'verification',
    JSON.stringify({
      verified: true,
      networkAttempts: 0,
      sourceHashesUnchanged: true,
      preparedManifestSha256: manifestSha256,
      protocolSha256: sha(canonical(protocol)),
      sourceHashes: protocol.sourceHashes,
      partitions: [
        { id: 'development', sha256: blocksSha256, blocks: result.blocks.length, first: block(100), last: block(165) },
      ],
    })
  );
  baseInput = {
    policy: GOAL_CATALOG_METADATA_REPLAY_POLICY.id,
    manifestSha256,
    verificationSha256: sha(baseFiles.get('verification')!),
    rawManifestSha256: '',
    partition: 'development',
    blocksSha256,
    initShardIndex: 0,
  };
  reseal(baseFiles, baseInput);
}, 30000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
function reseal(files: Map<string, string>, input: GoalCatalogMetadataReplayInput) {
  const entries = [...files]
    .filter(([name]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(name))
    .map(([name, raw]) => ({ name, sha256: sha(raw), bytes: Buffer.byteLength(raw) }));
  const value = buildGoalMetadataReplayRawManifest(
    { manifestSha256: input.manifestSha256, verificationSha256: input.verificationSha256 },
    entries
  );
  files.set('raw-manifest', JSON.stringify(value));
  input.rawManifestSha256 = sha(files.get('raw-manifest')!);
}
function fixture() {
  const files = new Map(baseFiles),
    input = { ...baseInput };
  const receipts: Readonly<GoalMetadataReplayEvidence<typeof GOAL_CATALOG_METADATA_REPLAY_POLICY.id>>[] = [];
  const readArtifact = vi.fn(async (name: string) => {
    const raw = files.get(name);
    if (raw === undefined) throw Error('Missing fixture');
    return raw;
  });
  const liveFetch = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ inventedPoolResponse: true })));
  const retainEvidence = vi.fn(
    async (receipt: Readonly<GoalMetadataReplayEvidence<typeof GOAL_CATALOG_METADATA_REPLAY_POLICY.id>>) => {
      receipts.push(receipt);
    }
  );
  const options = { catalog, readArtifact, liveFetch, retainEvidence };
  const rpc = (method: string, params: unknown[], id = 901) => ({
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  return {
    files,
    input,
    receipts,
    options,
    readArtifact,
    liveFetch,
    retainEvidence,
    rpc,
    open: () => createGoalCatalogMetadataReplayTransport(input, options),
  };
}
function rewriteShard(f: ReturnType<typeof fixture>, index: number, update: (value: Record<string, any>) => void) {
  const name = `shard-${String(index).padStart(5, '0')}.complete`;
  const value = JSON.parse(f.files.get(name)!);
  update(value);
  delete value.sha256;
  value.sha256 = sha(canonical(value));
  f.files.set(name, JSON.stringify(value));
  reseal(f.files, f.input);
}

describe('catalog raw metadata replay v2', () => {
  it('replays genuine schemas with invented128→129→130→128 block identity through actual reader and two durable shards', async () => {
    const f = fixture(),
      replay = await f.open();
    const reader = await createCatalogHistoricalExecutionBlockReader(source, { catalog, fetch: replay.fetch });
    for (const height of [100, 125, 155, 164, 165]) {
      expect(await reader.readBlock(height)).toEqual(block(height));
      const profile = await replay.profileForBlock(hash(height), height);
      expect(profile.profile.specVersion).toBe(versionAt(height));
      expect(profile.profileSha256).toBe(historicalCatalogProfileSha256(entryAt(height).profile));
      expect(profile.shardIndex).toBe(height < 164 ? 0 : 1);
      expect(() =>
        assertGoalCatalogMetadataBlockProfile(profile, { catalog, bindingSha256: replay.bindingSha256 })
      ).not.toThrow();
      expect(Object.isFrozen(profile)).toBe(true);
    }
    expect(f.receipts).toHaveLength(40);
    expect(replay.counts().delegatedPoolCalls).toBe(0);
    expect(f.liveFetch).not.toHaveBeenCalled();
    expect(
      f.receipts.every(
        (r) =>
          r.policy === GOAL_CATALOG_METADATA_REPLAY_POLICY.id &&
          r.wireMatches.length > 0 &&
          r.arrivalTimeKnown === false
      )
    ).toBe(true);
  });
  it('checks the actual block association before delegating only the exact seven keys, once', async () => {
    const f = fixture(),
      replay = await f.open(),
      entry = entryAt(164);
    const keys = ['timestamp', 'denominator', 'kusd', 'xor', 'dex', 'properties', 'reserves'].map(
      (k) => entry.storage[k as keyof typeof entry.storage].keyHex
    );
    const response = await replay.fetch(endpoint, f.rpc('state_queryStorageAt', [keys, hash(164)]));
    expect(await response.json()).toEqual({ inventedPoolResponse: true });
    expect(f.liveFetch).toHaveBeenCalledTimes(1);
    expect(f.readArtifact.mock.calls.map(([name]) => name)).toContain('shard-00001.complete');
    expect(replay.counts().delegatedPoolCalls).toBe(1);
  });
  it('retains original provenance before releasing a reply and changes only caller JSON-RPC id', async () => {
    const f = fixture();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.options.retainEvidence = vi.fn(async (r) => {
      f.receipts.push(r);
      await held;
    });
    const replay = await f.open();
    let delivered = false;
    const pending = replay.fetch(endpoint, f.rpc('state_getMetadata', [hash(130)], 44)).then((response) => {
      delivered = true;
      return response;
    });
    await vi.waitFor(() => expect(f.receipts).toHaveLength(1));
    expect(delivered).toBe(false);
    release();
    const response = await pending;
    expect(await response.json()).toEqual({ jsonrpc: '2.0', id: 44, result: entryAt(130).metadataHex });
    expect(f.receipts[0].originalRequestedAt).toMatch(/^\d{4}-/);
    expect(f.receipts[0].returnedProjectionSha256).not.toBe(f.receipts[0].originalProjectionSha256);
  });
  it.each(['state_getMetadata', 'state_getRuntimeVersion'])(
    'never synthesizes %s for a different block',
    async (method) => {
      const f = fixture(),
        replay = await f.open();
      await expect(replay.fetch(endpoint, f.rpc(method, [hash(125)]))).rejects.toThrow('metadata-cache-unavailable');
      expect(f.liveFetch).not.toHaveBeenCalled();
      expect(replay.counts().stopped).toBe(true);
    }
  );
  it('requires privately owned catalog before any artifact read and rejects v2 at the old constructor', async () => {
    const f = fixture();
    await expect(
      createGoalCatalogMetadataReplayTransport(f.input, { ...f.options, catalog: { ...catalog } })
    ).rejects.toThrow('catalog ownership');
    expect(f.readArtifact).not.toHaveBeenCalled();
    await expect(
      createGoalMetadataReplayTransport(
        { ...f.input, policy: GOAL_METADATA_REPLAY_POLICY.id },
        { readArtifact: f.readArtifact, liveFetch: f.liveFetch, retainEvidence: async () => undefined }
      )
    ).rejects.toThrow('metadata-cache-unavailable');
  });
  it('rejects old policy at the catalog constructor and a rehashed catalog/budget substitution', async () => {
    const old = fixture();
    await expect(
      createGoalCatalogMetadataReplayTransport(
        { ...old.input, policy: GOAL_METADATA_REPLAY_POLICY.id } as unknown as GoalCatalogMetadataReplayInput,
        old.options
      )
    ).rejects.toThrow('metadata-cache-unavailable');
    expect(old.readArtifact).not.toHaveBeenCalled();
    for (const field of ['catalog', 'budget']) {
      const f = fixture(),
        manifest = JSON.parse(f.files.get('run-protocol')!);
      if (field === 'catalog') manifest.protocol.schema.catalogSha256 = '0'.repeat(64);
      else manifest.protocol.budget.responseBytes = 2097152;
      manifest.protocolSha256 = sha(canonical(manifest.protocol));
      f.files.set('run-protocol', JSON.stringify(manifest));
      f.input.manifestSha256 = sha(f.files.get('run-protocol')!);
      reseal(f.files, f.input);
      await expect(f.open()).rejects.toThrow('metadata-cache-unavailable');
      expect(f.liveFetch).not.toHaveBeenCalled();
    }
  });
  it.each(['profileSha256', 'codeHash', 'hash', 'height'])(
    'rejects rehashed incorrect blockProfiles.%s independently of saved projection',
    async (field) => {
      const f = fixture();
      rewriteShard(f, 0, (s) => {
        s.blockProfiles[0][field] = field === 'height' ? 101 : field === 'profileSha256' ? '0'.repeat(64) : hash(998);
      });
      await expect(f.open()).rejects.toThrow('metadata-cache-unavailable');
      expect(f.liveFetch).not.toHaveBeenCalled();
    }
  );
  it('rejects missing/duplicate runtime associations and wrong shard response accounting', async () => {
    for (const update of [
      (s: Record<string, any>) => s.blockProfiles.pop(),
      (s: Record<string, any>) => s.blockProfiles.push(s.blockProfiles[0]),
      (s: Record<string, any>) => s.counts.responseBytes--,
    ]) {
      const f = fixture();
      rewriteShard(f, 0, update);
      await expect(f.open()).rejects.toThrow('metadata-cache-unavailable');
    }
  });
  it('does not delegate pool storage if its lazy shard is missing or contradictory', async () => {
    for (const corrupt of [false, true]) {
      const f = fixture();
      if (corrupt)
        rewriteShard(f, 1, (s) => {
          s.blockProfiles[0].codeHash = entryAt(130).profile.codeHash;
        });
      else f.files.delete('shard-00001.complete');
      const replay = await f.open(),
        keys = ['timestamp', 'denominator', 'kusd', 'xor', 'dex', 'properties', 'reserves'].map(
          (k) => entryAt(164).storage[k as keyof typeof catalog.target.storage].keyHex
        );
      await expect(replay.fetch(endpoint, f.rpc('state_queryStorageAt', [keys, hash(164)]))).rejects.toThrow();
      expect(f.liveFetch).not.toHaveBeenCalled();
    }
  });
  it.each(['extra-key', 'wrong-order', 'outside-block'])(
    'refuses %s delegation without a live call',
    async (scenario) => {
      const f = fixture(),
        replay = await f.open(),
        keys = ['timestamp', 'denominator', 'kusd', 'xor', 'dex', 'properties', 'reserves'].map(
          (k) => entryAt(100).storage[k as keyof typeof catalog.target.storage].keyHex
        );
      if (scenario === 'extra-key') keys.push('0x00');
      if (scenario === 'wrong-order') keys.reverse();
      await expect(
        replay.fetch(endpoint, f.rpc('state_queryStorageAt', [keys, hash(scenario === 'outside-block' ? 999 : 100)]))
      ).rejects.toThrow();
      expect(f.liveFetch).not.toHaveBeenCalled();
    }
  );
  it('rejects copied profile proofs, mismatched bindings, stale failures and wrong hash-height identity', async () => {
    const f = fixture(),
      replay = await f.open(),
      profile = await replay.profileForBlock(hash(100), 100);
    expect(() => assertGoalCatalogMetadataBlockProfile({ ...profile })).toThrow();
    expect(() => assertGoalCatalogMetadataBlockProfile(profile, { bindingSha256: '0'.repeat(64) })).toThrow();
    await expect(replay.profileForBlock(hash(100), 101)).rejects.toThrow();
    expect(() => assertGoalCatalogMetadataBlockProfile(profile)).toThrow();
  });
  it('revokes outstanding owned associations on caller cancellation', async () => {
    const f = fixture(),
      controller = new AbortController();
    const replay = await createGoalCatalogMetadataReplayTransport(f.input, { ...f.options, signal: controller.signal });
    const profile = await replay.profileForBlock(hash(100), 100);
    controller.abort();
    expect(() => assertGoalCatalogMetadataBlockProfile(profile)).toThrow();
    await expect(replay.profileForBlock(hash(100), 100)).rejects.toThrow();
  });
  it('stops when durable retention rejects, revoking earlier profiles', async () => {
    const f = fixture();
    f.options.retainEvidence = vi.fn(async () => {
      throw Error('sink failed');
    });
    const replay = await f.open(),
      profile = await replay.profileForBlock(hash(100), 100);
    await expect(replay.fetch(endpoint, f.rpc('chain_getBlockHash', [100]))).rejects.toThrow();
    expect(() => assertGoalCatalogMetadataBlockProfile(profile)).toThrow();
    expect(f.liveFetch).not.toHaveBeenCalled();
  });
  it('copies input and owned catalog reference before awaited reads', async () => {
    const f = fixture(),
      pending = f.open();
    f.input.manifestSha256 = '0'.repeat(64);
    f.options.catalog = {} as GoalRuntimeCatalog;
    const replay = await pending;
    expect((await replay.profileForBlock(hash(130), 130)).profile.specVersion).toBe(129);
  });
  it('keeps old4GiB and new12GiB artifact budgets explicit and finite', () => {
    expect(GOAL_METADATA_REPLAY_POLICY.maximumArtifactBytes).toBe(4 * 1024 ** 3);
    expect(GOAL_CATALOG_METADATA_REPLAY_POLICY.maximumArtifactBytes).toBe(12 * 1024 ** 3);
    expect(protocol.budget.responseBytes).toBe(6 * 1024 * 1024);
  });
});
