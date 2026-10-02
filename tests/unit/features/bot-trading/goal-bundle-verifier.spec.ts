// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { reverifyGoalStudyBundle } from '@/features/bot-trading/goal-bundle-verifier';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import type { GoalStudyBundleIndex } from '../../../../scripts/bots/goal-study-bundle-export';

vi.unmock('@polkadot/util-crypto');
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

describe('production immutable-study verifier composition', () => {
  it('requires the original metadata archive before interpreting a certificate or opening episodes', async () => {
    const f = fixture();
    await expect(reverifyGoalStudyBundle(f.input, { fetch: f.fetcher })).rejects.toThrow('metadata-required');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.fetcher.mock.calls[0][0]).toBe(`${rootUrl}index.json`);
    expect(f.fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('honors cancellation before any evidence request', async () => {
    const f = fixture(),
      controller = new AbortController();
    controller.abort();
    await expect(
      reverifyGoalStudyBundle(f.input, {
        fetch: f.fetcher,
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
    const verifying = reverifyGoalStudyBundle(f.input, { fetch: fetcher, signal: controller.signal });
    const rejected = expect(verifying).rejects.toThrow();
    await opening;
    controller.abort();
    await rejected;
    expect(requestSignal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
