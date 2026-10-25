import { describe, expect, it, vi } from 'vitest';
import {
  createPlaygroundHistoryLoader,
  readHistoryIdentity,
  waitForHistoryConnection,
} from '@/features/bot-trading/playground-history';
import type { PlaygroundSettings } from '@/features/bot-trading/playground';
import type { BotDefinition, BotHistory } from '@/features/bot-trading/types';
import type { BotHistoryOptions } from '@/features/bot-trading/history';
import { botFixture } from './fixtures';

const defaults = vi.hoisted(() => ({ api: { connection: null as unknown }, fetch: vi.fn() }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: defaults.api }));
vi.mock('@/features/bot-trading/history', () => ({ fetchBotHistory: defaults.fetch }));

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 8, 20, 8);

function completeHistory(startAt: number, endAt: number): BotHistory {
  return {
    candles: Array.from({ length: (endAt - startAt) / HOUR }, (_, index) => ({
      timestamp: startAt + (index + 1) * HOUR,
      close: '2.000000000000000001',
      feeClose: '1',
    })),
    missing: 0,
    denominationVerified: true,
  };
}

function harness() {
  let now = NOW;
  let key = 'chain:denomination-1';
  const assertCurrent = vi.fn();
  const identity = vi.fn(async () => ({ key, assertCurrent }));
  const fetch = vi.fn(async (_bot: BotDefinition, options: BotHistoryOptions) =>
    completeHistory(options.startAt!, options.endAt!)
  );
  const loader = createPlaygroundHistoryLoader({ identity, fetch, now: () => now });
  return {
    loader,
    fetch,
    identity,
    assertCurrent,
    settings: { days: 7 } as PlaygroundSettings,
    time: (value: number) => {
      now = value;
    },
    chain: (value: string) => {
      key = value;
    },
  };
}

function gapHarness() {
  const startAt = NOW - 3 * HOUR;
  const full = completeHistory(startAt, NOW);
  const bound = { genesisHash: 'genesis', denominator: '100' };
  full.identity = bound;
  const fetch = vi.fn(async () => structuredClone(full));
  const archive = vi.fn(
    async (): Promise<BotHistory> => ({
      ...structuredClone(full),
      provenance: {
        kind: 'archive-pool-spot',
        requestedStartAt: startAt,
        requestedEndAt: NOW,
        availableStartAt: startAt + HOUR,
        availableEndAt: NOW,
        generatedAt: NOW,
        archiveEndpoint: 'https://mof2.sora.org/',
      },
    })
  );
  const repair = vi.fn(
    async (): Promise<BotHistory> => ({
      candles: [],
      missing: 3,
      denominationVerified: false,
    })
  );
  const identity = vi.fn(async () => ({
    key: 'chain:100',
    genesisHash: bound.genesisHash,
    currentDenominator: bound.denominator,
    assertCurrent: vi.fn(),
  }));
  const loader = createPlaygroundHistoryLoader({ identity, fetch, archive, repair, now: () => NOW });
  const settings = { days: 7, historyStartAt: startAt, historyEndAt: NOW } as PlaygroundSettings;
  return { loader, fetch, archive, repair, identity, full, settings, startAt };
}

describe('finalized history identity timestamp', () => {
  /** Both metadata reads belong to one captured finalized state; the live query path is never needed. */
  function connection() {
    const hash = { toString: () => 'finalized-hash' };
    const denominator = vi.fn(async () => '1000');
    const timestamp = vi.fn(async (): Promise<unknown> => ({ toString: () => String(NOW) }));
    const state = { query: { denomination: { denominator }, timestamp: { now: timestamp } } };
    const chain = {
      isConnected: true,
      isReady: Promise.resolve(),
      genesisHash: { toString: () => 'genesis' },
      rpc: { chain: { getFinalizedHead: vi.fn(async () => hash) } },
      at: vi.fn(async () => state),
    };
    const current = { endpoint: 'wss://approved', api: chain };
    defaults.api.connection = current;
    return { hash, denominator, timestamp, state, chain, current };
  }

  it('reads time and denomination from exactly the same finalized state without changing the cache identity', async () => {
    const h = connection();
    const result = await readHistoryIdentity();
    expect(result).toMatchObject({
      key: JSON.stringify(['wss://approved', 'genesis', '1000']),
      genesisHash: 'genesis',
      currentDenominator: '1000',
      finalizedAt: NOW,
    });
    expect(h.chain.rpc.chain.getFinalizedHead).toHaveBeenCalledTimes(1);
    expect(h.chain.at).toHaveBeenCalledExactlyOnceWith(h.hash);
    expect(h.denominator).toHaveBeenCalledExactlyOnceWith();
    expect(h.timestamp).toHaveBeenCalledExactlyOnceWith();
    expect(h.denominator.mock.invocationCallOrder[0]).toBeLessThan(h.timestamp.mock.invocationCallOrder[0]);
    expect(() => result.assertCurrent()).not.toThrow();
  });

  it.each(['1', String(Number.MAX_SAFE_INTEGER)])(
    'exposes valid milliseconds %s without a shared freshness policy',
    async (raw) => {
      const h = connection();
      h.timestamp.mockResolvedValue({ toString: () => raw });
      await expect(readHistoryIdentity()).resolves.toMatchObject({ finalizedAt: Number(raw) });
    }
  );

  it.each(['0', '-1', '01', '1.5', '1e3', ' 1000', '1000 ', 'NaN', 'Infinity', '9007199254740992', '1'.repeat(17), ''])(
    'normalizes malformed timestamp %s to the stale message',
    async (raw) => {
      const h = connection();
      h.timestamp.mockResolvedValue({ toString: () => raw });
      await expect(readHistoryIdentity()).rejects.toEqual(new Error('bots.errors.stale'));
    }
  );

  it.each(['missing-pallet', 'missing-value', 'rpc-error', 'codec-error', 'nonstring-render'])(
    'does not expose RPC details when time is %s',
    async (fault) => {
      const h = connection();
      if (fault === 'missing-pallet') Reflect.deleteProperty(h.state.query, 'timestamp');
      if (fault === 'missing-value') h.timestamp.mockResolvedValue(undefined);
      if (fault === 'rpc-error') h.timestamp.mockRejectedValue(new Error('private RPC transport details'));
      if (fault === 'codec-error')
        h.timestamp.mockResolvedValue({
          toString: () => {
            throw new Error('private codec details');
          },
        });
      if (fault === 'nonstring-render') h.timestamp.mockResolvedValue({ toString: () => NOW });
      await expect(readHistoryIdentity()).rejects.toEqual(new Error('bots.errors.stale'));
    }
  );

  it.each(['connection', 'chain', 'endpoint', 'genesis', 'disconnect'])(
    'rejects a %s change while the finalized timestamp read is pending',
    async (change) => {
      const h = connection();
      let entered!: () => void;
      const reading = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      h.timestamp.mockImplementationOnce(async () => {
        entered();
        await pending;
        return { toString: () => String(NOW) };
      });
      const rejected = expect(readHistoryIdentity()).rejects.toEqual(new Error('bots.errors.stale'));
      await reading;
      if (change === 'connection') defaults.api.connection = { ...h.current };
      if (change === 'chain') h.current.api = { ...h.chain };
      if (change === 'endpoint') h.current.endpoint = 'wss://changed';
      if (change === 'genesis') h.chain.genesisHash = { toString: () => 'other-genesis' };
      if (change === 'disconnect') h.chain.isConnected = false;
      release();
      await rejected;
    }
  );
});

describe('playground historical cache', () => {
  it('prioritizes corrected older indexed pool observations across the entire selected range', async () => {
    const h = gapHarness();
    h.full.candles[0].close = '7';
    const result = await h.loader.load(botFixture(), h.settings);
    expect(result).toEqual(h.full);
    expect(result.provenance).toBeUndefined();
    expect(h.fetch).toHaveBeenCalledExactlyOnceWith(botFixture(), {
      interval: 'hour',
      startAt: h.startAt,
      endAt: NOW,
      basis: 'xor-pool',
    });
    expect(h.archive).not.toHaveBeenCalled();
    expect(h.repair).not.toHaveBeenCalled();
  });

  it('adds only archive gaps and never overwrites overlapping corrected indexed closes or fee marks', async () => {
    const h = gapHarness();
    const corrected = structuredClone(h.full);
    corrected.candles[0] = { ...corrected.candles[0], close: '7', feeClose: '3' };
    corrected.candles.splice(1, 1);
    corrected.missing = 1;
    h.fetch.mockResolvedValue(corrected);
    const result = await h.loader.load(botFixture(), h.settings);
    expect(result.candles).toEqual([corrected.candles[0], h.full.candles[1], corrected.candles[1]]);
    expect(result).toMatchObject({
      missing: 0,
      identity: h.full.identity,
      provenance: { kind: 'mixed-pool-spot-and-indexed', requestedStartAt: h.startAt, requestedEndAt: NOW },
    });
    expect(h.fetch.mock.invocationCallOrder[0]).toBeLessThan(h.archive.mock.invocationCallOrder[0]);
    expect(h.repair).not.toHaveBeenCalled();
  });

  it('retries an incomplete same-hour window immediately and sees a newly indexed close without reload', async () => {
    const h = gapHarness();
    const partial = { ...h.full, candles: h.full.candles.slice(0, 2), missing: 1 };
    h.fetch.mockResolvedValueOnce(partial);
    h.archive.mockRejectedValue(new Error('bundle unavailable'));
    expect(await h.loader.load(botFixture(), h.settings)).toMatchObject({ missing: 1 });
    expect(await h.loader.load(botFixture(), h.settings)).toEqual(h.full);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.repair).toHaveBeenCalledExactlyOnceWith(botFixture(), {
      startAt: h.startAt,
      endAt: NOW,
      timestamps: [NOW],
      genesisHash: 'genesis',
      currentDenominator: '100',
    });
  });

  it('queries the new completed-hour boundary even while the prior complete result remains cached', async () => {
    const h = harness();
    h.time(NOW + HOUR - 1);
    const first = await h.loader.load(botFixture(), h.settings);
    h.time(NOW + HOUR);
    const next = await h.loader.load(botFixture(), h.settings);
    expect(first.candles.at(-1)?.timestamp).toBe(NOW);
    expect(next.candles.at(-1)?.timestamp).toBe(NOW + HOUR);
    expect(next.missing).toBe(0);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.fetch).toHaveBeenLastCalledWith(botFixture(), {
      interval: 'hour',
      startAt: NOW + HOUR - 7 * 24 * HOUR,
      endAt: NOW + HOUR,
      basis: 'xor-pool',
    });
  });

  it.each(['duplicate', 'unaligned', 'out-of-range', 'missing-fee', 'zero-price'])(
    'rejects malformed indexed %s observations before any fallback can mask them',
    async (fault) => {
      const h = gapHarness();
      const candidate = structuredClone(h.full);
      if (fault === 'duplicate') candidate.candles[1] = { ...candidate.candles[0] };
      if (fault === 'unaligned') candidate.candles[1].timestamp++;
      if (fault === 'out-of-range') candidate.candles[2].timestamp += HOUR;
      if (fault === 'missing-fee') delete candidate.candles[1].feeClose;
      if (fault === 'zero-price') candidate.candles[1].close = '0';
      h.fetch.mockResolvedValue(candidate);
      await expect(h.loader.load(botFixture(), h.settings)).rejects.toThrow('bots.errors.history');
      expect(h.archive).not.toHaveBeenCalled();
      expect(h.repair).not.toHaveBeenCalled();
    }
  );

  it.each(['genesisHash', 'denominator'] as const)('rejects a mismatched fallback %s before merging', async (field) => {
    const h = gapHarness();
    h.fetch.mockResolvedValue({ ...h.full, candles: h.full.candles.slice(0, 1), missing: 2 });
    h.archive.mockResolvedValue({ ...h.full, identity: { ...h.full.identity!, [field]: 'other' } });
    await expect(h.loader.load(botFixture(), h.settings)).rejects.toThrow('bots.errors.stale');
    expect(h.repair).not.toHaveBeenCalled();
  });

  it('rejects an entire malformed archive source without retaining its earlier valid-looking additions', async () => {
    const h = gapHarness();
    const partial = { ...h.full, candles: h.full.candles.slice(0, 1), missing: 2 };
    h.fetch.mockResolvedValue(partial);
    const corrupt = structuredClone(h.full);
    corrupt.candles[2].feeClose = '0';
    h.archive.mockResolvedValue(corrupt);
    const result = await h.loader.load(botFixture(), h.settings);
    expect(result).toEqual(partial);
    expect(h.repair).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timestamps: [NOW - HOUR, NOW] })
    );
  });

  it('binds cached results and in-flight requests to exact currency metadata', async () => {
    const h = harness();
    const bot = botFixture();
    const original = structuredClone(bot);
    const pending = h.loader.load(bot, h.settings);
    bot.assetOut.symbol = 'changed';
    bot.assetOut.decimals = 6;
    await pending;
    expect(h.fetch.mock.calls[0][0].assetOut).toEqual(original.assetOut);
    await h.loader.load(bot, h.settings);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    bot.policy.feeAsset.symbol = 'changed-fee';
    await h.loader.load(bot, h.settings);
    expect(h.fetch).toHaveBeenCalledTimes(3);
  });
  it('waits for initial read-only chain readiness and bounds an unavailable connection', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'performance'] });
    try {
      defaults.api.connection = null;
      const waiting = waitForHistoryConnection(500);
      defaults.api.connection = {
        endpoint: 'wss://approved',
        api: { isConnected: true, genesisHash: { toString: () => 'genesis' } },
      };
      await vi.advanceTimersByTimeAsync(100);
      await expect(waiting).resolves.toMatchObject({ genesis: 'genesis', endpoint: 'wss://approved' });
      defaults.api.connection = null;
      const unavailable = expect(waitForHistoryConnection(500)).rejects.toThrow('bots.errors.stale');
      await vi.advanceTimersByTimeAsync(500);
      await unavailable;
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not touch a throwing genesis getter until ApiPromise metadata is ready', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'performance'] });
    try {
      let release!: () => void;
      let ready = false;
      const genesis = vi.fn(() => {
        if (!ready) throw new Error('ApiPromise has not been initialized');
        return { toString: () => 'genesis' };
      });
      const chain = {
        isConnected: true,
        isReady: new Promise<void>((resolveReady) => {
          release = resolveReady;
        }),
        get genesisHash() {
          return genesis();
        },
      };
      defaults.api.connection = { endpoint: 'wss://approved', api: chain };
      const waiting = waitForHistoryConnection(500);
      await vi.advanceTimersByTimeAsync(200);
      expect(genesis).not.toHaveBeenCalled();
      ready = true;
      release();
      const captured = await waiting;
      expect(captured.genesis).toBe('genesis');
      expect(captured.chain).toBe(chain);
      expect(genesis).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it.each(['replacement', 'endpoint', 'rejection', 'timeout'])(
    'bounds pending API readiness after %s and clears its timers',
    async (kind) => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'performance'] });
      try {
        let reject!: (error: Error) => void;
        const genesis = vi.fn(() => {
          throw new Error('getter accessed before ready');
        });
        const chain = {
          isConnected: true,
          isReady: new Promise<void>((_resolve, rejectReady) => {
            reject = rejectReady;
          }),
          get genesisHash() {
            return genesis();
          },
        };
        const connection = { endpoint: 'wss://approved', api: chain };
        defaults.api.connection = connection;
        const waiting = expect(waitForHistoryConnection(500)).rejects.toThrow('bots.errors.stale');
        if (kind === 'replacement') defaults.api.connection = { ...connection };
        if (kind === 'endpoint') connection.endpoint = 'wss://changed';
        if (kind === 'rejection') reject(new Error('metadata unavailable'));
        await vi.advanceTimersByTimeAsync(500);
        await waiting;
        expect(genesis).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    }
  );
  it('fills indexed gaps with bundled direct-pool observations after querying the whole range', async () => {
    const startAt = Date.UTC(2026, 2, 1);
    const endAt = startAt + 3 * 3_600_000;
    const assertCurrent = vi.fn();
    const identity = vi.fn(async () => ({
      key: 'bound-chain',
      genesisHash: 'genesis',
      currentDenominator: '100',
      assertCurrent,
    }));
    const archive = vi.fn(async () => ({
      candles: [
        { timestamp: startAt + 3_600_000, close: '2', feeClose: '1' },
        { timestamp: startAt + 7_200_000, close: '3', feeClose: '1' },
      ],
      missing: 1,
      denominationVerified: true,
      provenance: {
        kind: 'archive-pool-spot' as const,
        requestedStartAt: startAt,
        requestedEndAt: endAt,
        availableStartAt: startAt + 3_600_000,
        availableEndAt: startAt + 7_200_000,
        generatedAt: endAt,
        archiveEndpoint: 'https://mof2.sora.org/',
      },
    }));
    const fetch = vi.fn(async () => ({
      candles: [{ timestamp: endAt, close: '4', feeClose: '1' }],
      missing: 0,
      denominationVerified: true,
    }));
    const loader = createPlaygroundHistoryLoader({ identity, archive, fetch, now: () => endAt });
    const result = await loader.load(botFixture(), { days: 7, historyStartAt: startAt } as PlaygroundSettings);
    expect(result.candles.map((candle) => candle.close)).toEqual(['2', '3', '4']);
    expect(result.identity).toEqual({ genesisHash: 'genesis', denominator: '100' });
    expect(result).toMatchObject({
      missing: 0,
      provenance: { kind: 'mixed-pool-spot-and-indexed', availableEndAt: endAt },
    });
    expect(fetch).toHaveBeenCalledWith(botFixture(), { interval: 'hour', startAt, endAt, basis: 'xor-pool' });
    expect(archive).toHaveBeenCalledWith(botFixture(), {
      startAt,
      endAt,
      genesisHash: 'genesis',
      currentDenominator: '100',
    });
  });
  it('retains verified direct-pool archive coverage if the full-range indexer request is offline', async () => {
    const startAt = Date.UTC(2026, 2, 1);
    const endAt = startAt + 2 * 3_600_000;
    const loader = createPlaygroundHistoryLoader({
      identity: async () => ({
        key: 'bound',
        genesisHash: 'genesis',
        currentDenominator: '100',
        assertCurrent: () => undefined,
      }),
      archive: async () => ({
        candles: [{ timestamp: startAt + 3_600_000, close: '2', feeClose: '1' }],
        missing: 1,
        denominationVerified: true,
      }),
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
      now: () => endAt,
    });
    await expect(
      loader.load(botFixture(), { days: 7, historyStartAt: startAt } as PlaygroundSettings)
    ).resolves.toMatchObject({ missing: 1, denominationVerified: true });
  });
  it('repairs the four September indexer gaps with proved archive observations and preserves indexed closes', async () => {
    const hour = 3_600_000;
    const endAt = Date.UTC(2026, 8, 19, 3);
    const startAt = endAt - 90 * 24 * hour;
    const archiveEnd = Date.UTC(2026, 8, 14, 1);
    const gaps = [17, 19, 21, 22].map((time) => Date.UTC(2026, 8, 15, time));
    const candles = Array.from({ length: 2160 }, (_, index) => ({
      timestamp: startAt + (index + 1) * hour,
      close: '2.000000000000000001',
      feeClose: '1',
    }));
    const repair = vi.fn(async () => ({
      candles: candles.filter((candle) => gaps.includes(candle.timestamp)),
      denominationVerified: true,
      missing: 2156,
    }));
    const loader = createPlaygroundHistoryLoader({
      identity: async () => ({
        key: 'mainnet:denomination',
        genesisHash: 'genesis',
        currentDenominator: '100',
        assertCurrent: () => undefined,
      }),
      archive: async () => ({
        candles: candles.filter((candle) => candle.timestamp <= archiveEnd),
        denominationVerified: true,
        missing: (endAt - archiveEnd) / hour,
      }),
      fetch: async () => ({
        candles: candles.filter((candle) => candle.timestamp > archiveEnd && !gaps.includes(candle.timestamp)),
        denominationVerified: true,
        missing: gaps.length,
      }),
      repair,
      now: () => endAt,
    });
    const settings = { days: 90, historyStartAt: startAt, historyEndAt: endAt } as PlaygroundSettings;
    const result = await loader.load(botFixture(), settings);
    expect(result).toMatchObject({ candles, missing: 0, denominationVerified: true });
    expect(repair).toHaveBeenCalledExactlyOnceWith(botFixture(), {
      startAt,
      endAt,
      timestamps: gaps,
      genesisHash: 'genesis',
      currentDenominator: '100',
    });
    await loader.load(botFixture(), settings);
    expect(repair).toHaveBeenCalledTimes(1);
  });
  it.each(['unavailable', 'unverified', 'halted', 'outside-range', 'network-change'])(
    'does not invent observations when archive gap repair is %s',
    async (fault) => {
      const startAt = Date.UTC(2026, 8, 18);
      const endAt = startAt + 3 * 3_600_000;
      let current = true;
      const repair = vi.fn(async () => {
        if (fault === 'unavailable') throw new Error('archive offline');
        if (fault === 'network-change') current = false;
        return {
          candles:
            fault === 'halted'
              ? []
              : [{ timestamp: fault === 'outside-range' ? endAt + 3_600_000 : endAt, close: '3', feeClose: '1' }],
          missing: 2,
          denominationVerified: fault !== 'unverified',
        };
      });
      const candles = [{ timestamp: startAt + 3_600_000, close: '2', feeClose: '1' }];
      const loader = createPlaygroundHistoryLoader({
        identity: async () => ({
          key: 'bound',
          genesisHash: 'genesis',
          currentDenominator: '100',
          assertCurrent: () => {
            if (!current) throw new Error('bots.errors.stale');
          },
        }),
        fetch: async () => ({ candles, missing: 2, denominationVerified: true }),
        repair,
        now: () => endAt,
      });
      const result = loader.load(botFixture(), { days: 1, historyStartAt: startAt } as PlaygroundSettings);
      if (fault === 'network-change') await expect(result).rejects.toThrow('bots.errors.stale');
      else await expect(result).resolves.toMatchObject({ candles, missing: 2, denominationVerified: true });
    }
  );
  it('bounds archive repairs and skips complete histories', async () => {
    const startAt = Date.UTC(2026, 8, 18);
    const repair = vi.fn();
    const loader = createPlaygroundHistoryLoader({
      identity: async () => ({
        key: 'bound',
        genesisHash: 'genesis',
        currentDenominator: '100',
        assertCurrent: () => undefined,
      }),
      fetch: async () => ({
        candles: [{ timestamp: startAt + 3_600_000, close: '2', feeClose: '1' }],
        missing: 25,
        denominationVerified: true,
      }),
      repair,
      now: () => startAt + 26 * 3_600_000,
    });
    await loader.load(botFixture(), { days: 1, historyStartAt: startAt } as PlaygroundSettings);
    await loader.load(botFixture(), {
      days: 1,
      historyStartAt: startAt,
      historyEndAt: startAt + 3_600_000,
    } as PlaygroundSettings);
    expect(repair).not.toHaveBeenCalled();
  });
  it('binds the production loader to finalized denomination and rejects a changed RPC connection', async () => {
    const denominator = vi.fn(async () => '1000');
    const chain = {
      isConnected: true,
      genesisHash: { toString: () => 'genesis' },
      rpc: { chain: { getFinalizedHead: vi.fn(async () => 'finalized') } },
      at: vi.fn(async () => ({
        query: { denomination: { denominator }, timestamp: { now: async () => String(NOW) } },
      })),
    };
    const connection = { endpoint: 'wss://approved', api: chain };
    defaults.api.connection = connection;
    defaults.fetch.mockImplementation(async (_bot: BotDefinition, options: BotHistoryOptions) =>
      completeHistory(options.startAt!, options.endAt!)
    );
    const loader = createPlaygroundHistoryLoader();
    await expect(loader.load(botFixture(), { days: 7 } as PlaygroundSettings)).resolves.toMatchObject({
      denominationVerified: true,
    });
    expect(chain.rpc.chain.getFinalizedHead).toHaveBeenCalled();
    denominator.mockImplementationOnce(async () => {
      connection.endpoint = 'wss://changed';
      return '1000';
    });
    await expect(loader.load(botFixture(), { days: 7 } as PlaygroundSettings)).rejects.toThrow('bots.errors.stale');
    denominator.mockResolvedValueOnce('01');
    await expect(loader.load(botFixture(), { days: 7 } as PlaygroundSettings)).rejects.toThrow(
      'bots.errors.denomination'
    );
  });
  it('rechecks identity while reusing exact candles for strategy changes and isolates caller mutations', async () => {
    const h = harness();
    const first = await h.loader.load(botFixture(), h.settings);
    first.candles[0].close = '999';
    const second = await h.loader.load(
      { ...botFixture(), strategy: { ...botFixture().strategy, kind: 'sma' } },
      h.settings
    );
    expect(second.candles[0].close).toBe('2.000000000000000001');
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.identity).toHaveBeenCalledTimes(3);
  });
  it('invalidates on denomination, window, bucket, and cache expiry', async () => {
    const h = harness();
    await h.loader.load(botFixture(), h.settings);
    h.chain('chain:denomination-1000');
    await h.loader.load(botFixture(), h.settings);
    await h.loader.load(botFixture(), { ...h.settings, days: 30 });
    h.time(NOW + 60_001);
    await h.loader.load(botFixture(), h.settings);
    h.time(NOW + HOUR);
    await h.loader.load(botFixture(), h.settings);
    expect(h.fetch).toHaveBeenCalledTimes(5);
  });
  it('rejects unverified or failed historical loads without supplying synthetic results', async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce({ candles: [], missing: 24, denominationVerified: false });
    await expect(h.loader.load(botFixture(), h.settings)).rejects.toThrow('bots.errors.denomination');
    h.fetch.mockRejectedValueOnce(new Error('offline'));
    await expect(h.loader.load(botFixture(), h.settings)).rejects.toThrow('offline');
  });
  it('passes exact March boundaries and only reuses cache entries for the same completed range', async () => {
    const h = harness();
    const startAt = Date.UTC(2026, 2, 1);
    const endAt = Date.UTC(2026, 2, 3);
    h.time(endAt + 1_800_000);
    const settings = { ...h.settings, historyStartAt: startAt };
    await h.loader.load(botFixture(), settings);
    await h.loader.load(botFixture(), { ...settings, days: 90 });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.fetch).toHaveBeenCalledWith(botFixture(), { interval: 'hour', startAt, endAt, basis: 'xor-pool' });
    await h.loader.load(botFixture(), { ...settings, historyEndAt: endAt - 3_600_000 });
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.fetch).toHaveBeenLastCalledWith(botFixture(), {
      interval: 'hour',
      startAt,
      endAt: endAt - 3_600_000,
      basis: 'xor-pool',
    });
    h.time(endAt + 3_600_000);
    await h.loader.load(botFixture(), settings);
    expect(h.fetch).toHaveBeenCalledTimes(3);
    expect(h.fetch).toHaveBeenLastCalledWith(botFixture(), {
      interval: 'hour',
      startAt,
      endAt: endAt + 3_600_000,
      basis: 'xor-pool',
    });
  });
  it('reports the actual available range instead of presenting September prices as a March study', async () => {
    const h = harness();
    const startAt = Date.UTC(2026, 2, 1);
    const endAt = Date.UTC(2026, 8, 14);
    const availableStartAt = Date.UTC(2026, 8, 6, 1);
    h.time(endAt);
    h.fetch.mockResolvedValue({
      candles: [
        { timestamp: availableStartAt, close: '2', feeClose: '1' },
        { timestamp: endAt, close: '3', feeClose: '1' },
      ],
      missing: 4726,
      denominationVerified: true,
    });
    const settings = { ...h.settings, historyStartAt: startAt };
    const result = await h.loader.load(botFixture(), settings);
    expect(result.candles.map((candle) => candle.timestamp)).toEqual([availableStartAt, endAt]);
    expect(result.missing).toBe((endAt - startAt) / 3_600_000 - 2);
    expect(result.denominationVerified).toBe(true);
    expect(await h.loader.load(botFixture(), settings)).toEqual(result);
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });
  it('keeps separate fixed starts distinct and rejects invalid dates before using cached data', async () => {
    const h = harness();
    const startAt = Date.UTC(2026, 2, 1);
    h.time(Date.UTC(2026, 2, 3));
    h.fetch.mockResolvedValue({
      candles: [{ timestamp: startAt + 3_600_000, close: '2', feeClose: '1' }],
      missing: 47,
      denominationVerified: true,
    });
    await h.loader.load(botFixture(), { ...h.settings, historyStartAt: startAt });
    h.fetch.mockResolvedValueOnce({
      candles: [{ timestamp: startAt + 7_200_000, close: '2', feeClose: '1' }],
      missing: 46,
      denominationVerified: true,
    });
    await h.loader.load(botFixture(), { ...h.settings, historyStartAt: startAt + 3_600_000 });
    expect(h.fetch).toHaveBeenCalledTimes(2);
    await expect(h.loader.load(botFixture(), { ...h.settings, historyStartAt: startAt + 0.5 })).rejects.toThrow(
      'bots.errors.history'
    );
    await expect(
      h.loader.load(botFixture(), { ...h.settings, historyStartAt: startAt, historyEndAt: NaN })
    ).rejects.toThrow('bots.errors.history');
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });
  it('discards pending history after disposal or a denomination change', async () => {
    const h = harness();
    let release!: () => void;
    h.fetch.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return completeHistory(NOW - 7 * 24 * HOUR, NOW);
    });
    const pending = h.loader.load(botFixture(), h.settings);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    h.loader.clear();
    release();
    await expect(pending).rejects.toThrow('bots.errors.stale');
    h.identity.mockImplementationOnce(async () => ({ key: 'before', assertCurrent: h.assertCurrent }));
    await expect(h.loader.load(botFixture(), h.settings)).rejects.toThrow('bots.errors.stale');
  });
});
