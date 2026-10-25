// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalAcquisitionEpisodeFetch,
  type GoalAcquisitionEpisodeFetchOptions,
} from '../../../../scripts/bots/goal-acquisition-episode-fetch';
import {
  prepareGoalAcquisitionReplay,
  assertGoalAcquisitionReplayCompletion,
} from '../../../../scripts/bots/goal-acquisition-replay';
import type { GoalAcquisitionAttempt } from '../../../../scripts/bots/goal-acquisition-transport';
import { acquisitionCanonical, acquisitionSha, goalAcquisitionReplayFixture } from './goal-acquisition-replay-fixture';

const START = Date.UTC(2026, 8, 21);
const RPC = 'https://mof2.sora.org/';
const HISTORY = 'https://pi.soramitsu.io/graphql';
const init = (body: string, signal: AbortSignal): RequestInit => ({
  method: 'POST',
  body,
  signal,
  headers: { 'content-type': 'application/json' },
  redirect: 'error',
  credentials: 'omit',
});
const rpc = (id = 1) => JSON.stringify({ jsonrpc: '2.0', id, method: 'chain_getHeader', params: [] });
function history(body: string, cursor: string) {
  const parsed = JSON.parse(body);
  parsed.variables.after = cursor;
  return JSON.stringify(parsed);
}
async function setup(prepared = true, changes: Partial<GoalAcquisitionEpisodeFetchOptions> = {}) {
  const f = goalAcquisitionReplayFixture();
  const preparation = prepared
    ? await prepareGoalAcquisitionReplay(f.input, { readArtifact: f.readArtifact })
    : undefined;
  const controller = new AbortController(),
    operation = new AbortController();
  const fetcher = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response('{}'));
  const market = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response('{"cached":true}'));
  const retained: Array<{ name: string; value: unknown }> = [];
  const retain = vi.fn(async (name: string, value: unknown) => {
    retained.push({ name, value });
    const body = acquisitionCanonical(value);
    return { sha256: acquisitionSha(body), bytes: Buffer.byteLength(body) };
  });
  const options = {
    ...(preparation ? { preparation } : {}),
    fetch: fetcher as typeof fetch,
    marketFetch: market as typeof fetch,
    sink: { retainEvidence: retain },
    signal: controller.signal,
    maximumHttpRequests: 10000,
    maximumResponseBytes: 256 * 1024 * 1024,
    timeoutMs: 20000,
    ...changes,
  };
  const episode = createGoalAcquisitionEpisodeFetch(options);
  return { ...f, preparation, controller, operation, fetcher, market, retained, retain, options, episode };
}
async function prefix(f: Awaited<ReturnType<typeof setup>>) {
  for (const c of f.marketCalls)
    expect(await (await f.episode.marketFetch(c.url, init(c.body, f.operation.signal))).text()).toBe(c.response);
  for (const c of f.historyCalls)
    expect(await (await f.episode.fetch(c.url, init(c.body, f.operation.signal))).text()).toBe(c.response);
}
async function recover(f: Awaited<ReturnType<typeof setup>>) {
  const pending = f.episode.fetch(f.failedCall.url, init(f.failedCall.body, f.operation.signal));
  await vi.advanceTimersByTimeAsync(1000);
  const response = await pending;
  await response.text();
  return response;
}
const attempts = (f: Awaited<ReturnType<typeof setup>>) =>
  f.retained
    .map((r) => r.value)
    .filter((v): v is GoalAcquisitionAttempt => (v as GoalAcquisitionAttempt).kind === 'goal-acquisition-attempt-v1');
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('owned acquisition episode fetch composition', () => {
  it('replays both prefixes without upstream, charges original failure once and captures owned completion before clean abort', async () => {
    const f = await setup();
    await prefix(f);
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.market).not.toHaveBeenCalled();
    expect(f.episode.counts()).toMatchObject({
      requests: 17,
      replayRequests: 16,
      responseBytes: f.preparation!.inspection.responseBytes,
    });
    expect(() => f.episode.completion()).toThrow('no-completed-prefix');
    await recover(f);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(attempts(f).map((a) => [a.attemptIndex, a.carriedAttempts])).toEqual([[2, 1]]);
    expect(f.episode.counts()).toMatchObject({
      requests: 18,
      replayRequests: 16,
      historyPhysicalStarts: 1,
      responseBytes: f.preparation!.inspection.responseBytes + 2,
    });
    const proof = f.episode.completion();
    assertGoalAcquisitionReplayCompletion(proof, f.preparation!.bindings);
    f.controller.abort();
    f.episode.dispose();
    expect(f.episode.completion()).toBe(proof);
  });
  it('switches both lanes only after the boundary body is consumed and counts later ordinary/metadata responses once', async () => {
    const f = await setup();
    await prefix(f);
    await recover(f);
    expect(await (await f.episode.marketFetch(RPC, init(rpc(9), f.operation.signal))).text()).toBe('{"cached":true}');
    expect(await (await f.episode.fetch(RPC, init(rpc(10), f.operation.signal))).text()).toBe('{}');
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.market).toHaveBeenCalledTimes(1);
    expect(f.episode.counts()).toMatchObject({
      requests: 20,
      ordinaryRpcStarts: 1,
      responseBytes: f.preparation!.inspection.responseBytes + 4 + Buffer.byteLength('{"cached":true}'),
    });
  });
  it('never falls through on divergent replay and cannot acquire before the other lane is exhausted', async () => {
    const f = await setup();
    for (const c of f.historyCalls) await (await f.episode.fetch(c.url, init(c.body, f.operation.signal))).text();
    await expect(f.episode.fetch(f.failedCall.url, init(f.failedCall.body, f.operation.signal))).rejects.toThrow(
      'prefix-not-drained'
    );
    await expect(f.episode.marketFetch(RPC, init(f.marketCalls[0].body, f.operation.signal))).rejects.toThrow(
      'aborted'
    );
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.market).not.toHaveBeenCalled();
  });
  it('preserves carried failure cap and charges extra retry request plus every returned/error byte', async () => {
    const f = await setup();
    await prefix(f);
    f.fetcher.mockResolvedValueOnce(new Response('bad', { status: 502 })).mockResolvedValueOnce(new Response('ok'));
    const pending = f.episode.fetch(f.failedCall.url, init(f.failedCall.body, f.operation.signal));
    await vi.advanceTimersByTimeAsync(4000);
    expect(await (await pending).text()).toBe('ok');
    expect(attempts(f).map((a) => [a.attemptIndex, a.carriedAttempts])).toEqual([
      [2, 1],
      [3, 1],
    ]);
    expect(f.episode.counts()).toMatchObject({
      requests: 19,
      responseBytes: f.preparation!.inspection.responseBytes + 5,
      historyPhysicalStarts: 2,
    });
  });
  it('charges a later cursor its normal three-attempt allowance without resetting the carried failed request', async () => {
    const f = await setup();
    await prefix(f);
    await recover(f);
    f.fetcher
      .mockResolvedValueOnce(new Response('x', { status: 502 }))
      .mockResolvedValueOnce(new Response('y', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}'));
    const pending = f.episode.fetch(HISTORY, init(history(f.failedCall.body, 'next'), f.operation.signal));
    await vi.advanceTimersByTimeAsync(4000);
    await (await pending).text();
    expect(
      attempts(f)
        .slice(1)
        .map((a) => [a.attemptIndex, a.carriedAttempts])
    ).toEqual([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(f.episode.counts()).toMatchObject({ requests: 21, historyPhysicalStarts: 4, historyOperations: 1 });
  });
  it('stops before a retry start when the old failed request has consumed the remaining request budget', async () => {
    const f = await setup(true, { maximumHttpRequests: 18 });
    await prefix(f);
    f.fetcher.mockResolvedValueOnce(new Response('bad', { status: 502 }));
    const pending = f.episode.fetch(f.failedCall.url, init(f.failedCall.body, f.operation.signal));
    const rejected = expect(pending).rejects.toMatchObject({ reason: 'budget-failed' });
    await vi.advanceTimersByTimeAsync(4000);
    await rejected;
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.episode.counts().requests).toBe(18);
    expect(() => f.episode.completion()).toThrow();
  });
  it('includes retry error bytes in the global cap and releases no oversized response', async () => {
    const f = await setup(false, { maximumResponseBytes: 4 });
    f.fetcher.mockResolvedValueOnce(new Response('bad', { status: 502 })).mockResolvedValueOnce(new Response('ok'));
    const pending = f.episode.fetch(HISTORY, init(f.failedCall.body, f.operation.signal));
    const rejected = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(f.episode.counts().responseBytes).toBe(5);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it('shares the original20s history deadline across replay and live pages', async () => {
    const f = await setup();
    await prefix(f);
    vi.setSystemTime(START + 18000);
    await recover(f);
    expect(attempts(f)[0].operationDeadlineAtMs).toBe(START + 20000);
    vi.setSystemTime(START + 20000);
    await expect(
      f.episode.fetch(HISTORY, init(history(f.failedCall.body, 'next'), f.operation.signal))
    ).rejects.toThrow('operation-deadline');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('limits history pages to8 across replay and fresh requests on the original operation signal', async () => {
    const f = await setup();
    await prefix(f);
    await recover(f);
    for (let n = 0; n < 6; n++)
      await (await f.episode.fetch(HISTORY, init(history(f.failedCall.body, String(n)), f.operation.signal))).text();
    await expect(
      f.episode.fetch(HISTORY, init(history(f.failedCall.body, 'overflow'), f.operation.signal))
    ).rejects.toThrow('operation-pages');
    expect(f.fetcher).toHaveBeenCalledTimes(7);
  });
  it('includes retained failure, replayed page and every new error/success in one8MiB operation cap', async () => {
    const f = await setup();
    await prefix(f);
    await recover(f);
    const max = 2 * 1024 * 1024;
    f.fetcher
      .mockResolvedValueOnce(new Response('a'.repeat(max), { status: 502 }))
      .mockResolvedValueOnce(new Response('b'.repeat(max), { status: 503 }))
      .mockResolvedValueOnce(new Response('c'.repeat(max)));
    const pending = f.episode.fetch(HISTORY, init(history(f.failedCall.body, 'large'), f.operation.signal));
    await vi.advanceTimersByTimeAsync(4000);
    await (await pending).text();
    const originalOperationBytes =
      Buffer.byteLength(f.historyCalls[0].response) + Buffer.byteLength(f.failedCall.response) + 2;
    f.fetcher.mockResolvedValueOnce(new Response('d'.repeat(max - originalOperationBytes + 1)));
    await expect(
      f.episode.fetch(HISTORY, init(history(f.failedCall.body, 'over'), f.operation.signal))
    ).rejects.toMatchObject({ reason: 'budget-failed' });
    expect(f.fetcher).toHaveBeenCalledTimes(5);
    expect(f.episode.counts().responseBytes).toBe(
      f.preparation!.inspection.responseBytes + 2 + 4 * max - originalOperationBytes + 1
    );
  });
  it('a new episode uses the same fixed retry budget without claiming prefix completion', async () => {
    const f = await setup(false);
    f.fetcher.mockResolvedValueOnce(new Response('x', { status: 502 })).mockResolvedValueOnce(new Response('{}'));
    const pending = f.episode.fetch(HISTORY, init(f.failedCall.body, f.operation.signal));
    await vi.advanceTimersByTimeAsync(1000);
    await (await pending).text();
    expect(f.episode.counts()).toMatchObject({
      requests: 2,
      responseBytes: 3,
      replayRequests: 0,
      historyPhysicalStarts: 2,
    });
    expect(() => f.episode.completion()).toThrow('no-completed-prefix');
  });
  it('separate reader signals declare separate bounded history operations', async () => {
    const f = await setup(false);
    await (await f.episode.fetch(HISTORY, init(f.failedCall.body, f.operation.signal))).text();
    const next = new AbortController();
    vi.setSystemTime(START + 1000);
    await (await f.episode.fetch(HISTORY, init(f.failedCall.body, next.signal))).text();
    expect(attempts(f).map((a) => a.operationDeadlineAtMs)).toEqual([START + 20000, START + 21000]);
    expect(f.episode.counts().historyOperations).toBe(2);
  });
  it('requires durable matching retention before response or further I/O', async () => {
    const f = await setup();
    f.retain.mockResolvedValueOnce({ sha256: '0'.repeat(64), bytes: 0 });
    await expect(f.episode.marketFetch(RPC, init(f.marketCalls[0].body, f.operation.signal))).rejects.toThrow(
      'retention'
    );
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.market).not.toHaveBeenCalled();
  });
  it('rejects overlapping requests while a body remains unread and never produces completion', async () => {
    const f = await setup();
    const c = f.marketCalls[0];
    const response = await f.episode.marketFetch(c.url, init(c.body, f.operation.signal));
    await expect(f.episode.marketFetch(c.url, init(c.body, f.operation.signal))).rejects.toThrow('concurrent-request');
    await expect(response.text()).rejects.toThrow();
    expect(() => f.episode.completion()).toThrow();
  });
  it('cancellation during carried backoff starts no physical request', async () => {
    const f = await setup();
    await prefix(f);
    const pending = f.episode.fetch(f.failedCall.url, init(f.failedCall.body, f.operation.signal));
    const rejected = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    f.controller.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(() => f.episode.completion()).toThrow();
  });
  it('counts only observed ordinary RPC bytes and rejects an over-limit body', async () => {
    const f = await setup(false, { maximumResponseBytes: 3 });
    f.fetcher.mockResolvedValueOnce(new Response('1234'));
    const response = await f.episode.fetch(RPC, init(rpc(), f.operation.signal));
    await expect(response.text()).rejects.toThrow('response-budget');
    expect(f.episode.counts().responseBytes).toBe(4);
  });
  it.each([
    { maximumHttpRequests: 0 },
    { maximumHttpRequests: 10001 },
    { maximumResponseBytes: 0 },
    { maximumResponseBytes: 256 * 1024 * 1024 + 1 },
    { timeoutMs: 999 },
    { timeoutMs: 30001 },
  ])('rejects invalid declared limits before I/O: %j', async (changes) => {
    await expect(setup(false, changes)).rejects.toThrow('limits');
  });
  it('rejects JSON-copied preparation and insufficient carried byte budget', async () => {
    const f = await setup();
    expect(() =>
      createGoalAcquisitionEpisodeFetch({ ...f.options, preparation: JSON.parse(JSON.stringify(f.preparation)) })
    ).toThrow('unowned-preparation');
    const other = goalAcquisitionReplayFixture();
    const preparation = await prepareGoalAcquisitionReplay(other.input, { readArtifact: other.readArtifact });
    expect(() => createGoalAcquisitionEpisodeFetch({ ...f.options, preparation, maximumResponseBytes: 1 })).toThrow(
      'initial-budget'
    );
  });
  it('rejects write RPC methods and unapproved endpoints before either upstream', async () => {
    const f = await setup(false);
    await expect(
      f.episode.fetch(
        RPC,
        init(
          JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'author_submitExtrinsic', params: [] }),
          f.operation.signal
        )
      )
    ).rejects.toThrow('rpc-method');
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.market).not.toHaveBeenCalled();
    const g = await setup(false);
    await expect(g.episode.fetch('https://invalid.example/', init(rpc(), g.operation.signal))).rejects.toThrow(
      'endpoint'
    );
    expect(g.fetcher).not.toHaveBeenCalled();
  });
});
