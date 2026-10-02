/** Genuine metadata bootstrap plus raw catalog verification; invented chain history and no qualification. */
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createGoalStudyBundleCatalog } from '../../../../scripts/bots/goal-study-bundle-catalog';
import { createGoalBundleCatalogMetadataFixture } from '../../../fixtures/bots/goal-bundle-catalog-metadata';
import { assertGoalRuntimeCatalog } from '@/features/bot-trading/execution-codecs/runtime-catalog';
import {
  verifyGoalBundleCatalogMetadata,
  assertGoalBundleCatalogMetadata,
} from '@/features/bot-trading/goal-bundle-metadata';
import { metadataFixtureDigest as digest } from '../../../fixtures/bots/goal-bundle-metadata';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';

let original: Awaited<ReturnType<typeof createGoalBundleCatalogMetadataFixture>>, compressedBytes: Uint8Array;
const network = vi.fn(() => {
  throw Error('No actual network');
});
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  original = await createGoalBundleCatalogMetadataFixture();
  compressedBytes = await readFile(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );
}, 30000);
afterEach(() => vi.useRealTimers());
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
function fixture() {
  const files = new Map(original.files),
    binding = { ...original.binding };
  const readArtifact = vi.fn(async (name: string) => new TextEncoder().encode(files.get(name)!));
  const shard = (edit: (v: any) => void) => {
    const name = 'shard-00000.complete',
      value = JSON.parse(files.get(name)!);
    edit(value);
    const { sha256: ignored, ...body } = value;
    value.sha256 = digest(body);
    files.set(name, JSON.stringify(value) + '\n');
    const inventory = JSON.parse(files.get('raw-manifest')!),
      entry = inventory.files.find((v: any) => v.name === name);
    entry.bytes = new TextEncoder().encode(files.get(name)!).length;
    entry.sha256 = goalRawBytesSha256(new TextEncoder().encode(files.get(name)!));
    files.set('raw-manifest', JSON.stringify(inventory) + '\n');
    binding.rawManifestSha256 = goalRawBytesSha256(new TextEncoder().encode(files.get('raw-manifest')!));
  };
  return { files, binding, readArtifact, shard, dependencies: { readArtifact, compressedBytes } };
}
describe('fixed target WASM and original training metadata catalog bootstrap', () => {
  it('creates a genuine catalog then verifies original wires and block profiles through the real catalog verifier', async () => {
    const f = fixture(),
      catalog = await createGoalStudyBundleCatalog(f.binding, f.dependencies);
    expect(() => assertGoalRuntimeCatalog(catalog)).not.toThrow();
    expect(catalog.catalogSha256).toBe(original.catalog.catalogSha256);
    expect(f.readArtifact.mock.calls.map(([name]) => name)).toEqual([
      'run-protocol',
      'raw-manifest',
      'shard-00000.complete',
    ]);
    const verified = await verifyGoalBundleCatalogMetadata(f.binding, { catalog, readArtifact: f.readArtifact });
    expect(() => assertGoalBundleCatalogMetadata(verified, f.binding, catalog)).not.toThrow();
    expect(verified.blockProfiles.some((p) => p.profile.specVersion === 128)).toBe(true);
    expect(verified.blockProfiles.some((p) => p.profile.specVersion === 129)).toBe(true);
    expect(verified.blockProfiles.some((p) => p.profile.specVersion === 130)).toBe(true);
  }, 30000);
  it.each(['validation', 'missing', 'wrong-anchor', 'response-error', 'changed-metadata', 'wrong-size'])(
    'refuses %s bootstrap evidence',
    async (kind) => {
      const f = fixture();
      if (kind === 'validation') f.binding.partition = 'validation';
      else if (kind === 'wrong-size') {
        const inventory = JSON.parse(f.files.get('raw-manifest')!);
        inventory.files.find((r: any) => r.name === 'shard-00000.complete').bytes++;
        f.files.set('raw-manifest', JSON.stringify(inventory) + '\n');
        f.binding.rawManifestSha256 = goalRawBytesSha256(new TextEncoder().encode(f.files.get('raw-manifest')!));
      } else
        f.shard((s) => {
          const rows = s.rpcEvidence.filter((r: any) => r.method === 'state_getMetadata');
          if (kind === 'missing') s.rpcEvidence = s.rpcEvidence.filter((r: any) => r !== rows[0]);
          if (kind === 'wrong-anchor') rows[0].params[0] = '0x' + 'f'.repeat(64);
          if (kind === 'response-error') {
            const r = JSON.parse(rows[0].responseBody);
            r.error = { message: 'invented failure' };
            rows[0].responseBody = JSON.stringify(r);
            rows[0].responseSha256 = goalRawBytesSha256(new TextEncoder().encode(rows[0].responseBody));
          }
          if (kind === 'changed-metadata') {
            const r = JSON.parse(rows[0].responseBody);
            r.result = '0x00';
            rows[0].responseBody = JSON.stringify(r);
            rows[0].responseSha256 = goalRawBytesSha256(new TextEncoder().encode(rows[0].responseBody));
          }
        });
      await expect(createGoalStudyBundleCatalog(f.binding, f.dependencies)).rejects.toThrow();
      expect(f.readArtifact.mock.calls.every(([name]) => !name.includes('validation'))).toBe(true);
    }
  );
  it('does not treat a reconstructed schema catalog as independently verified callback evidence', async () => {
    const f = fixture();
    f.shard((s) => {
      s.blockProfiles[0].codeHash = original.catalog.entries[1].profile.codeHash;
    });
    const catalog = await createGoalStudyBundleCatalog(f.binding, f.dependencies);
    assertGoalRuntimeCatalog(catalog);
    await expect(
      verifyGoalBundleCatalogMetadata(f.binding, { catalog, readArtifact: f.readArtifact })
    ).rejects.toThrow();
  });
  it('rejects changed binary or executable replacement before artifact access', async () => {
    const f = fixture(),
      bad = new Uint8Array(compressedBytes);
    bad[0] ^= 1;
    await expect(
      createGoalStudyBundleCatalog(f.binding, { ...f.dependencies, compressedBytes: bad })
    ).rejects.toThrow();
    await expect(
      createGoalStudyBundleCatalog(f.binding, { ...f.dependencies, worker: () => true } as never)
    ).rejects.toThrow();
    expect(f.readArtifact).not.toHaveBeenCalled();
  });
  it('aborts an unresolved artifact callback and leaves no live worker', async () => {
    const f = fixture(),
      controller = new AbortController();
    let opened!: () => void;
    const start = new Promise<void>((resolve) => {
      opened = resolve;
    });
    const readArtifact = vi.fn(() => {
      opened();
      return new Promise<Uint8Array>(() => undefined);
    });
    const result = createGoalStudyBundleCatalog(f.binding, {
      readArtifact,
      compressedBytes,
      signal: controller.signal,
    });
    const rejected = expect(result).rejects.toThrow('aborted');
    await start;
    controller.abort();
    await rejected;
    expect(readArtifact).toHaveBeenCalledTimes(1);
  });
  it('bounds each bootstrap artifact wait to30seconds', async () => {
    vi.useFakeTimers();
    const f = fixture(),
      readArtifact = vi.fn(() => new Promise<Uint8Array>(() => undefined));
    const result = createGoalStudyBundleCatalog(f.binding, { readArtifact, compressedBytes });
    const rejected = expect(result).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(30000);
    await rejected;
  });
});
