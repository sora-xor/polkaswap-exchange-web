/** Actual fixed target worker with invented storage and genuine source metadata; no market or network access. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TypeRegistry } from '@polkadot/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createGoalRuntimeCatalog } from '@/features/bot-trading/execution-codecs/runtime-catalog';
import { createGoalCatalogTargetRuntimeStateCodec } from '../../../../scripts/bots/goal-target-runtime-state';
import {
  createGoalCatalogTargetRuntimeArchiveQuote,
  createGoalTargetRuntimeArchiveQuote,
} from '../../../../scripts/bots/goal-target-runtime-archive-quote';
import {
  replayGoalCatalogTargetRuntimeEstimate,
  replayGoalTargetRuntimeEstimate,
} from '../../../../scripts/bots/goal-target-runtime-replay';
import {
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import type { GoalTargetStateRpcReceipt } from '../../../../scripts/bots/goal-target-runtime-transport';
vi.unmock('@polkadot/util-crypto');
const root = new URL('../../../../output/go-history/', import.meta.url);
const load = (name: string) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const sources = [128, 129, 130].map((v) =>
  load(`partial-target-window-metadata-20260921/source-schemas/source${v}-unverified-schema.json`)
);
const targetMetadataHex = new TypeRegistry()
  .createType(
    'Bytes',
    Buffer.from(
      load('goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json').actualExport.resultHex.slice(2),
      'hex'
    )
  )
  .toHex();
const catalog = createGoalRuntimeCatalog({
  source128MetadataHex: sources[0].metadataHex,
  source129MetadataHex: sources[1].metadataHex,
  source130MetadataHex: sources[2].metadataHex,
  target131MetadataHex: targetMetadataHex,
});
const compressedBytes = readFileSync(
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
);
const sourceBlock = { hash: `0x${'ab'.repeat(32)}`, height: 100 };
const declarations = load('goal-runtime-wasm-offline-20260921/synthetic-episode-v2/dispatch-130-kusd-xor-success.json')
  .declarations as Array<{ key: string; value: string | null }>;
const network = vi.fn(() => {
  throw Error('network forbidden');
});
beforeAll(() => vi.stubGlobal('fetch', network));
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
/** Complete synthetic point/prefix responses use the decoder's actual derived keys. */
function fixture(version: number, reverse = false, disabled = false) {
  const source = sources.find((s) => s.runtimeProfile.specVersion === version)!;
  const codec = createGoalCatalogTargetRuntimeStateCodec({ catalog, sourceCodeHash: source.runtimeProfile.codeHash });
  const sourcePropertiesHex = declarations.find((d) => d.key === codec.fixedKeys.properties)!.value!;
  const pool = codec.derivePoolKeys(sourcePropertiesHex);
  const keys = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
  const values = new Map(keys.map((key) => [key, declarations.find((d) => d.key === key)!.value]));
  if (disabled) values.set(codec.fixedKeys.sources, '0x00');
  const retained: Readonly<GoalTargetStateRpcReceipt>[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    expect(url).toBe('https://mof2.sora.org/');
    const req = JSON.parse(init!.body as string);
    expect(req.params.at(-1)).toBe(sourceBlock.hash);
    let result: unknown;
    if (req.method === 'state_getStorage') {
      expect(values.has(req.params[0])).toBe(true);
      result = values.get(req.params[0]);
    } else if (req.params[0] === codec.xstPrefix) result = [];
    else {
      expect(req.params).toEqual([null, 1, codec.xstPrefix, sourceBlock.hash]);
      result = keys
        .filter((k) => k > codec.xstPrefix && values.get(k) !== null)
        .sort()
        .slice(0, 1);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }));
  });
  return {
    retained,
    fetcher,
    input: {
      sourceBlock,
      sourceCodeHash: source.runtimeProfile.codeHash,
      sourceMetadataHex: source.metadataHex,
      sourcePropertiesHex,
      assetIn: reverse ? XOR : KUSD,
      assetOut: reverse ? KUSD : XOR,
      amountInCodec: reverse ? '250000000000000000' : '2500000000000000000',
      fetch: fetcher as typeof fetch,
      retain: async (r: Readonly<GoalTargetStateRpcReceipt>) => {
        retained.push(r);
      },
    },
  };
}
describe('catalog archive acquisition and exact target replay', () => {
  it.each(
    [128, 129, 130].flatMap(
      (v) =>
        [
          [v, false],
          [v, true],
        ] as const
    )
  )('acquires and independently replays source%s reverse=%s', async (version, reverse) => {
    const f = fixture(version, reverse),
      session = await createGoalCatalogTargetRuntimeArchiveQuote({ catalog, compressedBytes });
    try {
      const result = await session.quote(f.input);
      expect(result.estimate.kind).toBe('hypothetical-target-runtime-execution-estimate');
      expect(result.state.profiles.source.specVersion).toBe(version);
      expect(result.estimate.source.runtimeProfile.specVersion).toBe(version);
      expect(result.receipts).toEqual(f.retained);
      expect(f.fetcher).toHaveBeenCalledTimes(9);
      const replay = await replayGoalCatalogTargetRuntimeEstimate({
        catalog,
        compressedBytes,
        sourceBlock,
        sourceCodeHash: f.input.sourceCodeHash,
        sourceMetadataHex: f.input.sourceMetadataHex,
        receipts: result.receipts,
        estimate: structuredClone(result.estimate),
      });
      expect(replay).toEqual(result.estimate);
      expect(replay.target.profile.specVersion).toBe(131);
      expect(replay.apis).toHaveLength(3);
      expect(replay.admissionGranted).toBe(false);
    } finally {
      await session.dispose();
    }
  });
  it('replays a genuinely unavailable route without inventing fees', async () => {
    const f = fixture(128, false, true),
      session = await createGoalCatalogTargetRuntimeArchiveQuote({ catalog, compressedBytes });
    try {
      const result = await session.quote(f.input);
      const replay = await replayGoalCatalogTargetRuntimeEstimate({
        catalog,
        compressedBytes,
        sourceBlock,
        sourceCodeHash: f.input.sourceCodeHash,
        sourceMetadataHex: f.input.sourceMetadataHex,
        receipts: result.receipts,
        estimate: result.estimate,
      });
      expect(replay.kind).toBe('target-runtime-route-unavailable');
      expect(replay.apis).toHaveLength(1);
      expect(replay).not.toHaveProperty('fees');
    } finally {
      await session.dispose();
    }
  });
  it('rejects copied catalog ownership before transport or worker acquisition', async () => {
    await expect(
      createGoalCatalogTargetRuntimeArchiveQuote({ catalog: structuredClone(catalog), compressedBytes })
    ).rejects.toThrow();
    await expect(
      replayGoalCatalogTargetRuntimeEstimate({
        catalog: structuredClone(catalog),
        compressedBytes,
        sourceBlock,
        sourceCodeHash: sources[0].runtimeProfile.codeHash,
        sourceMetadataHex: sources[0].metadataHex,
        receipts: [],
        estimate: {},
      })
    ).rejects.toThrow();
  });
  it.each([sources[1].runtimeProfile.codeHash, catalog.target.profile.codeHash, `0x${'ff'.repeat(32)}`])(
    'rejects mismatched/target/unknown code %s before fetching storage',
    async (sourceCodeHash) => {
      const f = fixture(128),
        session = await createGoalCatalogTargetRuntimeArchiveQuote({ catalog, compressedBytes });
      try {
        await expect(session.quote({ ...f.input, sourceCodeHash })).rejects.toThrow();
        expect(f.fetcher).not.toHaveBeenCalled();
      } finally {
        await session.dispose();
      }
    }
  );
  it('does not admit catalog inputs through either legacy constructor', async () => {
    const f = fixture(130),
      session = await createGoalTargetRuntimeArchiveQuote({ compressedBytes });
    try {
      await expect(session.quote(f.input)).rejects.toThrow();
      expect(f.fetcher).not.toHaveBeenCalled();
    } finally {
      await session.dispose();
    }
    await expect(
      replayGoalTargetRuntimeEstimate({
        catalog,
        compressedBytes,
        sourceBlock,
        sourceCodeHash: f.input.sourceCodeHash,
        sourceMetadataHex: f.input.sourceMetadataHex,
        receipts: [],
        estimate: {},
      } as Parameters<typeof replayGoalTargetRuntimeEstimate>[0])
    ).rejects.toThrow();
  });
  it('rejects a rehashed estimate relabeled to another valid catalog epoch', async () => {
    const f = fixture(129),
      session = await createGoalCatalogTargetRuntimeArchiveQuote({ catalog, compressedBytes });
    try {
      const result = await session.quote(f.input),
        estimate = structuredClone(result.estimate);
      estimate.source.runtimeProfile = { ...estimate.source.runtimeProfile, ...sources[0].runtimeProfile };
      const { evidenceSha256: _old, ...body } = estimate;
      estimate.evidenceSha256 = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      await expect(
        replayGoalCatalogTargetRuntimeEstimate({
          catalog,
          compressedBytes,
          sourceBlock,
          sourceCodeHash: f.input.sourceCodeHash,
          sourceMetadataHex: f.input.sourceMetadataHex,
          receipts: result.receipts,
          estimate,
        })
      ).rejects.toThrow('estimate mismatch');
    } finally {
      await session.dispose();
    }
  });
});
