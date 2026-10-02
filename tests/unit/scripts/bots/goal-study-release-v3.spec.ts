/** Publication-layer tests with invented qualifying episodes; never evidence of market profitability. */
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalQualificationBoundaryV3,
  verifyPinnedGoalQualificationRelease,
} from '@/features/bot-trading/goal-qualification';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import { exportGoalStudyReleaseV3 } from '../../../../scripts/bots/goal-study-release-v3';
import { bundleEpisode, bundleFixtureFiles } from './goal-study-bundle-fixtures';
import { syntheticQualificationEvaluator } from '../../features/bot-trading/goal-qualification-fixtures';

const replay = vi.hoisted(() => vi.fn());
const publication = vi.hoisted(() => ({ abortAfterWrite: undefined as AbortController | undefined }));
vi.mock('../../../../scripts/bots/goal-study-bundle-verifier-v3', () => ({ reverifyGoalStudyBundleV3: replay }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: async (...args: Parameters<typeof actual.writeFile>) => {
      await actual.writeFile(...args);
      if (String(args[0]).endsWith('/manifest.json')) publication.abortAfterWrite?.abort();
    },
  };
});
vi.unmock('@polkadot/util-crypto');
const indexSha256 = 'a'.repeat(64);
const binary = () =>
  readFileSync(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );

describe('fixed V3 release publication', () => {
  let directory: string;
  let boundary: ReturnType<typeof createGoalQualificationBoundaryV3>;
  let result: Awaited<ReturnType<typeof boundary.qualify>>;
  let catalogBoundary: typeof boundary, catalogResult: typeof result;
  const dispose = vi.fn();
  const input = (name: string) => ({
    bundle: { rootUrl: 'https://evidence.example/study/', indexSha256 },
    outputDirectory: join(directory, name),
  });
  const dependencies = () => ({ fetch: vi.fn(), compressedBytes: binary() });

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'goal-release-v3-'));
    const { plan } = await bundleFixtureFiles(join(directory, 'fixture'), 'invented source', undefined, 3);
    const source = syntheticQualificationEvaluator(plan);
    boundary = createGoalQualificationBoundaryV3({
      ...source.evaluator,
      protocol: 'finalized-xyk-execution-validation-v3',
      evaluate: async (request, selection) => {
        if (request.phase === 'validation' && !selection) throw Error('unsealed fixture');
        return bundleEpisode(request, plan);
      },
    });
    result = await boundary.qualify(plan);
    const { plan: catalogPlan } = await bundleFixtureFiles(
      join(directory, 'catalog-fixture'),
      'invented catalog source',
      undefined,
      3,
      true
    );
    const catalogSource = syntheticQualificationEvaluator(catalogPlan);
    catalogBoundary = createGoalQualificationBoundaryV3({
      ...catalogSource.evaluator,
      protocol: 'finalized-xyk-execution-validation-v3',
      evaluate: async (request, selection) => {
        if (request.phase === 'validation' && !selection) throw Error('unsealed fixture');
        return bundleEpisode(request, catalogPlan);
      },
    });
    catalogResult = await catalogBoundary.qualify(catalogPlan);
  }, 120000);
  beforeEach(() => {
    dispose.mockClear();
    publication.abortAfterWrite = undefined;
    replay.mockReset().mockResolvedValue({ ...result, dispose });
  });
  afterAll(async () => {
    boundary?.revoke();
    catalogBoundary?.revoke();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('publishes only an owned V3 result from the fixed replay entry point, with exact release pins', async () => {
    const request = input('release');
    const transport = dependencies();
    const published = await exportGoalStudyReleaseV3(request, transport);
    expect(replay).toHaveBeenCalledOnce();
    expect(replay.mock.calls[0][0]).toEqual(request.bundle);
    expect(replay.mock.calls[0][1].fetch).toBe(transport.fetch);
    const bytes = await readFile(published.path);
    expect(published.sha256).toBe(goalRawBytesSha256(bytes));
    const loaded = verifyPinnedGoalQualificationRelease(bytes, {
      sha256: published.sha256,
      bundleIndexSha256: published.bundleIndexSha256,
      certificateSha256: published.certificateSha256,
    });
    expect(loaded.certificate).toEqual(result.certificate);
    loaded.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    await expect(exportGoalStudyReleaseV3(request, dependencies())).rejects.toThrow();
    expect(await readFile(published.path)).toEqual(bytes);
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('preserves the explicit catalog model in a release from the owned synthetic boundary', async () => {
    replay.mockResolvedValueOnce({ ...catalogResult, dispose });
    const published = await exportGoalStudyReleaseV3(input('catalog-release'), dependencies());
    const bytes = await readFile(published.path);
    const loaded = verifyPinnedGoalQualificationRelease(bytes, {
      sha256: published.sha256,
      bundleIndexSha256: published.bundleIndexSha256,
      certificateSha256: published.certificateSha256,
    });
    expect(loaded.certificate.plan.executionModel?.protocol).toBe(
      'source128-129-130-target131-readonly-counterfactual-v1'
    );
    expect(loaded.certificate.plan.runtimeProfiles.map((p) => p.specVersion)).toEqual([128, 129, 130]);
    expect(loaded.certificate).toEqual(catalogResult.certificate);
    loaded.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('writes nothing when raw replay fails', async () => {
    replay.mockRejectedValueOnce(Error('raw validation failed'));
    await expect(exportGoalStudyReleaseV3(input('failed'), dependencies())).rejects.toThrow('raw validation failed');
    expect(await readdir(directory)).not.toContain('failed');
    expect(dispose).not.toHaveBeenCalled();
  });

  it.each(['serialized-authority', 'wrong-protocol'] as const)('rejects %s and disposes the result', async (kind) => {
    replay.mockResolvedValueOnce({
      ...result,
      ...(kind === 'serialized-authority'
        ? { verification: JSON.parse(JSON.stringify(result.verification)) }
        : { certificate: { ...result.certificate, protocol: 'finalized-xyk-qualification-v2' } }),
      dispose,
    });
    await expect(exportGoalStudyReleaseV3(input(kind), dependencies())).rejects.toThrow();
    expect(await readdir(directory)).not.toContain(kind);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('does not publish after cancellation while replay was pending', async () => {
    const controller = new AbortController();
    replay.mockImplementationOnce(async () => {
      controller.abort();
      return { ...result, dispose };
    });
    await expect(
      exportGoalStudyReleaseV3(input('aborted'), { ...dependencies(), signal: controller.signal })
    ).rejects.toThrow('stale');
    expect(await readdir(directory)).not.toContain('aborted');
    expect(dispose).toHaveBeenCalledOnce();
  });

  it.each(['verify', 'evaluateEpisode', 'replay', 'continuation', 'acquisition'])(
    'rejects an injected %s dependency before replay',
    async (name) => {
      await expect(
        exportGoalStudyReleaseV3(input(`injected-${name}`), { ...dependencies(), [name]: vi.fn() })
      ).rejects.toThrow();
      expect(replay).not.toHaveBeenCalled();
    }
  );

  it('does not report publication success if cancellation arrives as the filesystem write completes', async () => {
    const controller = new AbortController();
    publication.abortAfterWrite = controller;
    const request = input('cancelled-write');
    await expect(exportGoalStudyReleaseV3(request, { ...dependencies(), signal: controller.signal })).rejects.toThrow(
      'stale'
    );
    expect(dispose).toHaveBeenCalledOnce();
    // The write completed; its immutable artifact remains available for inspection, with no success receipt.
    expect(await readdir(request.outputDirectory)).toEqual(['manifest.json']);
  });

  it('rejects an accessor without invoking it and rejects a modified binary', async () => {
    const transport = dependencies();
    const getter = vi.fn(() => transport.fetch);
    Object.defineProperty(transport, 'fetch', { get: getter, enumerable: true });
    await expect(exportGoalStudyReleaseV3(input('getter'), transport)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    const modified = dependencies();
    modified.compressedBytes[0] ^= 1;
    await expect(exportGoalStudyReleaseV3(input('binary'), modified)).rejects.toThrow();
    expect(replay).not.toHaveBeenCalled();
  });

  it('captures locator, binary, output path and abort owner before asynchronous replay', async () => {
    const request = input('captured');
    const originalPath = request.outputDirectory;
    const controller = new AbortController();
    const transport = { ...dependencies(), signal: controller.signal };
    const originalBytes = new Uint8Array(transport.compressedBytes);
    replay.mockImplementationOnce(async (locator, owned) => {
      request.bundle.indexSha256 = 'b'.repeat(64);
      request.outputDirectory = join(directory, 'redirected');
      transport.compressedBytes.fill(0);
      transport.signal = AbortSignal.abort();
      expect(locator.indexSha256).toBe(indexSha256);
      expect(owned.compressedBytes).toEqual(originalBytes);
      expect(owned.compressedBytes).not.toBe(transport.compressedBytes);
      expect(owned.signal).toBe(controller.signal);
      return { ...result, dispose };
    });
    const published = await exportGoalStudyReleaseV3(request, transport);
    expect(published.path).toBe(join(originalPath, 'manifest.json'));
    expect(published.bundleIndexSha256).toBe(indexSha256);
    expect(await readdir(directory)).not.toContain('redirected');
    expect(dispose).toHaveBeenCalledOnce();
  });
});
