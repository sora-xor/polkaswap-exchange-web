import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  assertGoalQualificationRuntime,
  assertGoalQualificationVerification,
  createGoalQualificationBoundaryV2,
  encodeGoalQualificationRelease,
  goalQualificationDigest,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_RELEASE_MAX_BYTES,
  verifyPinnedGoalQualificationRelease,
  type GoalQualificationRelease,
} from '@/features/bot-trading/goal-qualification';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import { loadGoalQualificationRelease } from '@/features/bot-trading/goal-release';
import { exportGoalStudyRelease } from '../../../../scripts/bots/goal-study-release';
import { bundleEpisode } from './goal-study-bundle-fixtures';
import {
  botForSyntheticQualification,
  syntheticQualificationEvaluator,
  syntheticQualificationPlan,
} from '../../features/bot-trading/goal-qualification-fixtures';

const replay = vi.hoisted(() => vi.fn());
vi.mock('@/features/bot-trading/goal-bundle-verifier', () => ({ reverifyGoalStudyBundle: replay }));
vi.unmock('@polkadot/util-crypto');
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const index = 'a'.repeat(64);
const url = 'https://polkaswap.example/strategy/v1/manifest.json';

describe('trusted strategy release', () => {
  let boundary: ReturnType<typeof createGoalQualificationBoundaryV2>;
  let result: Awaited<ReturnType<typeof boundary.qualify>>;
  let bytes: Uint8Array;
  let pins: { sha256: string; bundleIndexSha256: string; certificateSha256: string };
  let directory: string;
  beforeAll(async () => {
    const plan = syntheticQualificationPlan();
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    plan.policy = GOAL_QUALIFICATION_POLICY_V2;
    if (plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
    plan.arrivalModel.checkDurationMs = 60000;
    const source = syntheticQualificationEvaluator(plan);
    boundary = createGoalQualificationBoundaryV2({
      ...source.evaluator,
      protocol: 'finalized-xyk-execution-validation-v2',
      evaluate: async (request, selection) => {
        if (request.phase === 'validation' && !selection) throw Error('unsealed fixture');
        return bundleEpisode(request, plan);
      },
    });
    result = await boundary.qualify(plan);
    bytes = encodeGoalQualificationRelease({ ...result, bundleIndexSha256: index });
    pins = {
      sha256: goalRawBytesSha256(bytes),
      bundleIndexSha256: index,
      certificateSha256: result.certificate.certificateSha256,
    };
    directory = await mkdtemp(join(tmpdir(), 'goal-release-'));
  }, 120000);
  afterAll(async () => {
    boundary?.revoke();
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  const bot = () =>
    botForSyntheticQualification(
      result.certificate.certificateSha256,
      goalQualificationDigest(result.certificate.plan.policy)
    );
  const fetcher = () =>
    vi.fn(async (input: RequestInfo | URL) => {
      const response = new Response(new Uint8Array(bytes));
      Object.defineProperty(response, 'url', { value: String(input) });
      return response;
    });
  const changed = (mutate: (release: GoalQualificationRelease) => void) => {
    const release = JSON.parse(new TextDecoder().decode(bytes)) as GoalQualificationRelease;
    mutate(release);
    const { certificateSha256: _old, ...body } = release.certificate;
    release.certificate.certificateSha256 = goalQualificationDigest(body);
    const edited = new TextEncoder().encode(JSON.stringify(release));
    return {
      edited,
      trusted: {
        ...pins,
        sha256: goalRawBytesSha256(edited),
        certificateSha256: release.certificate.certificateSha256,
      },
    };
  };

  it('loads a small release with exact unchanged policy and independently revocable owned authority', () => {
    expect(bytes.byteLength).toBeLessThan(64000);
    const loaded = verifyPinnedGoalQualificationRelease(bytes, pins);
    expect(loaded.certificate).toEqual(result.certificate);
    expect(() => assertGoalQualificationVerification(loaded.verification, bot())).not.toThrow();
    expect(Object.isFrozen(loaded.verification.binding.strategy)).toBe(true);
    loaded.dispose();
    expect(() => assertGoalQualificationVerification(loaded.verification, bot())).toThrow();
    expect(() =>
      assertGoalQualificationRuntime(loaded.verification, result.certificate.plan.runtimeProfiles[0])
    ).toThrow();
    expect(() => assertGoalQualificationVerification(result.verification, bot())).not.toThrow();
  });
  it('cannot export a serialized imitation of a verified study', () => {
    expect(() =>
      encodeGoalQualificationRelease({ ...result, verification: clone(result.verification), bundleIndexSha256: index })
    ).toThrow();
  });
  it.each(['sha256', 'bundleIndexSha256', 'certificateSha256'] as const)('requires the shipped %s pin', (key) => {
    expect(() => verifyPinnedGoalQualificationRelease(bytes, { ...pins, [key]: 'b'.repeat(64) })).toThrow();
  });
  it('rejects oversized bytes and changed content despite an unchanged release identity', () => {
    expect(() =>
      verifyPinnedGoalQualificationRelease(new Uint8Array(GOAL_QUALIFICATION_RELEASE_MAX_BYTES + 1), pins)
    ).toThrow();
    const altered = new Uint8Array(bytes);
    altered[altered.length - 1] = 32;
    expect(() => verifyPinnedGoalQualificationRelease(altered, pins)).toThrow();
  });
  it('does not admit a runtime absent from the historical certificate', () => {
    const loaded = verifyPinnedGoalQualificationRelease(bytes, pins);
    expect(() =>
      assertGoalQualificationRuntime(loaded.verification, {
        ...result.certificate.plan.runtimeProfiles[0],
        specVersion: 131,
        transactionVersion: 131,
      })
    ).toThrow();
    loaded.dispose();
  });
  it.each([
    [
      'inconsistent return',
      (release: GoalQualificationRelease) => {
        release.certificate.validation[0].netChange = {
          ...release.certificate.validation[0].netChange,
          numerator: '999',
        };
      },
    ],
    [
      'drawdown',
      (release: GoalQualificationRelease) => {
        release.certificate.validation[0].maximumDrawdown = { numerator: '1', denominator: '10' };
      },
    ],
    [
      'missing fills',
      (release: GoalQualificationRelease) => {
        release.certificate.validation.forEach((row) => {
          row.fills = 0;
        });
      },
    ],
    [
      'wrong epoch',
      (release: GoalQualificationRelease) => {
        release.certificate.validation[0].startAtMs++;
      },
    ],
    [
      'selection mismatch',
      (release: GoalQualificationRelease) => {
        release.certificate.selection.trainingSha256 = 'b'.repeat(64);
      },
    ],
    [
      'policy relaxation',
      (release: GoalQualificationRelease) => {
        (release.certificate.plan.policy as unknown as { maximumDrawdownPercent: string }).maximumDrawdownPercent =
          '10';
      },
    ],
  ] as const)('rejects a publisher artifact with %s even if its byte hash is pinned', (_label, mutate) => {
    const { edited, trusted } = changed(mutate);
    expect(() => verifyPinnedGoalQualificationRelease(edited, trusted)).toThrow();
  });
  it('fetches exactly one bounded manifest with no wallet or raw-history request', async () => {
    const fetch = fetcher();
    const loaded = await loadGoalQualificationRelease({ url, ...pins }, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(url);
    expect(() => assertGoalQualificationVerification(loaded.verification, bot())).not.toThrow();
    loaded.dispose();
  });
  it('revokes the returned qualification on caller abort', async () => {
    const controller = new AbortController();
    const loaded = await loadGoalQualificationRelease(
      { url, ...pins },
      { fetch: fetcher(), signal: controller.signal }
    );
    controller.abort();
    expect(() => assertGoalQualificationVerification(loaded.verification, bot())).toThrow();
  });
  it('retains the original cancellation owner if dependencies change during loading', async () => {
    const original = new AbortController();
    const unrelated = new AbortController();
    unrelated.abort();
    const response = fetcher();
    const dependencies = {
      signal: original.signal,
      fetch: vi.fn(async (input: RequestInfo | URL) => {
        dependencies.signal = unrelated.signal;
        return response(input);
      }),
    };
    const loaded = await loadGoalQualificationRelease({ url, ...pins }, dependencies);
    expect(() => assertGoalQualificationVerification(loaded.verification, bot())).not.toThrow();
    original.abort();
    expect(() => assertGoalQualificationVerification(loaded.verification, bot())).toThrow();
  });
  it('never starts a request after cancellation or for an invalid locator', async () => {
    const fetch = fetcher(),
      controller = new AbortController();
    controller.abort();
    await expect(
      loadGoalQualificationRelease({ url, ...pins }, { fetch, signal: controller.signal })
    ).rejects.toThrow();
    await expect(
      loadGoalQualificationRelease({ url: 'http://polkaswap.example/manifest.json', ...pins }, { fetch })
    ).rejects.toThrow();
    await expect(loadGoalQualificationRelease({ url: url + '?key=x', ...pins }, { fetch })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not emit a release when full raw replay fails', async () => {
    replay.mockRejectedValueOnce(Error('original validation failed'));
    await expect(
      exportGoalStudyRelease(
        {
          bundle: { rootUrl: 'https://evidence.example/study/', indexSha256: index },
          outputDirectory: join(directory, 'failed'),
        },
        { fetch: fetcher() }
      )
    ).rejects.toThrow('original validation failed');
    expect(await readdir(directory)).not.toContain('failed');
  });
  it('requires the full replay entrypoint before writing and never overwrites an existing release', async () => {
    const dispose = vi.fn();
    replay.mockResolvedValue({ ...result, dispose });
    const input = {
      bundle: { rootUrl: 'https://evidence.example/study/', indexSha256: index },
      outputDirectory: join(directory, 'released'),
    };
    const dependencies = { fetch: fetcher() };
    const release = await exportGoalStudyRelease(input, dependencies);
    expect(replay).toHaveBeenLastCalledWith(input.bundle, dependencies);
    expect(new Uint8Array(await readFile(release.path))).toEqual(bytes);
    expect(release.sha256).toBe(pins.sha256);
    expect(dispose).toHaveBeenCalledTimes(1);
    await expect(exportGoalStudyRelease(input, dependencies)).rejects.toThrow('EEXIST');
    expect(dispose).toHaveBeenCalledTimes(2);
  });
  it('pins the exact replay source and output before the caller can mutate them during an await', async () => {
    let finish!: (value: typeof result & { dispose: () => void }) => void;
    replay.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const target = join(directory, 'source-snapshot');
    const input = {
      bundle: { rootUrl: 'https://evidence.example/study/', indexSha256: index },
      outputDirectory: target,
    };
    const dependencies = { fetch: fetcher() };
    const exporting = exportGoalStudyRelease(input, dependencies);
    input.bundle.indexSha256 = 'c'.repeat(64);
    input.bundle.rootUrl = 'https://changed.example/study/';
    input.outputDirectory = join(directory, 'wrong-directory');
    finish({ ...result, dispose: vi.fn() });
    const release = await exporting;
    expect(release.bundleIndexSha256).toBe(index);
    expect(release.path).toBe(join(target, 'manifest.json'));
    expect(new Uint8Array(await readFile(release.path))).toEqual(bytes);
    expect(replay.mock.calls.at(-1)?.[0]).toEqual({ rootUrl: 'https://evidence.example/study/', indexSha256: index });
    expect(await readdir(directory)).not.toContain('wrong-directory');
  });
});
