// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalBundleContinuation,
  createGoalBundleAcquisition,
} from '@/features/bot-trading/goal-bundle-continuation';
import {
  createGoalAcquisitionReplay,
  prepareGoalAcquisitionReplay,
  prepareGoalAcquisitionReplayBundle,
} from '@/features/bot-trading/goal-acquisition-replay';
import {
  acquisitionCanonical as canonical,
  acquisitionDigest as digest,
  acquisitionSha as sha,
  goalAcquisitionReplayFixture,
} from '../../scripts/bots/goal-acquisition-replay-fixture';
vi.unmock('@polkadot/util-crypto');
type Json = Record<string, any>;
const encoded = (v: unknown) => new TextEncoder().encode(canonical(v)).length;
const init = (body: string): RequestInit => ({
  method: 'POST',
  body,
  headers: { 'content-type': 'application/json' },
  redirect: 'error',
  credentials: 'omit',
});
async function fixture(retry = false) {
  const f = goalAcquisitionReplayFixture();
  const p = await prepareGoalAcquisitionReplay(f.input, { readArtifact: f.readArtifact });
  const uses: Json[] = [];
  const responseBody = f.historyCalls[0].response;
  const replay = createGoalAcquisitionReplay(p, {
    retainEvidence: async (value) => {
      uses.push(value);
    },
    acquireFailedRequest: async () => new Response(responseBody),
  });
  for (const c of f.marketCalls) await (await replay.marketFetch(c.url, init(c.body))).text();
  for (const c of f.historyCalls) await (await replay.fetch(c.url, init(c.body))).text();
  await (await replay.fetch(f.failedCall.url, init(f.failedCall.body))).text();
  const childPlan = 'a'.repeat(64),
    childSource = 'b'.repeat(64);
  const lineage = {
    kind: 'goal-study-acquisition-continuation-v1',
    parentPlanSha256: p.bindings.parentPlanSha256,
    parentSourceSha256: p.bindings.parentSourceSha256,
    parentRequestSha256: p.bindings.requestSha256,
    parentAccessSha256: p.bindings.accessSha256,
    parentFailedRecordSha256: p.bindings.failedRecordSha256,
    parentRawManifestSha256: p.bindings.rawManifestSha256,
    failedHttpStatus: 502,
    childPlanSha256: childPlan,
    childSourceSha256: childSource,
  };
  const controller = new AbortController();
  const context = {
    lineage,
    parentRequest: f.access.request,
    inventory: JSON.parse(f.artifacts.get('manifest')!),
    readParentArtifact: async (name: string) => new TextEncoder().encode(await f.readArtifact(name)),
    signal: controller.signal,
  };
  const values = new Map<string, Json>();
  values.set('source.json', {
    request: { ...f.access.request, planSha256: childPlan },
    manifest: { maximumHttpRequests: 10000, maximumResponseBytes: 256 * 1024 * 1024 },
  });
  for (const [name, value] of f.raw) if (/^market-(schema|state)-/.test(name)) values.set(name, structuredClone(value));
  const oldRows = f.raw.get('failure.json')!.diagnostic.rpcEvidence;
  values.set('history-1.json', {
    rpcEvidence: [
      oldRows[0],
      {
        ...oldRows[1],
        httpStatus: 200,
        responseBody,
        responseSha256: sha(responseBody),
        bytes: new TextEncoder().encode(responseBody).length,
      },
    ],
  });
  const logicalBytes =
    f.marketCalls.reduce((n, c) => n + new TextEncoder().encode(c.response).length, 0) +
    new TextEncoder().encode(f.historyCalls[0].response).length +
    new TextEncoder().encode(responseBody).length;
  values.set('complete-source.json', { requests: 17, responseBytes: logicalBytes });
  for (const use of uses) values.set(`acquisition-prefix-${use.lane}-${use.sequence}`, structuredClone(use));
  const request = { url: f.failedCall.url, ...init(f.failedCall.body) };
  const addAttempt = (index: number, status: number) => {
    const body = status === 200 ? responseBody : 'bounded temporary outage';
    values.set(`acquisition-1-1-${index}`, {
      kind: 'goal-acquisition-attempt-v1',
      operationId: 'episode-history-1',
      requestIndex: 1,
      attemptIndex: index,
      requestSha256: digest(request),
      carriedAttempts: 1,
      policySha256: digest({
        kind: 'recorded-indexer-history-retry-v1',
        maximumAttempts: 3,
        statuses: [502, 503, 504],
        backoffMs: [1000, 3000],
      }),
      operationDeadlineAtMs: 20000,
      request,
      requestedAtMs: index === 2 ? 10000 : 13001,
      completedAtMs: index === 2 ? 10001 : 13002,
      outcome: 'response',
      response: {
        status,
        url: f.failedCall.url,
        redirected: false,
        headers: { 'content-type': 'application/json' },
        bodyBase64: btoa(body),
        bytesRead: body.length,
        retainedBytes: body.length,
        bodySha256: sha(body),
        complete: true,
      },
    });
  };
  addAttempt(2, retry ? 503 : 200);
  if (retry) addAttempt(3, 200);
  const observe = (
    observer: Awaited<ReturnType<ReturnType<typeof createGoalBundleContinuation>['prepare']>>,
    entries = values
  ) => {
    for (const [name, value] of entries)
      observer.observeChild({ name, sha256: digest(value), bytes: encoded(value) }, value);
  };
  return { f, p, context, controller, values, observe, logicalBytes };
}
/** Synthetic later episode: every history response is physically retained, with no parent carry. */
async function ordinaryFixture(phase: 'training' | 'validation', retry = false) {
  const f = await fixture();
  for (const name of [...f.values.keys()]) if (name.startsWith('acquisition-')) f.values.delete(name);
  const source = f.values.get('source.json')!;
  source.request = { ...source.request, phase, episodeIndex: phase === 'training' ? 1 : 0 };
  source.manifest.maximumHttpRequests = 17 + (retry ? 1 : 0);
  source.manifest.maximumResponseBytes = f.logicalBytes + (retry ? 'outage'.length : 0);
  const rows = f.values.get('history-1.json')!.rpcEvidence;
  rows.forEach((row: Json, index: number) => {
    const request = { url: f.f.failedCall.url, ...init(row.requestBody) };
    const last = retry && index === 0 ? 2 : 1;
    for (let attemptIndex = 1; attemptIndex <= last; attemptIndex++) {
      const status = attemptIndex === last ? 200 : 503,
        body = status === 200 ? row.responseBody : 'outage';
      const start = index === 0 ? 10000 + (attemptIndex - 1) * 1001 : 13000;
      f.values.set(`acquisition-1-${index + 1}-${attemptIndex}`, {
        kind: 'goal-acquisition-attempt-v1',
        operationId: 'episode-history-1',
        requestIndex: index + 1,
        attemptIndex,
        requestSha256: digest(request),
        carriedAttempts: 0,
        policySha256: digest({
          kind: 'recorded-indexer-history-retry-v1',
          maximumAttempts: 3,
          statuses: [502, 503, 504],
          backoffMs: [1000, 3000],
        }),
        operationDeadlineAtMs: 20000,
        request,
        requestedAtMs: start,
        completedAtMs: start + 1,
        outcome: 'response',
        response: {
          status,
          url: request.url,
          redirected: false,
          headers: { 'content-type': 'application/json' },
          bodyBase64: btoa(body),
          bytesRead: body.length,
          retainedBytes: body.length,
          bodySha256: sha(body),
          complete: true,
        },
      });
    }
  });
  return { ...f, request: structuredClone(source.request) };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('browser retained acquisition continuation', () => {
  it.each([false, true])(
    'verifies actual replay receipts, child consumption and carried failure (extra outage=%s) without network',
    async (retry) => {
      const f = await fixture(retry),
        network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No network'));
      vi.stubGlobal('Buffer', undefined);
      const observer = await createGoalBundleContinuation().prepare(f.context);
      f.observe(observer);
      expect(() => observer.complete()).not.toThrow();
      expect(() => observer.complete()).toThrow('closed-or-aborted');
      expect(network).not.toHaveBeenCalled();
    }
  );
  it('joins later pages and the next ordinary operation without carrying the original failure again', async () => {
    const f = await fixture();
    const original = f.values.get('acquisition-1-1-2')!;
    const history = f.values.get('history-1.json')!.rpcEvidence;
    const nextRows: Json[] = [];
    for (const [operation, requestIndex, start] of [
      [1, 2, 14000],
      [2, 1, 25000],
    ]) {
      const attempt = structuredClone(original);
      const body = JSON.parse(attempt.request.body);
      body.variables.after = `cursor-${operation}`;
      attempt.request.body = JSON.stringify(body);
      attempt.operationId = `episode-history-${operation}`;
      attempt.requestIndex = requestIndex;
      attempt.attemptIndex = 1;
      attempt.carriedAttempts = 0;
      attempt.requestSha256 = digest(attempt.request);
      attempt.requestedAtMs = start;
      attempt.completedAtMs = start + 1;
      attempt.operationDeadlineAtMs = operation === 1 ? 20000 : 40000;
      f.values.set(`acquisition-${operation}-${requestIndex}-1`, attempt);
      const row = { ...history[1], requestBody: attempt.request.body };
      if (operation === 1) history.push(row);
      else nextRows.push(row);
    }
    f.values.set('history-2.json', { rpcEvidence: nextRows });
    const completion = f.values.get('complete-source.json')!;
    completion.requests += 2;
    completion.responseBytes += 2 * new TextEncoder().encode(history[1].responseBody).length;
    const observer = await createGoalBundleContinuation().prepare(f.context);
    f.observe(observer);
    expect(() => observer.complete()).not.toThrow();
  });
  it('charges replayed pages, original failure and every retry against the operation8MiB limit', async () => {
    const f = await fixture(true);
    const rows = f.values.get('history-1.json')!.rpcEvidence;
    const large = ' '.repeat(2 * 1024 * 1024);
    const setBody = (value: Json, body: string) =>
      Object.assign(value, {
        bodyBase64: btoa(body),
        bytesRead: body.length,
        retainedBytes: body.length,
        bodySha256: sha(body),
      });
    setBody(f.values.get('acquisition-1-1-2')!.response, large.slice(rows[0].responseBody.length));
    setBody(f.values.get('acquisition-1-1-3')!.response, large);
    Object.assign(rows[1], { responseBody: large, responseSha256: sha(large), bytes: large.length });
    for (const requestIndex of [2, 3]) {
      const attempt = structuredClone(f.values.get('acquisition-1-1-3')!);
      const body = JSON.parse(attempt.request.body);
      body.variables.after = `cursor-${requestIndex}`;
      attempt.request.body = JSON.stringify(body);
      Object.assign(attempt, {
        requestIndex,
        attemptIndex: 1,
        carriedAttempts: 0,
        requestedAtMs: 14000 + requestIndex,
        completedAtMs: 14001 + requestIndex,
      });
      attempt.requestSha256 = digest(attempt.request);
      f.values.set(`acquisition-1-${requestIndex}-1`, attempt);
      rows.push({ ...rows[1], requestBody: attempt.request.body });
    }
    const completion = f.values.get('complete-source.json')!;
    completion.requests += 2;
    completion.responseBytes = f.logicalBytes - f.f.historyCalls[0].response.length + 3 * large.length;
    const observer = await createGoalBundleContinuation().prepare(f.context);
    f.observe(observer);
    expect(() => observer.complete()).toThrow('operation-response-budget');
  });
  it.each([
    'prefix-hash',
    'missing-use',
    'duplicate-sequence',
    'history-order',
    'market-order',
    'premature-boundary',
    'retry-body',
    'response-hash',
    'carried-reset',
    'retry-backoff',
    'composition-timeout',
    'incomplete-response',
    'orphan-attempt',
    'logical-count',
    'original-failure-budget',
  ])('rejects rehashed %s provenance and cannot later complete', async (kind) => {
    const f = await fixture(true);
    if (kind === 'prefix-hash') f.values.get('acquisition-prefix-market-0')!.responseSha256 = '0'.repeat(64);
    if (kind === 'missing-use') f.values.delete('acquisition-prefix-market-0');
    if (kind === 'duplicate-sequence') f.values.get('acquisition-prefix-market-1')!.sequence = 0;
    if (kind === 'history-order') f.values.get('history-1.json')!.rpcEvidence.reverse();
    if (kind === 'market-order') f.values.get('market-schema-1.json')!.evidence.blockEvidence.reverse();
    if (kind === 'premature-boundary') {
      const entries = [...f.values];
      f.values.clear();
      f.values.set('history-1.json', entries.find(([name]) => name === 'history-1.json')![1]);
      for (const [name, value] of entries) if (name !== 'history-1.json') f.values.set(name, value);
    }

    if (kind === 'retry-body') {
      const a = f.values.get('acquisition-1-1-3')!;
      a.request.body += ' ';
      a.requestSha256 = digest(a.request);
    }
    if (kind === 'response-hash') f.values.get('acquisition-1-1-3')!.response.bodySha256 = '0'.repeat(64);
    if (kind === 'carried-reset') f.values.get('acquisition-1-1-2')!.carriedAttempts = 0;
    if (kind === 'retry-backoff') f.values.get('acquisition-1-1-3')!.requestedAtMs--;
    if (kind === 'composition-timeout') f.values.get('acquisition-1-1-2')!.operationDeadlineAtMs = 30001;
    if (kind === 'incomplete-response') f.values.get('acquisition-1-1-3')!.response.complete = false;
    if (kind === 'orphan-attempt') f.values.delete('history-1.json');
    if (kind === 'logical-count') f.values.get('complete-source.json')!.requests++;
    if (kind === 'original-failure-budget')
      f.values.get('source.json')!.manifest.maximumResponseBytes = f.logicalBytes + 'bounded temporary outage'.length;
    const observer = await createGoalBundleContinuation().prepare(f.context);
    expect(() => {
      f.observe(observer);
      observer.complete();
    }).toThrow();
    expect(() => observer.complete()).toThrow();
  });
  it('rejects altered lineage before issuing child observer and honors caller abort', async () => {
    const f = await fixture();
    await expect(
      createGoalBundleContinuation().prepare({
        ...f.context,
        lineage: { ...f.context.lineage, parentSourceSha256: '0'.repeat(64) },
      })
    ).rejects.toThrow('binding-mismatch');
    const observer = await createGoalBundleContinuation().prepare(f.context);
    f.controller.abort();
    expect(() => f.observe(observer)).toThrow('closed-or-aborted');
  });
  it('rejects getters in observer input without invoking them', async () => {
    const f = await fixture(),
      observer = await createGoalBundleContinuation().prepare(f.context),
      getter = vi.fn();
    const value = Object.defineProperty({}, 'poison', { enumerable: true, get: getter });
    expect(() => observer.observeChild({ name: 'source.json', sha256: 'a'.repeat(64), bytes: 2 }, value)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('keeps original global30s preparation and explicit bundle per-artifact timeout distinct', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    const f = goalAcquisitionReplayFixture();
    let reads = 0;
    const readArtifact = async (name: string) => {
      reads++;
      await new Promise((r) => setTimeout(r, 1600));
      return f.readArtifact(name);
    };
    const local = prepareGoalAcquisitionReplay(f.input, { readArtifact });
    const rejected = expect(local).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(31000);
    await rejected;
    expect(reads).toBeLessThan(24);
    const distributed = prepareGoalAcquisitionReplayBundle(f.input, { readArtifact });
    await vi.advanceTimersByTimeAsync(50000);
    expect((await distributed).bindings.requestSha256).toBe(f.input.requestSha256);
  });
  it('aborts a hanging pinned artifact read even if its dependency ignores the signal', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    const f = goalAcquisitionReplayFixture();
    const result = prepareGoalAcquisitionReplayBundle(f.input, {
      readArtifact: async () => new Promise(() => undefined),
    });
    const rejected = expect(result).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(30001);
    await rejected;
  });
});

describe('ordinary recorded acquisition in every later episode', () => {
  it.each(['training', 'validation'] as const)(
    'verifies %s without inventing a parent-failure surcharge',
    async (phase) => {
      const f = await ordinaryFixture(phase),
        network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No network'));
      const observer = await createGoalBundleAcquisition().prepare({ request: f.request, signal: f.controller.signal });
      f.observe(observer);
      expect(() => observer.complete()).not.toThrow();
      expect(network).not.toHaveBeenCalled();
    }
  );
  it('counts a later successful retry against the same exact logical-plus-physical budget', async () => {
    const f = await ordinaryFixture('training', true);
    const observer = await createGoalBundleAcquisition().prepare({ request: f.request, signal: f.controller.signal });
    f.observe(observer);
    expect(() => observer.complete()).not.toThrow();
  });
  it.each(['missing-attempt', 'unexpected-carry', 'prefix-reuse', 'changed-episode', 'hidden-error-budget'])(
    'rejects %s in a later episode',
    async (kind) => {
      const f = await ordinaryFixture('validation', true);
      if (kind === 'missing-attempt') f.values.delete('acquisition-1-2-1');
      if (kind === 'unexpected-carry') f.values.get('acquisition-1-1-1')!.carriedAttempts = 1;
      if (kind === 'prefix-reuse') f.values.set('acquisition-prefix-market-0', { lane: 'market', sequence: 0 });
      if (kind === 'changed-episode') f.values.get('source.json')!.request.episodeIndex++;
      if (kind === 'hidden-error-budget') f.values.get('source.json')!.manifest.maximumHttpRequests--;
      const observer = await createGoalBundleAcquisition().prepare({ request: f.request, signal: f.controller.signal });
      expect(() => {
        f.observe(observer);
        observer.complete();
      }).toThrow();
      expect(() => observer.complete()).toThrow();
    }
  );
});
