/** Actual collector-generated synthetic callback metadata; no network or market observations. */
import { createHash } from 'node:crypto';
import { createHistoricalPoolFixture } from './historical-pool';
import { createHistoricalExecutionBlockReader } from '../../../scripts/bots/historical-execution-block-reader';
import {
  collectGoalQualificationMetadata,
  goalQualificationMetadataBudget,
  type GoalQualificationMetadataProtocol,
} from '../../../scripts/bots/goal-qualification-metadata-collector';
import { buildGoalMetadataReplayRawManifest } from '../../../scripts/bots/goal-qualification-metadata-replay';
import type { GoalBundleMetadataBinding } from '../../../src/features/bot-trading/goal-bundle-metadata';
export const metadataFixtureSha = (value: string) => createHash('sha256').update(value).digest('hex');
export const metadataFixtureCanonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(metadataFixtureCanonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${metadataFixtureCanonical((value as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(value);
export const metadataFixtureDigest = (value: unknown) => metadataFixtureSha(metadataFixtureCanonical(value));
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
type Rpc = { jsonrpc: '2.0'; id: number; method: string; params: unknown[] };
export interface GoalBundleMetadataFixtureOptions {
  firstHeight?: number;
  lastHeight?: number;
  blockIntervalMs?: number;
  timestampOffsetMs?: number;
  startAtMs?: number;
  endAtMs?: number;
  metadataHex?: string;
  codeHash?: string;
  maximumNewShards?: number;
  partition?: 'training' | 'validation';
}
/** Generalized real-codec fixture for owned browser source composition tests. */
export async function createGoalBundleMetadataFixture(options: GoalBundleMetadataFixtureOptions = {}) {
  const partition = options.partition ?? 'training';
  const firstHeight = options.firstHeight ?? 100,
    lastHeight = options.lastHeight ?? 165;
  const metadataHex = options.metadataHex ?? createHistoricalPoolFixture().identity.metadataHex;
  const block = (height: number) => ({
    height,
    hash: hash(height),
    parentHash: hash(height - 1),
    timestampMs: (options.timestampOffsetMs ?? 0) + height * (options.blockIntervalMs ?? 6000),
  });
  const source = {
    finalizedSource: { height: lastHeight + 1000, hash: hash(lastHeight + 1000), receiptSha256: 'a'.repeat(64) },
    schemaAnchor: { height: firstHeight, hash: hash(firstHeight) },
  };
  const answer = (r: Rpc) => {
    const height = Number(BigInt(String(r.params[0] ?? 0)));
    let result: unknown;
    switch (r.method) {
      case 'chain_getBlockHash':
        result = r.params[0] === 0 ? GENESIS : hash(Number(r.params[0]));
        break;
      case 'chain_getFinalizedHead':
        result = hash(lastHeight + 1100);
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
        result = options.codeHash ?? hash(900);
        break;
      case 'state_getMetadata':
        result = metadataHex;
        break;
      case 'state_getStorage': {
        const bytes = Buffer.alloc(8);
        bytes.writeBigUInt64LE(BigInt(block(Number(BigInt(String(r.params[1])))).timestampMs));
        result = `0x${bytes.toString('hex')}`;
        break;
      }
      default:
        throw Error(`Unexpected synthetic metadata method: ${r.method}`);
    }
    return { jsonrpc: '2.0', id: r.id, result };
  };
  const initial = await createHistoricalExecutionBlockReader(source, {
    fetch: async (_url, init) => new Response(JSON.stringify(answer(JSON.parse(String(init?.body))))),
  });
  const ranges = [
    {
      id: partition,
      startAtMs: options.startAtMs ?? block(firstHeight).timestampMs + 60001,
      endAtMs: options.endAtMs ?? block(lastHeight).timestampMs - 1,
      first: block(firstHeight),
      last: block(lastHeight),
    },
  ];
  const protocol: GoalQualificationMetadataProtocol = {
    version: 1,
    kind: 'qualification-callback-metadata-v1',
    source,
    schema: initial.context.schema,
    sourceHashes: { 'synthetic-block-reader.ts': 'b'.repeat(64) },
    ranges,
    budget: goalQualificationMetadataBudget(ranges),
  };
  const stored = new Map<string, unknown>();
  let now = 1000;
  const collect = () =>
    collectGoalQualificationMetadata(protocol, {
      ...(options.maximumNewShards === undefined ? {} : { maximumNewShards: options.maximumNewShards }),
      store: {
        read: async (name) => stored.get(name),
        writeOnce: async (name, value) => {
          if (stored.has(name)) throw Error('duplicate synthetic metadata');
          stored.set(name, value);
        },
      },
      fetch: async (_url, init) => new Response(JSON.stringify((JSON.parse(String(init?.body)) as Rpc[]).map(answer))),
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });
  let result = await collect();
  for (let i = 0; result.status === 'paused' && i < protocol.budget.shards; i++) result = await collect();
  if (result.status !== 'complete') throw Error('incomplete synthetic metadata');
  const files = new Map(
    [...stored]
      .filter(([name]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(name))
      .map(([name, value]) => [name, JSON.stringify(value) + '\n'])
  );
  files.set('run-protocol', JSON.stringify(stored.get('protocol')) + '\n');
  files.set(`blocks-${partition}`, JSON.stringify(result.blocks) + '\n');
  const binding: GoalBundleMetadataBinding = {
    partition,
    manifestSha256: metadataFixtureSha(files.get('run-protocol')!),
    verificationSha256: '',
    rawManifestSha256: '',
    blocksFileSha256: metadataFixtureSha(files.get(`blocks-${partition}`)!),
    blocksSha256: metadataFixtureSha(JSON.stringify(result.blocks)),
  };
  files.set(
    'verification',
    JSON.stringify({
      verified: true,
      networkAttempts: 0,
      sourceHashesUnchanged: true,
      preparedManifestSha256: binding.manifestSha256,
      protocolSha256: metadataFixtureDigest(protocol),
      sourceHashes: protocol.sourceHashes,
      partitions: [
        {
          id: partition,
          sha256: binding.blocksFileSha256,
          blocks: result.blocks.length,
          first: block(firstHeight),
          last: block(lastHeight),
        },
      ],
    }) + '\n'
  );
  binding.verificationSha256 = metadataFixtureSha(files.get('verification')!);
  const reseal = () => {
    const entries = [...files]
      .filter(([name]) => /^(?:shard-\d+\.complete|group-\d+\.(?:complete|batch-\d+))$/.test(name))
      .map(([name, value]) => ({ name, sha256: metadataFixtureSha(value), bytes: Buffer.byteLength(value) }));
    files.set(
      'raw-manifest',
      JSON.stringify(
        buildGoalMetadataReplayRawManifest(
          { manifestSha256: binding.manifestSha256, verificationSha256: binding.verificationSha256 },
          entries
        )
      ) + '\n'
    );
    binding.rawManifestSha256 = metadataFixtureSha(files.get('raw-manifest')!);
  };
  reseal();
  return {
    files,
    binding,
    protocol,
    blocks: result.blocks,
    reseal,
    readArtifact: async (name: string) => {
      const value = files.get(name);
      if (value === undefined) throw Error('missing synthetic metadata');
      return new TextEncoder().encode(value);
    },
  };
}
