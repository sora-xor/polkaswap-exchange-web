// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import {
  createGoalBundleReader,
  createGoalValidationBundleReader,
  type GoalBundleManifest,
  type GoalBundleReaderInput,
} from '@/features/bot-trading/goal-bundle-reader';
vi.unmock('@polkadot/util-crypto');
const ROOT = 'https://evidence.example/ipfs/test-fixture/episode-0/';
const encoder = new TextEncoder();
const hash = (bytes: Uint8Array) => u8aToHex(sha256AsU8a(bytes), undefined, false);
function response(url: string, body: BodyInit | null, status = 200) {
  const result = new Response(body, { status });
  Object.defineProperty(result, 'url', { value: url });
  return result;
}
/** Synthetic bytes only; no study, chain, wallet or remote source is used. */
function fixture(change?: (manifest: GoalBundleManifest) => void) {
  const data = encoder.encode('{"invented":true}\n');
  const manifest: GoalBundleManifest = {
    version: 1,
    kind: 'goal-episode-evidence-bundle-v1',
    phase: 'training',
    planSha256: '1'.repeat(64),
    requestSha256: '2'.repeat(64),
    sourceSha256: '3'.repeat(64),
    artifacts: [{ name: 'source.json', sha256: hash(data), bytes: data.length }],
  };
  change?.(manifest);
  const manifestBytes = encoder.encode(JSON.stringify(manifest) + '\n');
  const input = { rootUrl: ROOT, manifestSha256: hash(manifestBytes) };
  const objectUrl = `${ROOT}objects/${hash(data)}.bin`;
  const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0], _init?: RequestInit) => {
    if (url === `${ROOT}manifest.json`) return response(String(url), manifestBytes);
    if (url === objectUrl) return response(String(url), data);
    throw Error('fixture-unexpected-url');
  });
  return { data, manifest, manifestBytes, input, objectUrl, fetcher, deps: { fetch: fetcher as typeof fetch } };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('pinned browser training bundle byte reader', () => {
  it('rejects a serialized selection before fetching any validation manifest', async () => {
    const f = fixture((manifest) => {
      manifest.phase = 'validation';
    });
    await expect(
      createGoalValidationBundleReader(f.input, f.deps, {
        selection: {
          kind: 'selection-sealed-before-validation',
          planSha256: f.manifest.planSha256,
        } as never,
        binding: {
          indexSha256: 'a'.repeat(64),
          planSha256: f.manifest.planSha256,
          sourceSha256: f.manifest.sourceSha256,
          candidateSha256: 'b'.repeat(64),
          requestSha256: f.manifest.requestSha256,
        },
      })
    ).rejects.toThrow();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('lazily returns exact bytes only after checking the trusted pin and derived object digest', async () => {
    const f = fixture();
    const reader = await createGoalBundleReader(f.input, f.deps);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(reader.summary).toEqual({
      kind: 'goal-training-bundle-bytes-v1',
      phase: 'training',
      manifestSha256: f.input.manifestSha256,
      planSha256: '1'.repeat(64),
      requestSha256: '2'.repeat(64),
      sourceSha256: '3'.repeat(64),
      files: 1,
      bytes: f.data.length,
    });
    expect(Object.isFrozen(reader)).toBe(true);
    expect(Object.isFrozen(reader.summary)).toBe(true);
    expect(Object.keys(reader).sort()).toEqual(['dispose', 'read', 'summary']);
    expect(await reader.read('source.json')).toEqual(f.data);
    expect(f.fetcher.mock.calls.map((call) => call[0])).toEqual([`${ROOT}manifest.json`, f.objectUrl]);
    for (const [, init] of f.fetcher.mock.calls)
      expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store' });
    reader.dispose();
    await expect(reader.read('source.json')).rejects.toThrow('closed');
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    'http://evidence.example/data/',
    'https://user:secret@evidence.example/data/',
    'https://evidence.example/data/?query=x',
    'https://evidence.example/data/#fragment',
    'https://evidence.example/data/../other/',
    'https://evidence.example/data/%2e%2e/',
    'https://evidence.example/data//nested/',
    'https://evidence.example/data',
  ])('rejects an untrusted/escaping locator before I/O: %s', async (rootUrl) => {
    const f = fixture();
    await expect(createGoalBundleReader({ ...f.input, rootUrl }, f.deps)).rejects.toThrow('root');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('does not coerce inputs or invoke caller accessors', async () => {
    const f = fixture(),
      getter = vi.fn();
    const input = Object.defineProperty({ ...f.input }, 'rootUrl', { enumerable: true, get: getter });
    await expect(createGoalBundleReader(input, f.deps)).rejects.toThrow('own-data');
    const digest = { toString: getter };
    await expect(
      createGoalBundleReader({ ...f.input, manifestSha256: digest } as unknown as GoalBundleReaderInput, f.deps)
    ).rejects.toThrow('digest');
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('rejects changed manifest bytes, even semantically equal JSON with different trailing bytes', async () => {
    const f = fixture();
    f.fetcher.mockResolvedValueOnce(response(`${ROOT}manifest.json`, encoder.encode(JSON.stringify(f.manifest))));
    await expect(createGoalBundleReader(f.input, f.deps)).rejects.toThrow('hash');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed UTF-8 despite a matching byte hash', async () => {
    const f = fixture(),
      invalid = new Uint8Array([255]);
    f.input.manifestSha256 = hash(invalid);
    f.fetcher.mockResolvedValueOnce(response(`${ROOT}manifest.json`, invalid));
    await expect(createGoalBundleReader(f.input, f.deps)).rejects.toThrow('manifest-json');
  });
  it.each(['validation', 'duplicate', 'path', 'extra-path', 'size-zero', 'file-limit', 'total-limit', 'count-limit'])(
    'rejects manifest %s before any artifact read',
    async (kind) => {
      const f = fixture((manifest) => {
        const entry = manifest.artifacts[0];
        if (kind === 'validation') manifest.phase = 'validation';
        if (kind === 'duplicate') manifest.artifacts = [entry, { ...entry }];
        if (kind === 'path') manifest.artifacts = [{ ...entry, name: '../escape' }];
        if (kind === 'extra-path')
          manifest.artifacts = [{ ...entry, path: 'https://elsewhere.example/' } as typeof entry];
        if (kind === 'size-zero') manifest.artifacts = [{ ...entry, bytes: 0 }];
        if (kind === 'file-limit') manifest.artifacts = [{ ...entry, bytes: 32 * 1024 * 1024 + 1 }];
        if (kind === 'total-limit')
          manifest.artifacts = Array.from({ length: 17 }, (_, i) => ({
            ...entry,
            name: `file-${i}`,
            bytes: 32 * 1024 * 1024,
          }));
        if (kind === 'count-limit')
          manifest.artifacts = Array.from({ length: 16001 }, (_, i) => ({ ...entry, name: `file-${i}` }));
      });
      await expect(createGoalBundleReader(f.input, f.deps)).rejects.toThrow('goal-bundle:');
      expect(f.fetcher).toHaveBeenCalledTimes(1);
    }
  );
  it.each(['short', 'long', 'changed'] as const)('rejects %s object bytes and revokes later reads', async (kind) => {
    const f = fixture(),
      reader = await createGoalBundleReader(f.input, f.deps);
    const data =
      kind === 'short'
        ? f.data.slice(1)
        : kind === 'long'
          ? new Uint8Array(f.data.length + 1)
          : new Uint8Array(f.data.length);
    f.fetcher.mockResolvedValueOnce(response(f.objectUrl, data));
    await expect(reader.read('source.json')).rejects.toThrow(kind === 'changed' ? 'hash' : 'bytes');
    await expect(reader.read('source.json')).rejects.toThrow('closed');
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(['redirected', 'origin', 'path', 'status', 'empty-url'] as const)(
    'rejects response %s before admitting bytes',
    async (kind) => {
      const f = fixture(),
        reader = await createGoalBundleReader(f.input, f.deps);
      const url =
        kind === 'origin'
          ? 'https://elsewhere.example/object'
          : kind === 'path'
            ? ROOT + 'outside.bin'
            : kind === 'empty-url'
              ? ''
              : f.objectUrl;
      const result = response(url, f.data, kind === 'status' ? 206 : 200);
      if (kind === 'redirected') Object.defineProperty(result, 'redirected', { value: true });
      const cancelled = vi.spyOn(result.body!, 'cancel');
      f.fetcher.mockResolvedValueOnce(result);
      await expect(reader.read('source.json')).rejects.toThrow('response');
      expect(cancelled).toHaveBeenCalledTimes(1);
    }
  );
  it('makes each named artifact read-once and never interprets names as URLs', async () => {
    const f = fixture(),
      reader = await createGoalBundleReader(f.input, f.deps);
    await reader.read('source.json');
    await expect(reader.read('source.json')).rejects.toThrow('artifact-read-once');
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    const g = fixture(),
      other = await createGoalBundleReader(g.input, g.deps);
    await expect(other.read('https://elsewhere.example/')).rejects.toThrow('artifact-unknown');
    expect(g.fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds manifest body bytes without trusting response headers', async () => {
    const f = fixture();
    f.fetcher.mockResolvedValueOnce(response(`${ROOT}manifest.json`, new Uint8Array(4 * 1024 * 1024 + 1)));
    await expect(createGoalBundleReader(f.input, f.deps)).rejects.toThrow('bytes');
  });
  it('handles synchronous provider failures and detaches caller cancellation', async () => {
    const f = fixture(),
      controller = new AbortController();
    const removed = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    const fetcher = vi.fn(() => {
      throw Error('synthetic provider failure');
    });
    await expect(createGoalBundleReader(f.input, { fetch: fetcher, signal: controller.signal })).rejects.toThrow(
      'unavailable'
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(removed.mock.contexts.filter((context) => context === controller.signal)).toHaveLength(1);
    expect(controller.signal.aborted).toBe(false);
  });
  it('aborts before I/O and cancels an uncooperative late header response after disposal', async () => {
    const f = fixture(),
      stopped = new AbortController();
    stopped.abort();
    await expect(createGoalBundleReader(f.input, { ...f.deps, signal: stopped.signal })).rejects.toThrow('closed');
    expect(f.fetcher).not.toHaveBeenCalled();
    const reader = await createGoalBundleReader(f.input, f.deps);
    let release!: (r: Response) => void;
    f.fetcher.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const pending = reader.read('source.json'),
      rejected = expect(pending).rejects.toThrow('aborted');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    reader.dispose();
    await rejected;
    const late = response(f.objectUrl, f.data),
      cancel = vi.spyOn(late.body!, 'cancel');
    release(late);
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it('times out a stalled body, cancels it and blocks any later artifact request', async () => {
    vi.useFakeTimers();
    const f = fixture(),
      reader = await createGoalBundleReader(f.input, f.deps),
      cancel = vi.fn();
    f.fetcher.mockResolvedValueOnce(
      response(f.objectUrl, new ReadableStream({ pull: () => new Promise(() => undefined), cancel }))
    );
    const pending = reader.read('source.json'),
      rejected = expect(pending).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(30000);
    await rejected;
    expect(cancel).toHaveBeenCalledTimes(1);
    await expect(reader.read('source.json')).rejects.toThrow('closed');
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it('enforces the original absolute deadline even before a delayed timer gets CPU time', async () => {
    vi.useFakeTimers();
    const f = fixture(),
      started = Date.now();
    f.fetcher.mockImplementationOnce(async (url) => {
      vi.setSystemTime(started + 30000);
      return response(String(url), f.manifestBytes);
    });
    await expect(createGoalBundleReader(f.input, f.deps)).rejects.toThrow('deadline');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects overlapping reads and cancels the already pending read', async () => {
    const f = fixture(),
      reader = await createGoalBundleReader(f.input, f.deps);
    f.fetcher.mockImplementationOnce(() => new Promise(() => undefined));
    const pending = reader.read('source.json'),
      rejected = expect(pending).rejects.toThrow('aborted');
    await expect(reader.read('source.json')).rejects.toThrow('concurrent-read');
    await rejected;
    expect(f.fetcher.mock.calls.length).toBeLessThanOrEqual(2);
  });
  it('removes the parent listener on clean disposal without aborting that caller', async () => {
    const f = fixture(),
      controller = new AbortController(),
      removed = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    const reader = await createGoalBundleReader(f.input, { ...f.deps, signal: controller.signal });
    reader.dispose();
    reader.dispose();
    expect(removed.mock.contexts.filter((context) => context === controller.signal)).toHaveLength(1);
    expect(controller.signal.aborted).toBe(false);
  });
});
