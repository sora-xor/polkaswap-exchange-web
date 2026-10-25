/** Bounded physical request starts for the fixed offline study; no retries or fallback endpoints. */
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`Earlier study: ${reason}`);
}
/** Only the approved archive and public indexer can receive requests from this runner. */
export function assertStudyEndpoint(value: string): void {
  check(['https://mof2.sora.org/', 'https://pi.soramitsu.io/graphql'].includes(value), 'endpoint');
}
/** Serialize starts, including parallel callers, while allowing response bodies to finish independently. */
export function createStudyTransport(
  fetcher: typeof fetch,
  policy: { maximumStarts: number; minimumIntervalMs: number },
  signal: AbortSignal,
  timing = { now: () => Date.now(), wait: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) }
) {
  check(
    Number.isSafeInteger(policy.maximumStarts) && policy.maximumStarts > 0 && policy.maximumStarts <= 40000,
    'request-limit'
  );
  check(Number.isSafeInteger(policy.minimumIntervalMs) && policy.minimumIntervalMs >= 125, 'request-spacing');
  let starts = 0;
  let lastStart = -Infinity;
  let queue = Promise.resolve();
  const fetch: typeof globalThis.fetch = async (url, init) => {
    assertStudyEndpoint(String(url));
    const turn = queue.then(async () => {
      check(!signal.aborted && !init?.signal?.aborted, 'aborted');
      check(starts < policy.maximumStarts, 'request-limit');
      const remaining = policy.minimumIntervalMs - (timing.now() - lastStart);
      if (remaining > 0) await timing.wait(remaining);
      check(!signal.aborted && !init?.signal?.aborted, 'aborted');
      starts++;
      lastStart = timing.now();
    });
    queue = turn.catch(() => undefined);
    await turn;
    return fetcher(url, { ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal });
  };
  return { fetch, starts: () => starts };
}
