import { describe, expect, it, vi } from 'vitest';
import {
  assertStudyEndpoint,
  createStudyTransport,
} from '../../../../output/go-history/earlier-goal-study-20260921/study-transport.mts';

const URL = 'https://mof2.sora.org/';
function fixture(maximumStarts = 10) {
  let clock = 0;
  const invoked: number[] = [];
  const fetcher = vi.fn(async () => {
    invoked.push(clock);
    return new Response('{}');
  });
  const controller = new AbortController();
  const timing = {
    now: () => clock,
    wait: async (ms: number) => {
      clock += ms;
    },
  };
  const transport = createStudyTransport(fetcher, { maximumStarts, minimumIntervalMs: 125 }, controller.signal, timing);
  return { ...transport, fetcher, controller, timing, invoked };
}

describe('fixed earlier-study physical transport', () => {
  it('limits endpoints to the reviewed archive and indexer', () => {
    expect(() => assertStudyEndpoint(URL)).not.toThrow();
    expect(() => assertStudyEndpoint('https://pi.soramitsu.io/graphql')).not.toThrow();
    for (const value of [
      'http://mof2.sora.org/',
      'https://mof2.sora.org/other',
      'https://other.invalid/',
      'https://pi.soramitsu.io/graphql?x=1',
    ])
      expect(() => assertStudyEndpoint(value)).toThrow('endpoint');
  });
  it('spaces parallel callers rather than releasing the whole waiting batch together', async () => {
    const f = fixture();
    await Promise.all(Array.from({ length: 5 }, () => f.fetch(URL)));
    expect(f.invoked).toEqual([0, 125, 250, 375, 500]);
    expect(f.starts()).toBe(5);
  });
  it('enforces one shared physical budget across concurrent callers', async () => {
    const f = fixture(2);
    const results = await Promise.allSettled([f.fetch(URL), f.fetch(URL), f.fetch(URL)]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'rejected']);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.starts()).toBe(2);
  });
  it('does not issue a request after cancellation before the first start', async () => {
    const f = fixture();
    f.controller.abort();
    await expect(f.fetch(URL)).rejects.toThrow('aborted');
    expect(f.starts()).toBe(0);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('rechecks cancellation after waiting for a reserved start', async () => {
    const f = fixture();
    await f.fetch(URL);
    f.timing.wait = async () => {
      f.controller.abort();
    };
    await expect(f.fetch(URL)).rejects.toThrow('aborted');
    expect(f.starts()).toBe(1);
  });
  it('combines request cancellation with the runner lifetime', async () => {
    const runner = new AbortController();
    const request = new AbortController();
    let actual: AbortSignal | undefined;
    const fetcher: typeof fetch = async (_url, init) => {
      actual = init!.signal!;
      return new Response('{}');
    };
    const t = createStudyTransport(fetcher, { maximumStarts: 1, minimumIntervalMs: 125 }, runner.signal);
    await t.fetch(URL, { signal: request.signal });
    expect(actual!.aborted).toBe(false);
    request.abort();
    expect(actual!.aborted).toBe(true);
  });
  it('does not wait for one response before starting the next correctly spaced request', async () => {
    const runner = new AbortController();
    let clock = 0;
    let release!: (r: Response) => void;
    const starts: number[] = [];
    const fetcher: typeof fetch = (_url, _init) => {
      starts.push(clock);
      return starts.length === 1
        ? new Promise((r) => {
            release = r;
          })
        : Promise.resolve(new Response('{}'));
    };
    const t = createStudyTransport(fetcher, { maximumStarts: 2, minimumIntervalMs: 125 }, runner.signal, {
      now: () => clock,
      wait: async (ms) => {
        clock += ms;
      },
    });
    const pending = t.fetch(URL);
    await t.fetch(URL);
    expect(starts).toEqual([0, 125]);
    release(new Response('{}'));
    await pending;
  });
  it('counts failures without retrying or stranding subsequent callers', async () => {
    const runner = new AbortController();
    let clock = 0;
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(new Response('{}'));
    const t = createStudyTransport(fetcher, { maximumStarts: 2, minimumIntervalMs: 125 }, runner.signal, {
      now: () => clock,
      wait: async (ms) => {
        clock += ms;
      },
    });
    await expect(t.fetch(URL)).rejects.toThrow('offline');
    await t.fetch(URL);
    expect(t.starts()).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects weakened or malformed acquisition limits before I/O', () => {
    const signal = new AbortController().signal;
    const fetcher = vi.fn();
    for (const maximumStarts of [0, -1, 40001, 0.5, NaN])
      expect(() => createStudyTransport(fetcher, { maximumStarts, minimumIntervalMs: 125 }, signal)).toThrow(
        'request-limit'
      );
    for (const minimumIntervalMs of [0, 124, 125.5, NaN])
      expect(() => createStudyTransport(fetcher, { maximumStarts: 1, minimumIntervalMs }, signal)).toThrow(
        'request-spacing'
      );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
