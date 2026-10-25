import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchIndexedBotHistoryWithEvidence } from '@/features/bot-trading/history';
import { api } from '@/lib/soraneo-wallet/src/api';
import { createExplorerClient } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/client';
import { botFixture } from './fixtures';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  query: vi.fn(),
  at: vi.fn(),
  finalized: vi.fn(),
  denominator: vi.fn(),
  indexer: { type: 'polkaswap', services: { explorer: { fetchEntities: vi.fn(), initClient: vi.fn(), client: {} } } },
}));
const XOR = {
  address: '0x0200000000000000000000000000000000000000000000000000000000000000',
  symbol: 'XOR',
  decimals: 18,
};
const KUSD = { address: `0x${'c'.repeat(64)}`, symbol: 'KUSD', decimals: 6 };
const GENESIS = `0x${'a'.repeat(64)}`;
const HOUR = 3_600_000;
const END = Date.UTC(2026, 8, 13, 12);
const OPTIONS = { startAt: END - HOUR, endAt: END };
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  // Production recreates the descriptor, while retaining its explorer service.
  getCurrentIndexer: () => ({ ...mocks.indexer, services: { ...mocks.indexer.services } }),
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      endpoint: 'wss://fixture',
      api: {
        isConnected: true,
        genesisHash: { toString: () => `0x${'a'.repeat(64)}` },
        at: mocks.at,
        rpc: { chain: { getFinalizedHead: mocks.finalized } },
      },
    },
  },
}));
const initialConnection = api.connection!;
const initialChain = initialConnection.api!;

function bot() {
  return {
    ...botFixture(),
    assetIn: { ...KUSD },
    assetOut: { ...XOR },
    policy: { ...botFixture().policy, feeAsset: { ...XOR } },
  };
}

function row(asset: typeof XOR, completedAt = END, height = 100) {
  return {
    timestamp: completedAt / 1000 - 10,
    denominator: '100',
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: completedAt / 1000,
      timestamp: completedAt / 1000 - 10,
      blockHeight: height,
      nextBlockHeight: height + 1,
      blockHash: `0x${height.toString(16).padStart(64, '0')}`,
      nextBlockHash: `0x${(height + 1).toString(16).padStart(64, '0')}`,
      nextTimestamp: completedAt / 1000 + 1,
      requestedSymbol: asset.symbol,
      symbol: asset.symbol,
      decimals: asset.decimals,
      xorPool:
        asset.address === XOR.address
          ? null
          : {
              baseAssetId: XOR.address,
              targetAssetId: KUSD.address,
              baseDecimals: 18,
              targetDecimals: 6,
              baseAssetReserves: '100000000000000000000',
              targetAssetReserves: '700000000',
            },
    },
  };
}

function response(rows: unknown[], next = '') {
  return { edges: rows.map((node) => ({ node })), pageInfo: { hasNextPage: !!next, endCursor: next } };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  Object.assign(api, { connection: initialConnection });
  Object.assign(initialConnection, { api: initialChain, endpoint: 'wss://fixture' });
  Object.assign(initialChain, { isConnected: true, genesisHash: { toString: () => GENESIS } });
  mocks.indexer = {
    type: 'polkaswap',
    services: { explorer: { fetchEntities: vi.fn(), initClient: vi.fn(() => true), client: { query: mocks.query } } },
  };
  vi.spyOn(Date, 'now').mockReturnValue(END + 60_000);
  mocks.finalized.mockResolvedValue('finalized');
  mocks.denominator.mockResolvedValue({ toString: () => '100' });
  mocks.at.mockResolvedValue({ query: { denomination: { denominator: mocks.denominator } } });
  mocks.fetch.mockImplementation(async (_query, variables) =>
    response([row(variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD)])
  );
  mocks.query.mockImplementation((query, variables, _context) => ({
    subscribe: (onResult: (result: unknown) => void) => {
      let active = true;
      Promise.resolve()
        .then(() => mocks.fetch(query, variables))
        .then(
          (data) => {
            if (active) onResult({ data: { data } });
          },
          (error) => {
            if (active) onResult({ error });
          }
        );
      return {
        unsubscribe: () => {
          active = false;
        },
      };
    },
  }));
});

describe('uncached indexed pool history with boundary evidence', () => {
  it('bypasses urql and HTTP caches for every page and binds transport cancellation to this read', async () => {
    const controller = new AbortController();
    mocks.fetch.mockImplementation(async (_query, variables) => {
      const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
      return variables.after ? response([row(asset)]) : response([row(asset, END - HOUR, 50)], 'next');
    });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), {
      startAt: END - 2 * HOUR,
      endAt: END,
      signal: controller.signal,
    });
    expect(result.history.missing).toBe(0);
    expect(mocks.indexer.services.explorer.fetchEntities).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledTimes(4);
    const signal = mocks.query.mock.calls[0][2].fetchOptions.signal;
    expect(signal).not.toBe(controller.signal);
    for (const [, variables, context] of mocks.query.mock.calls) {
      expect(context).toEqual({
        requestPolicy: 'network-only',
        fetchOptions: { signal, cache: 'no-store' },
      });
      expect(variables.first).toBe(100);
      expect(['', 'next']).toContain(variables.after);
    }
    expect(signal.aborted).toBe(true);
    expect(controller.signal.aborted).toBe(false);
  });

  it('forwards no-store and the read lifetime through the real explorer client to mocked HTTP', async () => {
    const reply = (asset: typeof XOR) =>
      new Response(JSON.stringify({ data: { data: response([row(asset)]) } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply(KUSD))
      .mockResolvedValueOnce(reply(XOR))
      .mockResolvedValueOnce(reply(KUSD))
      .mockResolvedValueOnce(reply(XOR));
    vi.stubGlobal('fetch', fetch);
    try {
      mocks.indexer.services.explorer.client = createExplorerClient('https://pi.soramitsu.io/graphql');
      expect((await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).history.missing).toBe(0);
      expect((await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).history.missing).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(4);
      const signals = fetch.mock.calls.map(([, options]) => {
        expect(options).toMatchObject({ cache: 'no-store', signal: expect.any(AbortSignal) });
        expect(options.signal.aborted).toBe(true);
        return options.signal;
      });
      expect(new Set(signals).size).toBe(4);
      expect(mocks.indexer.services.explorer.fetchEntities).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('cancels real-client pending HTTP requests even though urql replaces fetchOptions.signal', async () => {
    const controller = new AbortController();
    const aborted = vi.fn();
    const fetch = vi.fn(
      (_input, options) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => {
              aborted();
              reject(new DOMException('Cancelled', 'AbortError'));
            },
            { once: true }
          );
        })
    );
    vi.stubGlobal('fetch', fetch);
    try {
      const client = createExplorerClient('https://pi.soramitsu.io/graphql');
      mocks.indexer.services.explorer.client = client;
      const pending = fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: controller.signal });
      const rejected = expect(pending).rejects.toThrow('bots.errors.stale');
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      expect(aborted).not.toHaveBeenCalled();
      controller.abort();
      await rejected;
      expect(aborted).toHaveBeenCalledTimes(2);
      expect(mocks.indexer.services.explorer.client).toBe(client);
      expect(mocks.finalized).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps a shared HTTP request alive for another reader when one reader cancels', async () => {
    const first = new AbortController();
    const second = new AbortController();
    const aborted = vi.fn();
    const finishes: Array<(value: Response) => void> = [];
    const fetch = vi.fn(
      (_input, options) =>
        new Promise<Response>((resolve) => {
          finishes.push(resolve);
          options.signal.addEventListener('abort', aborted, { once: true });
        })
    );
    vi.stubGlobal('fetch', fetch);
    try {
      mocks.indexer.services.explorer.client = createExplorerClient('https://pi.soramitsu.io/graphql');
      const cancelled = fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: first.signal });
      const rejected = expect(cancelled).rejects.toThrow('bots.errors.stale');
      const retained = fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: second.signal });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      first.abort();
      await rejected;
      expect(aborted).not.toHaveBeenCalled();
      for (const [index, asset] of [KUSD, XOR].entries())
        finishes[index](
          new Response(JSON.stringify({ data: { data: response([row(asset)]) } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      expect((await retained).history.missing).toBe(0);
      expect(second.signal.aborted).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('waits for settled non-stale data and cleans up a synchronous query source', async () => {
    const unsubscribe = vi.fn();
    mocks.query.mockImplementation((_query, variables) => ({
      subscribe: (onResult: (value: unknown) => void) => {
        onResult({ stale: true, error: new Error('old cache') });
        onResult({ hasNext: true, data: { data: response([]) } });
        onResult({ data: { data: response([row(variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD)]) } });
        return { unsubscribe };
      },
    }));
    expect((await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).history.missing).toBe(0);
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it.each(['missing', 'boolean', 'cursorType', 'cursorLength'])(
    'rejects malformed %s pagination metadata before using it as a completed snapshot',
    async (fault) => {
      mocks.fetch.mockImplementation(async () => ({
        edges: [],
        pageInfo:
          fault === 'missing'
            ? undefined
            : {
                hasNextPage: fault === 'boolean' ? 'false' : true,
                endCursor: fault === 'cursorType' ? 7 : fault === 'cursorLength' ? 'x'.repeat(4097) : 'next',
              },
      }));
      await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.history');
      expect(mocks.finalized).not.toHaveBeenCalled();
    }
  );

  it('rejects partial GraphQL data accompanied by an error without trying the legacy reader', async () => {
    mocks.query.mockReturnValue({
      subscribe: (onResult: (value: unknown) => void) => {
        onResult({ data: { data: response([row(KUSD)]) }, error: new Error('partial response') });
        return { unsubscribe: vi.fn() };
      },
    });
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.history');
    expect(mocks.indexer.services.explorer.fetchEntities).not.toHaveBeenCalled();
    expect(mocks.finalized).not.toHaveBeenCalled();
  });

  it('does not open an indexer or RPC read when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: controller.signal })).rejects.toThrow(
      'bots.errors.stale'
    );
    expect(mocks.indexer.services.explorer.initClient).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.finalized).not.toHaveBeenCalled();
  });

  it.each(['fetch', 'finalized', 'at', 'denominator'] as const)(
    'cancels a pending %s wait promptly and ignores its later response',
    async (stage) => {
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, 'addEventListener');
      const remove = vi.spyOn(controller.signal, 'removeEventListener');
      let resolveRead!: (value: unknown) => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const read = new Promise((resolve) => {
        resolveRead = resolve;
      });
      mocks[stage].mockImplementation(() => {
        entered();
        return read;
      });
      const pending = fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: controller.signal });
      const rejected = expect(pending).rejects.toThrow('bots.errors.stale');
      await started;
      controller.abort();
      await rejected;
      const counts = [mocks.fetch, mocks.finalized, mocks.at, mocks.denominator].map((fn) => fn.mock.calls.length);
      resolveRead(response([row(KUSD)], 'next-page-must-not-be-read'));
      await Promise.resolve();
      await Promise.resolve();
      expect([mocks.fetch, mocks.finalized, mocks.at, mocks.denominator].map((fn) => fn.mock.calls.length)).toEqual(
        counts
      );
      expect(remove.mock.calls.filter(([event]) => event === 'abort')).toHaveLength(
        add.mock.calls.filter(([event]) => event === 'abort').length
      );
    }
  );

  it('detaches listeners after success and after a synchronous provider failure', async () => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    expect(
      (await fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: controller.signal })).history.missing
    ).toBe(0);
    mocks.fetch.mockImplementation(() => {
      controller.abort();
      throw new Error('provider failed');
    });
    await expect(
      fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: controller.signal })
    ).rejects.toThrow();
    expect(remove.mock.calls.filter(([event]) => event === 'abort')).toHaveLength(
      add.mock.calls.filter(([event]) => event === 'abort').length
    );
  });

  it('cancels sibling waits when a provider fails without aborting the caller', async () => {
    const controller = new AbortController();
    const add = vi.spyOn(AbortSignal.prototype, 'addEventListener');
    const remove = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    let resolveSibling!: (value: unknown) => void;
    const sibling = new Promise((resolve) => {
      resolveSibling = resolve;
    });
    mocks.fetch.mockImplementation((_query, variables) => {
      if (variables.filter.assetId.equalTo === KUSD.address) throw new Error('provider failed');
      return sibling;
    });
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), { ...OPTIONS, signal: controller.signal })).rejects.toThrow(
      'bots.errors.history'
    );
    await Promise.resolve();
    expect(controller.signal.aborted).toBe(false);
    expect(remove.mock.calls.filter(([event]) => event === 'abort')).toHaveLength(
      add.mock.calls.filter(([event]) => event === 'abort').length
    );
    const fetchCount = mocks.fetch.mock.calls.length;
    resolveSibling(response([row(XOR)], 'late-next-page'));
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.fetch).toHaveBeenCalledTimes(fetchCount);
    expect(mocks.finalized).not.toHaveBeenCalled();
  });

  it('returns one immutable aligned proof per accepted candle from the same queried rows', async () => {
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    expect(result.history).toEqual({
      candles: [{ timestamp: END, close: '7', feeClose: '7' }],
      missing: 0,
      denominationVerified: true,
      identity: { genesisHash: GENESIS, denominator: '100' },
    });
    expect(result.boundaries).toEqual([
      {
        kind: 'indexed-finalized-hour-boundary',
        completedAtMs: END,
        genesisHash: GENESIS,
        denominator: '100',
        closing: { height: 100, hash: `0x${'64'.padStart(64, '0')}`, timestampSeconds: END / 1000 - 10 },
        successor: { height: 101, hash: `0x${'65'.padStart(64, '0')}`, timestampSeconds: END / 1000 + 1 },
        arrivalTimeKnown: false,
      },
    ]);
    for (const value of [
      result,
      result.history,
      result.history.identity,
      result.history.candles,
      result.history.candles[0],
      result.boundaries,
      result.boundaries[0],
      result.boundaries[0].closing,
      result.boundaries[0].successor,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    for (const [query, variables] of mocks.fetch.mock.calls) {
      expect(query.loc.source.body).toContain('BotClosedPoolPrices');
      expect(query.loc.source.body).not.toContain('priceUSD');
      expect(variables.filter.type.equalTo).toBe('HOUR');
      expect(variables.filter.timestamp).toEqual({
        greaterThanOrEqualTo: (END - HOUR) / 1000,
        lessThanOrEqualTo: END / 1000 - 1,
      });
    }
    expect(mocks.at).toHaveBeenCalledWith('finalized');
  });

  it('excludes partial opening/current hours while retaining bounded requested gaps', async () => {
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), { startAt: END - 3 * HOUR + 1, endAt: END + HOUR });
    expect(result.history.missing).toBe(1);
    expect(result.history.candles).toHaveLength(1);
    expect(mocks.fetch.mock.calls[0][1].filter.timestamp).toEqual({
      greaterThanOrEqualTo: (END - 2 * HOUR) / 1000,
      lessThanOrEqualTo: END / 1000 - 1,
    });
  });

  it('preserves missing, rejected, duplicate and mismatched-boundary hours', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) => {
      const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
      const invalid = row(asset, END - 3 * HOUR, 300);
      invalid.denominator = '10';
      const mismatch = row(asset, END - HOUR, asset === XOR ? 600 : 500);
      return response([
        row(asset),
        invalid,
        row(asset, END - 2 * HOUR, 400),
        row(asset, END - 2 * HOUR, 400),
        mismatch,
      ]);
    });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), { startAt: END - 5 * HOUR, endAt: END });
    expect(result.history.missing).toBe(4);
    expect(result.history.candles.map((candle) => candle.timestamp)).toEqual([END]);
    expect(result.boundaries.map((boundary) => boundary.completedAtMs)).toEqual([END]);
  });

  it('keeps a denomination transition missing instead of rescaling or relabeling reserves', async () => {
    mocks.denominator.mockResolvedValue({ toString: () => '1000' });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    expect(result.history).toMatchObject({ candles: [], missing: 1, denominationVerified: false });
    expect(result.boundaries).toEqual([]);
  });

  it('copies provider-owned data before later denomination reads can mutate it', async () => {
    const input = row(KUSD);
    const output = row(XOR);
    mocks.fetch.mockImplementation(async (_query, variables) =>
      response([variables.filter.assetId.equalTo === XOR.address ? output : input])
    );
    mocks.at.mockImplementation(async () => {
      input.closeEvidence.xorPool!.targetAssetReserves = '1';
      input.closeEvidence.blockHash = `0x${'f'.repeat(64)}`;
      output.closeEvidence.blockHash = `0x${'f'.repeat(64)}`;
      return { query: { denomination: { denominator: mocks.denominator } } };
    });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    expect(result.history.candles[0].close).toBe('7');
    expect(result.boundaries[0].closing.hash).toBe(`0x${'64'.padStart(64, '0')}`);
    input.timestamp = 0;
    expect(result.boundaries[0].closing.timestampSeconds).toBe(END / 1000 - 10);
  });

  it('accepts live JSON evidence with empty and populated optional pool arrays', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) => {
      const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
      const observation = row(asset);
      return response([
        {
          ...observation,
          closeEvidence: {
            ...observation.closeEvidence,
            pools: asset === KUSD ? [] : [{ targetAssetId: KUSD.address, reserves: ['100', '700'] }],
          },
        },
      ]);
    });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    expect(result.history).toMatchObject({
      candles: [{ timestamp: END, close: '7', feeClose: '7' }],
      missing: 0,
      denominationVerified: true,
    });
    expect(result.boundaries).toHaveLength(1);
  });

  it.each(['hole', 'accessor', 'hidden', 'property', 'symbol', 'prototype', 'cycle', 'budget', 'depth', 'string'])(
    'rejects an optional %s array without executing code or weakening snapshot bounds',
    async (fault) => {
      const getter = vi.fn(() => 'unexpected');
      let pools: unknown[] = ['pool'];
      if (fault === 'hole') pools = new Array(1);
      if (fault === 'accessor') Object.defineProperty(pools, '0', { get: getter, enumerable: true });
      if (fault === 'hidden') Object.defineProperty(pools, '0', { value: 'pool', enumerable: false });
      if (fault === 'property') Object.defineProperty(pools, 'extra', { value: 'pool', enumerable: true });
      if (fault === 'symbol') Object.defineProperty(pools, Symbol('extra'), { value: 'pool', enumerable: true });
      if (fault === 'prototype') Object.setPrototypeOf(pools, null);
      if (fault === 'cycle') pools[0] = pools;
      if (fault === 'budget') pools = Array.from({ length: 512 }, () => null);
      if (fault === 'depth') for (let index = 0; index < 8; index++) pools = [pools];
      if (fault === 'string') pools = ['x'.repeat(4097)];
      mocks.fetch.mockImplementation(async (_query, variables) => {
        const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
        const observation = row(asset);
        return response([{ ...observation, closeEvidence: { ...observation.closeEvidence, pools } }]);
      });
      const result = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
      expect(result.history).toMatchObject({ candles: [], missing: 1 });
      expect(result.boundaries).toEqual([]);
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('copies requested asset identity before yielding to the indexer', async () => {
    const requested = bot();
    mocks.at.mockImplementation(async () => {
      requested.assetIn.symbol = 'CHANGED';
      requested.assetOut.decimals = 2;
      requested.policy.feeAsset.symbol = 'CHANGED';
      return { query: { denomination: { denominator: mocks.denominator } } };
    });
    const result = await fetchIndexedBotHistoryWithEvidence(requested, OPTIONS);
    expect(result.history.candles).toEqual([{ timestamp: END, close: '7', feeClose: '7' }]);
  });

  it('retains a rejected duplicate without invoking its accessor', async () => {
    const getter = vi.fn(() => row(KUSD).closeEvidence);
    mocks.fetch.mockImplementation(async (_query, variables) => {
      const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
      const invalid = { timestamp: END / 1000 - 10 };
      Object.defineProperty(invalid, 'closeEvidence', { get: getter, enumerable: true });
      return response(asset === XOR ? [row(asset)] : [invalid, row(asset)]);
    });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    expect(getter).not.toHaveBeenCalled();
    expect(result.history).toMatchObject({ candles: [], missing: 1 });
    expect(result.boundaries).toEqual([]);
  });

  it.each(['fetch', 'finalized', 'at', 'denominator'] as const)(
    'rejects chain identity changes across the %s await',
    async (stage) => {
      const original = mocks[stage].getMockImplementation()!;
      mocks[stage].mockImplementation(async (...args) => {
        const result = await original(...args);
        Object.assign(initialConnection, { endpoint: 'wss://different-fixture' });
        return result;
      });
      await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.stale');
    }
  );

  it.each(['fetch', 'denominator'] as const)('rejects an indexer replacement during the %s await', async (stage) => {
    const original = mocks[stage].getMockImplementation()!;
    mocks[stage].mockImplementation(async (...args) => {
      const result = await original(...args);
      mocks.indexer = {
        ...mocks.indexer,
        services: { explorer: { ...mocks.indexer.services.explorer } },
      };
      return result;
    });
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.stale');
  });

  it('rejects an explorer service replacement even on the same indexer object', async () => {
    mocks.denominator.mockImplementation(async () => {
      mocks.indexer.services.explorer = { ...mocks.indexer.services.explorer };
      return { toString: () => '100' };
    });
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.stale');
  });

  it('rejects a network client replacement within an unchanged explorer service', async () => {
    mocks.denominator.mockImplementation(async () => {
      mocks.indexer.services.explorer.client = {};
      return { toString: () => '100' };
    });
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.stale');
  });

  it('rejects an indexer type change even when its explorer remains the same', async () => {
    mocks.denominator.mockImplementation(async () => {
      mocks.indexer.type = 'different-indexer';
      return { toString: () => '100' };
    });
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.stale');
  });

  it('rejects unavailable indexer initialization before querying', async () => {
    mocks.indexer.services.explorer.initClient.mockReturnValue(false);
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.history');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('requests newly available rows again instead of caching incomplete coverage', async () => {
    mocks.fetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([]));
    const first = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    const next = await fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS);
    expect(first.history).toMatchObject({ candles: [], missing: 1 });
    expect(first.boundaries).toEqual([]);
    expect(next.history.missing).toBe(0);
    expect(next.boundaries).toHaveLength(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });

  it('rejects an unsupported query without falling back to USD history', async () => {
    mocks.fetch.mockResolvedValue(null);
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.history');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.finalized).not.toHaveBeenCalled();
  });

  it('retains aligned evidence over pages and refuses repeated pagination cursors', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) => {
      const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
      return variables.after ? response([row(asset)]) : response([row(asset, END - HOUR, 50)], 'next');
    });
    const result = await fetchIndexedBotHistoryWithEvidence(bot(), { startAt: END - 2 * HOUR, endAt: END });
    expect(result.history.missing).toBe(0);
    expect(result.boundaries.map((boundary) => boundary.closing.height)).toEqual([50, 100]);
    mocks.fetch.mockResolvedValue(response([], 'same'));
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), OPTIONS)).rejects.toThrow('bots.errors.history');
  });

  it.each([
    {},
    { days: 0 },
    { days: 366 },
    { days: 1.5 },
    { startAt: -1 },
    { startAt: END, endAt: END },
    { startAt: END - HOUR, endAt: NaN },
    { startAt: END - 10001 * HOUR, endAt: END },
    { days: 1, interval: 'day' },
    { days: 1, basis: 'usd' },
  ])('rejects unsupported request bounds/options before querying: %j', async (options) => {
    await expect(fetchIndexedBotHistoryWithEvidence(bot(), options)).rejects.toThrow('bots.errors.history');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
