import { describe, expect, it, vi } from 'vitest';
import { reverifyGoalStudyBundleV3 } from '../../../../scripts/bots/goal-study-bundle-verifier-v3';
import { readFileSync } from 'node:fs';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import type { GoalStudyBundleIndex } from '../../../../scripts/bots/goal-study-bundle-export';

vi.unmock('@polkadot/util-crypto');
const binary = () =>
  readFileSync(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );
const rootUrl = 'https://evidence.example.org/study/';
const sha = (n: number) => n.toString(16).padStart(64, '0');
/** Valid distribution identities with deliberately absent raw metadata, never a strategy fixture. */
function fixture() {
  const artifacts = [
    'certificate',
    'protocol',
    'registration',
    'selection',
    'study-claim',
    'validation-claim',
    'metadata-training',
    'metadata-validation',
  ].map((name) => ({ name, sha256: sha(100), bytes: 1 }));
  const episodes: GoalStudyBundleIndex['episodes'][number][] = [];
  for (let i = 0; i < 6; i++) {
    const requestSha256 = sha(10 + i);
    artifacts.push(
      { name: `access-${requestSha256}`, sha256: sha(100), bytes: 1 },
      { name: `complete-${requestSha256}`, sha256: sha(100), bytes: 1 }
    );
    episodes.push({
      phase: i < 4 ? 'training' : 'validation',
      candidateSha256: sha(3),
      episodeIndex: i < 4 ? i : i - 4,
      requestSha256,
      manifestSha256: sha(100),
    });
  }
  const index: GoalStudyBundleIndex = {
    kind: 'goal-study-evidence-bundle-v1',
    version: 1,
    protocolSha256: sha(1),
    planSha256: sha(2),
    sourceSha256: sha(4),
    certificateSha256: sha(5),
    artifacts,
    episodes,
    parent: null,
    metadata: null,
  };
  const body = new TextEncoder().encode(JSON.stringify(index) + '\n');
  const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
    const response = new Response(body);
    Object.defineProperty(response, 'url', { value: String(url) });
    return response;
  });
  return { input: { rootUrl, indexSha256: goalRawBytesSha256(body) }, fetcher };
}

describe('fixed Node V3 immutable-study verifier composition', () => {
  it('requires the original metadata archive before interpreting a certificate or opening episodes', async () => {
    const f = fixture();
    await expect(reverifyGoalStudyBundleV3(f.input, { fetch: f.fetcher, compressedBytes: binary() })).rejects.toThrow(
      'metadata-required'
    );
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.fetcher.mock.calls[0][0]).toBe(`${rootUrl}index.json`);
    expect(f.fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('honors cancellation before any evidence request', async () => {
    const f = fixture(),
      controller = new AbortController();
    controller.abort();
    await expect(
      reverifyGoalStudyBundleV3(f.input, {
        fetch: f.fetcher,
        compressedBytes: binary(),
        signal: controller.signal,
      })
    ).rejects.toThrow('closed');
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it('aborts an outstanding static request when the caller cancels', async () => {
    const f = fixture(),
      controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    let started!: () => void;
    const opening = new Promise<void>((resolve) => {
      started = resolve;
    });
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      started();
      return new Promise<Response>(() => undefined);
    });
    const verifying = reverifyGoalStudyBundleV3(f.input, {
      fetch: fetcher,
      compressedBytes: binary(),
      signal: controller.signal,
    });
    const rejected = expect(verifying).rejects.toThrow();
    await opening;
    controller.abort();
    await rejected;
    expect(requestSignal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('fixed V3 verifier dependencies', () => {
  it.each(['quoteVerifier', 'evaluateEpisode', 'metadataVerifier', 'study', 'worker', 'catalog'])(
    'rejects injected %s before any evidence read',
    async (key) => {
      const f = fixture();
      await expect(
        reverifyGoalStudyBundleV3(f.input, { fetch: f.fetcher, compressedBytes: binary(), [key]: () => true })
      ).rejects.toThrow('dependencies');
      expect(f.fetcher).not.toHaveBeenCalled();
    }
  );
  it('rejects changed target bytes before an evidence request', async () => {
    const f = fixture();
    const compressedBytes = binary();
    compressedBytes[0] ^= 1;
    await expect(reverifyGoalStudyBundleV3(f.input, { fetch: f.fetcher, compressedBytes })).rejects.toThrow(
      'target-binary-pin'
    );
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('rejects getters without invoking them', async () => {
    const f = fixture();
    const getter = vi.fn(() => f.fetcher);
    const dependencies = {
      compressedBytes: binary(),
      get fetch() {
        return getter();
      },
    };
    await expect(reverifyGoalStudyBundleV3(f.input, dependencies)).rejects.toThrow('dependencies');
    expect(getter).not.toHaveBeenCalled();
  });
  it('snapshots the locator and bytes before the first asynchronous response', async () => {
    const f = fixture();
    const compressedBytes = binary();
    const working = reverifyGoalStudyBundleV3(f.input, { fetch: f.fetcher, compressedBytes });
    compressedBytes.fill(0);
    f.input.rootUrl = 'https://invalid.example/';
    f.input.indexSha256 = sha(999);
    await expect(working).rejects.toThrow('metadata-required');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.fetcher.mock.calls[0][0]).toBe(`${rootUrl}index.json`);
  });
});
