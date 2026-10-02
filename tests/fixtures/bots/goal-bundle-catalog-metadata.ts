/** Actual catalog collector fixture: genuine schema bytes, invented canonical blocks, no network or market values. */
import { readFile } from 'node:fs/promises';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { createGoalRuntimeCatalog } from '../../../src/features/bot-trading/execution-codecs/runtime-catalog';
import {
  collectGoalQualificationCatalogMetadata,
  goalQualificationCatalogMetadataBudget,
  goalQualificationCatalogMetadataSchema,
  type GoalQualificationCatalogMetadataProtocol,
} from '../../../scripts/bots/goal-qualification-metadata-collector';
import { buildGoalMetadataReplayRawManifest } from '../../../scripts/bots/goal-qualification-metadata-replay';
import { createCatalogHistoricalExecutionBlockReader } from '../../../scripts/bots/historical-execution-block-reader';
import { metadataFixtureSha as sha, metadataFixtureDigest as digest } from './goal-bundle-metadata';
import type { GoalBundleMetadataBinding } from '../../../src/features/bot-trading/goal-bundle-metadata';
export const catalogMetadataFixtureHash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
export const catalogMetadataFixtureVersion = (n: number) => (n === 164 ? 128 : n < 120 ? 128 : n < 150 ? 129 : 130);
/** Optional invented chronology for complete episode tests; defaults retain the small mutation fixture. */
export interface GoalBundleCatalogMetadataFixtureOptions {
  firstHeight?: number;
  lastHeight?: number;
  blockIntervalMs?: number;
  timestampOffsetMs?: number;
  startAtMs?: number;
  endAtMs?: number;
  versionAt?: (height: number) => 128 | 129 | 130;
  schemaAnchorHeights?: readonly [number, number, number];
  /** Bounded metadata-only stage diagnostics for the full-day fixture. */
  onProgress?: (stage: string) => void;
}
/** Retain the original file newline separately from normalized clock-block digest. */
export async function createGoalBundleCatalogMetadataFixture(
  partition: 'training' | 'validation' = 'training',
  options: GoalBundleCatalogMetadataFixtureOptions = {}
) {
  const progress = options.onProgress ?? (() => undefined);
  progress('catalog-fixture-start');
  const firstHeight = options.firstHeight ?? 100,
    lastHeight = options.lastHeight ?? 165,
    interval = options.blockIntervalMs ?? 6000,
    offset = options.timestampOffsetMs ?? 0,
    finalizedHeight = Math.max(1000, lastHeight + 835),
    versionAt = options.versionAt ?? ((height: number) => catalogMetadataFixtureVersion(height - firstHeight + 100));
  const anchors = options.schemaAnchorHeights ?? [firstHeight, firstHeight + 30, firstHeight + 60];
  const hash = catalogMetadataFixtureHash;
  const metadata = async (n: number) =>
    JSON.parse(
      await readFile(
        `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${n}-unverified-schema.json`,
        'utf8'
      )
    ).metadataHex;
  const target = JSON.parse(
    await readFile(
      'output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json',
      'utf8'
    )
  ).actualExport.resultHex;
  progress('catalog-schema-loaded');
  const catalog = createGoalRuntimeCatalog({
    source128MetadataHex: await metadata(128),
    source129MetadataHex: await metadata(129),
    source130MetadataHex: await metadata(130),
    target131MetadataHex: u8aToHex(compactStripLength(hexToU8a(target))[1]),
  });
  progress('catalog-created');
  const block = (height: number) => ({
    height,
    hash: hash(height),
    parentHash: hash(height - 1),
    timestampMs: offset + height * interval,
  });
  const source = {
    kind: 'catalog-source-v1' as const,
    finalizedSource: { height: finalizedHeight, hash: hash(finalizedHeight), receiptSha256: 'a'.repeat(64) },
    schemaAnchors: [
      { specVersion: 128 as const, height: anchors[0], hash: hash(anchors[0]) },
      { specVersion: 129 as const, height: anchors[1], hash: hash(anchors[1]) },
      { specVersion: 130 as const, height: anchors[2], hash: hash(anchors[2]) },
    ],
  };
  const ranges = [
    {
      id: partition,
      startAtMs: options.startAtMs ?? block(firstHeight).timestampMs + 60001,
      endAtMs: options.endAtMs ?? block(lastHeight).timestampMs - 1,
      first: block(firstHeight),
      last: block(lastHeight),
    },
  ];
  const protocol: GoalQualificationCatalogMetadataProtocol = {
    version: 2,
    kind: 'qualification-callback-metadata-catalog-v2',
    source,
    schema: goalQualificationCatalogMetadataSchema(source, catalog),
    sourceHashes: { 'invented-catalog-reader.ts': 'b'.repeat(64) },
    ranges,
    budget: goalQualificationCatalogMetadataBudget(ranges),
  };
  const entryAt = (height: number) => catalog.entries.find((e) => e.profile.specVersion === versionAt(height))!;
  const answer = (r: { id: number; method: string; params: unknown[] }) => {
    const h = Number(BigInt(String(r.params[0] ?? 0)));
    let result: unknown;
    switch (r.method) {
      case 'chain_getBlockHash':
        result = r.params[0] === 0 ? catalog.target.profile.genesisHash : hash(Number(r.params[0]));
        break;
      case 'chain_getFinalizedHead':
        result = hash(finalizedHeight + 100);
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
        result = {
          specName: 'sora-substrate',
          specVersion: versionAt(h),
          transactionVersion: versionAt(h),
        };
        break;
      case 'state_getStorageHash':
        result = entryAt(Number(BigInt(String(r.params[1])))).profile.codeHash;
        break;
      case 'state_getMetadata':
        result = entryAt(h).metadataHex;
        break;
      case 'state_getStorage': {
        const b = Buffer.alloc(8);
        b.writeBigUInt64LE(BigInt(block(Number(BigInt(String(r.params[1])))).timestampMs));
        result = `0x${b.toString('hex')}`;
        break;
      }
      default:
        throw Error('Unexpected fixture RPC');
    }
    return { jsonrpc: '2.0', id: r.id, result };
  };
  const stored = new Map<string, unknown>();
  let now = 1000;
  let batches = 0;
  let initializedReaders = 0;
  progress('catalog-collection-start');
  const collected = await collectGoalQualificationCatalogMetadata(protocol, {
    catalog,
    readerFactory: async (source, readerOptions) => {
      const reader = await createCatalogHistoricalExecutionBlockReader(source, readerOptions);
      initializedReaders++;
      if (initializedReaders === 1 || initializedReaders % 8 === 0) progress(`catalog-readers-${initializedReaders}`);
      return reader;
    },
    store: {
      read: async (n) => stored.get(n),
      writeOnce: async (n, v) => {
        if (stored.has(n)) throw Error('duplicate fixture');
        stored.set(n, v);
      },
    },
    fetch: async (_url, init) => {
      const requests = JSON.parse(String(init?.body));
      batches++;
      if (
        batches === 1 ||
        batches % 32 === 0 ||
        requests.some((r: { method: string }) => r.method === 'state_getMetadata')
      )
        progress(`catalog-batch-${batches}-${requests.map((r: { method: string }) => r.method).join(',')}`);
      return new Response(JSON.stringify(requests.map(answer)));
    },
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
  });
  progress('catalog-collection-done');
  if (collected.status !== 'complete') throw Error('Incomplete catalog fixture');
  const files = new Map(
    [...stored]
      .filter(([n]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(n))
      .map(([n, v]) => [n, JSON.stringify(v) + '\n'])
  );
  progress('catalog-files-encoded');
  files.set('run-protocol', JSON.stringify(stored.get('protocol')) + '\n');
  files.set(`blocks-${partition}`, JSON.stringify(collected.blocks) + '\n');
  const binding: GoalBundleMetadataBinding = {
    partition,
    manifestSha256: sha(files.get('run-protocol')!),
    verificationSha256: '',
    rawManifestSha256: '',
    blocksFileSha256: sha(files.get(`blocks-${partition}`)!),
    blocksSha256: sha(JSON.stringify(collected.blocks)),
  };
  files.set(
    'verification',
    JSON.stringify({
      verified: true,
      networkAttempts: 0,
      sourceHashesUnchanged: true,
      preparedManifestSha256: binding.manifestSha256,
      protocolSha256: digest(protocol),
      sourceHashes: protocol.sourceHashes,
      partitions: [
        {
          id: partition,
          sha256: binding.blocksFileSha256,
          blocks: collected.blocks.length,
          first: block(firstHeight),
          last: block(lastHeight),
        },
      ],
    }) + '\n'
  );
  binding.verificationSha256 = sha(files.get('verification')!);
  const raw = buildGoalMetadataReplayRawManifest(
    { manifestSha256: binding.manifestSha256, verificationSha256: binding.verificationSha256 },
    [...files]
      .filter(([n]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(n))
      .map(([name, v]) => ({ name, sha256: sha(v), bytes: Buffer.byteLength(v) }))
  );
  files.set('raw-manifest', JSON.stringify(raw) + '\n');
  binding.rawManifestSha256 = sha(files.get('raw-manifest')!);
  const readArtifact = async (name: string) => {
    const value = files.get(name);
    if (value === undefined) throw Error('Missing catalog fixture artifact');
    return new TextEncoder().encode(value);
  };
  return {
    catalog,
    files,
    binding,
    protocol,
    blocks: collected.blocks,
    blockProfiles: collected.blockProfiles!,
    readArtifact,
  };
}
