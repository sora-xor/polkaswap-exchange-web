import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  prepareGoalAcquisitionReplay,
  createGoalAcquisitionReplay,
  assertGoalAcquisitionReplayPreparation,
  assertGoalAcquisitionReplayCompletion,
  buildGoalAcquisitionReplayManifest,
  type GoalAcquisitionReplayPreparation,
  type GoalAcquisitionReplayUse,
} from '../../../../scripts/bots/goal-acquisition-replay';
import {
  acquisitionCanonical,
  acquisitionDigest,
  acquisitionSha,
  goalAcquisitionReplayFixture,
} from './goal-acquisition-replay-fixture';
const init = (body: string): RequestInit => ({
  method: 'POST',
  body,
  headers: { 'content-type': 'application/json' },
  redirect: 'error',
  credentials: 'omit',
});
async function setup() {
  const f = goalAcquisitionReplayFixture();
  const read = vi.fn(f.readArtifact);
  const preparation = await prepareGoalAcquisitionReplay(f.input, { readArtifact: read });
  const retain = vi.fn(async (_receipt: Readonly<GoalAcquisitionReplayUse>) => undefined);
  const acquire = vi.fn(
    async (_url: string, _init: RequestInit, _preparation: GoalAcquisitionReplayPreparation) =>
      new Response('{"data":{"continued":true}}', { status: 200 })
  );
  const replay = createGoalAcquisitionReplay(preparation, { retainEvidence: retain, acquireFailedRequest: acquire });
  return { ...f, preparation, retain, acquire, replay, read };
}
async function prefix(f: Awaited<ReturnType<typeof setup>>) {
  for (const call of f.marketCalls)
    expect(await (await f.replay.marketFetch(call.url, init(call.body))).text()).toBe(call.response);
  for (const call of f.historyCalls)
    expect(await (await f.replay.fetch(call.url, init(call.body))).text()).toBe(call.response);
}
function editRaw(
  f: ReturnType<typeof goalAcquisitionReplayFixture>,
  name: string,
  change: (v: Record<string, any>) => void
) {
  const key = `raw/${name}`;
  const e = JSON.parse(f.artifacts.get(key)!);
  change(e.value);
  e.sha256 = acquisitionDigest(e.value);
  f.artifacts.set(key, acquisitionCanonical(e) + '\n');
  return f.refreshManifest();
}
afterEach(() => vi.restoreAllMocks());
describe('strict failed training acquisition prefix replay', () => {
  it('verifies metadata-only bindings and exact returned response bytes without any network fallback', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No network allowed'));
    const f = await setup();
    expect(f.preparation.inspection).toMatchObject({
      rawEnvelopes: 19,
      metadataRequests: 14,
      poolRequests: 1,
      historyRequests: 1,
      successfulRequests: 16,
      originalPhysicalStarts: 3,
      failedResponseBytes: Buffer.byteLength(f.failedCall.response),
    });
    expect(f.preparation.bindings.accessSha256).toBe(acquisitionDigest(f.access));
    expect(f.preparation.bindings.failedRecordSha256).toBe(acquisitionDigest(f.failed));
    expect(() => assertGoalAcquisitionReplayPreparation(f.preparation, f.preparation.bindings)).not.toThrow();
    await prefix(f);
    expect(f.acquire).not.toHaveBeenCalled();
    expect(f.retain).toHaveBeenCalledTimes(16);
    expect(network).not.toHaveBeenCalled();
    expect(f.read.mock.calls.every(([n]) => n === 'manifest' || f.artifacts.has(n))).toBe(true);
    f.replay.dispose();
  });
  it('crosses only the exact failed request after both lanes and issues owned proof after its body is consumed', async () => {
    const f = await setup();
    await prefix(f);
    expect(() => f.replay.completion()).toThrow('incomplete');
    const response = await f.replay.fetch(f.failedCall.url, init(f.failedCall.body));
    expect(f.acquire).toHaveBeenCalledTimes(1);
    expect(f.acquire.mock.calls[0][0]).toBe(f.failedCall.url);
    expect(f.acquire.mock.calls[0][1].body).toBe(f.failedCall.body);
    expect(f.acquire.mock.calls[0][2]).toBe(f.preparation);
    expect(() => f.replay.completion()).toThrow('incomplete');
    await response.text();
    const proof = f.replay.completion();
    expect(() => assertGoalAcquisitionReplayCompletion(proof, f.preparation.bindings)).not.toThrow();
    expect(() =>
      assertGoalAcquisitionReplayCompletion(JSON.parse(JSON.stringify(proof)), f.preparation.bindings)
    ).toThrow('unowned-completion');
    expect(() =>
      assertGoalAcquisitionReplayCompletion(proof, { ...f.preparation.bindings, requestSha256: '0'.repeat(64) })
    ).toThrow('unowned-completion');
    expect(f.retain.mock.calls.at(-1)![0]).toMatchObject({
      originalHttpStatus: 502,
      use: 'failed-request-boundary',
      responseSha256: acquisitionSha(f.failedCall.response),
    });
  });
  it('retains the original502 unchanged and allows clean disposal after completed proof', async () => {
    const f = await setup(),
      before = f.artifacts.get('raw/failure.json');
    await prefix(f);
    await (await f.replay.fetch(f.failedCall.url, init(f.failedCall.body))).text();
    const proof = f.replay.completion();
    f.replay.dispose();
    expect(f.artifacts.get('raw/failure.json')).toBe(before);
    expect(f.replay.completion()).toBe(proof);
    expect(() => assertGoalAcquisitionReplayCompletion(proof, f.preparation.bindings)).not.toThrow();
  });
  it('does not accept copied preparation or reuse the same owned preparation twice', async () => {
    const f = await setup();
    expect(() => assertGoalAcquisitionReplayPreparation(JSON.parse(JSON.stringify(f.preparation)))).toThrow(
      'unowned-preparation'
    );
    expect(() =>
      createGoalAcquisitionReplay(f.preparation, { retainEvidence: f.retain, acquireFailedRequest: f.acquire })
    ).toThrow('transport-options');
  });
  it('rejects the terminal history request while any market request remains', async () => {
    const f = await setup();
    for (const c of f.historyCalls) await f.replay.fetch(c.url, init(c.body));
    await expect(f.replay.fetch(f.failedCall.url, init(f.failedCall.body))).rejects.toThrow('prefix-not-drained');
    expect(f.acquire).not.toHaveBeenCalled();
    expect(() => f.replay.completion()).toThrow('incomplete');
  });
  it.each(['wrong-lane', 'wrong-body', 'wrong-url', 'wrong-order'])(
    'poisons a %s divergence rather than falling through to live',
    async (kind) => {
      const f = await setup(),
        c = f.marketCalls[0];
      const fetcher = kind === 'wrong-lane' ? f.replay.fetch : f.replay.marketFetch;
      await expect(
        fetcher(
          kind === 'wrong-url' ? f.failedCall.url : c.url,
          init(kind === 'wrong-body' ? c.body + ' ' : kind === 'wrong-order' ? f.marketCalls[1].body : c.body)
        )
      ).rejects.toThrow('request-diverged');
      await expect(f.replay.marketFetch(c.url, init(c.body))).rejects.toThrow('closed-or-concurrent');
      expect(f.acquire).not.toHaveBeenCalled();
    }
  );
  it('never exposes a response when evidence retention fails', async () => {
    const f = goalAcquisitionReplayFixture(),
      p = await prepareGoalAcquisitionReplay(f.input, { readArtifact: f.readArtifact });
    const acquire = vi.fn();
    const replay = createGoalAcquisitionReplay(p, {
      retainEvidence: async () => {
        throw Error('sink failed');
      },
      acquireFailedRequest: acquire,
    });
    await expect(replay.marketFetch(f.marketCalls[0].url, init(f.marketCalls[0].body))).rejects.toThrow('sink failed');
    expect(acquire).not.toHaveBeenCalled();
    expect(() => replay.completion()).toThrow('incomplete');
  });
  it('rejects aborted operation before issuing a terminal callback', async () => {
    const f = goalAcquisitionReplayFixture(),
      p = await prepareGoalAcquisitionReplay(f.input, { readArtifact: f.readArtifact }),
      controller = new AbortController(),
      acquire = vi.fn();
    const replay = createGoalAcquisitionReplay(p, {
      retainEvidence: async () => undefined,
      acquireFailedRequest: acquire,
      signal: controller.signal,
    });
    controller.abort();
    await expect(replay.marketFetch(f.marketCalls[0].url, init(f.marketCalls[0].body))).rejects.toThrow(
      'closed-or-concurrent'
    );
    expect(acquire).not.toHaveBeenCalled();
  });
  it('rejects a non200 retry result and never returns a completed proof', async () => {
    const f = await setup();
    await prefix(f);
    f.acquire.mockImplementationOnce(async () => new Response('still failed', { status: 502 }));
    await expect(f.replay.fetch(f.failedCall.url, init(f.failedCall.body))).rejects.toThrow('retry-response');
    expect(() => f.replay.completion()).toThrow('incomplete');
  });
  it('rejects concurrent requests while the original retention callback is unresolved', async () => {
    const f = goalAcquisitionReplayFixture();
    const p = await prepareGoalAcquisitionReplay(f.input, { readArtifact: f.readArtifact });
    let release!: () => void;
    const acquire = vi.fn();
    const replay = createGoalAcquisitionReplay(p, {
      retainEvidence: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      acquireFailedRequest: acquire,
    });
    const c = f.marketCalls[0];
    const first = replay.marketFetch(c.url, init(c.body));
    const firstFailure = expect(first).rejects.toThrow();
    await Promise.resolve();
    await expect(replay.marketFetch(c.url, init(c.body))).rejects.toThrow('closed-or-concurrent');
    release();
    await firstFailure;
    expect(acquire).not.toHaveBeenCalled();
  });
  it('never delegates a subsequent request and invalidates proof if replay is used again', async () => {
    const f = await setup();
    await prefix(f);
    await (await f.replay.fetch(f.failedCall.url, init(f.failedCall.body))).text();
    const proof = f.replay.completion();
    await expect(f.replay.fetch(f.failedCall.url, init(f.failedCall.body))).rejects.toThrow('closed-or-concurrent');
    expect(f.acquire).toHaveBeenCalledTimes(1);
    expect(() => assertGoalAcquisitionReplayCompletion(proof, f.preparation.bindings)).toThrow('unowned-completion');
  });
  it('does not issue completion for a cancelled retry body', async () => {
    const f = await setup();
    await prefix(f);
    const response = await f.replay.fetch(f.failedCall.url, init(f.failedCall.body));
    await response.body!.cancel();
    expect(() => f.replay.completion()).toThrow('incomplete');
  });
  it('rejects unexpected request headers before retaining or calling any acquisition callback', async () => {
    const f = await setup(),
      c = f.marketCalls[0];
    await expect(
      f.replay.marketFetch(c.url, {
        ...init(c.body),
        headers: { 'content-type': 'application/json', authorization: 'not-a-real-token' },
      })
    ).rejects.toThrow('request-headers');
    expect(f.retain).not.toHaveBeenCalled();
    expect(f.acquire).not.toHaveBeenCalled();
  });
  it.each([
    'file-bytes',
    'envelope-hash',
    'missing-cache',
    'cache-join',
    'schema-reference',
    'rpc-order',
    'original-status',
    'request-count',
    'response-bytes',
    'unsupported-envelope',
  ])('rejects retained %s inconsistency before any transport exists', async (kind) => {
    const f = goalAcquisitionReplayFixture();
    let input = f.input;
    if (kind === 'file-bytes') f.artifacts.set('raw/cache-1', f.artifacts.get('raw/cache-1') + ' ');
    if (kind === 'envelope-hash') {
      const e = JSON.parse(f.artifacts.get('raw/cache-1')!);
      e.sha256 = '0'.repeat(64);
      f.artifacts.set('raw/cache-1', JSON.stringify(e));
      input = f.refreshManifest();
    }
    if (kind === 'missing-cache') {
      f.artifacts.delete('raw/cache-2');
      input = f.refreshManifest();
    }
    if (kind === 'cache-join') input = editRaw(f, 'cache-1', (v) => (v.callerId = 999));
    if (kind === 'schema-reference')
      input = editRaw(f, 'market-state-20.json', (v) => (v.schemaSha256 = '0'.repeat(64)));
    if (kind === 'rpc-order') input = editRaw(f, 'market-state-20.json', (v) => v.blockEvidence.reverse());
    if (kind === 'original-status')
      input = editRaw(f, 'failure.json', (v) => (v.diagnostic.rpcEvidence.at(-1).httpStatus = 503));
    if (kind === 'request-count') input = editRaw(f, 'failure.json', (v) => v.requests++);
    if (kind === 'response-bytes') input = editRaw(f, 'failure.json', (v) => v.responseBytes++);
    if (kind === 'unsupported-envelope') {
      const e = JSON.parse(f.artifacts.get('raw/cache-1')!);
      e.name = 'quote-1.json';
      f.artifacts.set('raw/quote-1.json', JSON.stringify(e));
      input = f.refreshManifest();
    }
    await expect(prepareGoalAcquisitionReplay(input, { readArtifact: f.readArtifact })).rejects.toThrow(
      'goal-acquisition-replay:'
    );
  });
  it.each(['validation', 'second-episode', 'different-candidate', 'source-hash'])(
    'rejects %s access rather than widening the retained first training scope',
    async (kind) => {
      const f = goalAcquisitionReplayFixture();
      const a = JSON.parse(f.artifacts.get('access')!);
      if (kind === 'validation') a.request.phase = 'validation';
      if (kind === 'second-episode') a.request.episodeIndex = 1;
      if (kind === 'different-candidate') a.request.candidateSha256 = '0'.repeat(64);
      f.artifacts.set('access', JSON.stringify(a));
      if (kind === 'source-hash') {
        const r = JSON.parse(f.artifacts.get('registration')!);
        r.sourceSha256 = '0'.repeat(64);
        f.artifacts.set('registration', JSON.stringify(r));
      }
      await expect(prepareGoalAcquisitionReplay(f.refreshManifest(), { readArtifact: f.readArtifact })).rejects.toThrow(
        'goal-acquisition-replay:'
      );
    }
  );
  it('rejects path traversal, duplicate files and altered manifest bytes', async () => {
    expect(() =>
      buildGoalAcquisitionReplayManifest(
        'a'.repeat(64),
        Array(4).fill({ name: '../escape', sha256: 'b'.repeat(64), bytes: 1 })
      )
    ).toThrow('file-name');
    const f = goalAcquisitionReplayFixture();
    f.artifacts.set('manifest', f.artifacts.get('manifest') + ' ');
    await expect(prepareGoalAcquisitionReplay(f.input, { readArtifact: f.readArtifact })).rejects.toThrow(
      'manifest-hash'
    );
  });
});
