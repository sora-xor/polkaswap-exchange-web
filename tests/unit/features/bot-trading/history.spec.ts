import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBotHistory } from '@/features/bot-trading/history';
import type { BotDefinition } from '@/features/bot-trading/types';
import { api } from '@/lib/soraneo-wallet/src/api';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  at: vi.fn(),
  finalized: vi.fn(),
  header: vi.fn(),
  hash: vi.fn(),
  block: vi.fn(),
}));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({ services: { explorer: { fetchEntities: mocks.fetch } } }),
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      endpoint: 'wss://sora',
      api: {
        isConnected: true,
        genesisHash: { toString: () => 'sora' },
        at: mocks.at,
        query: { denomination: { denominator: vi.fn() } },
        rpc: {
          chain: {
            getFinalizedHead: mocks.finalized,
            getHeader: mocks.header,
            getBlockHash: mocks.hash,
            getBlock: mocks.block,
          },
        },
      },
    },
  },
}));
const initialConnection = api.connection!;
const initialChain = initialConnection.api!;
const BOT = {
  assetIn: { address: 'a' },
  assetOut: { address: 'b' },
  policy: { feeAsset: { address: 'a' } },
} as BotDefinition;
const now = Date.UTC(2026, 8, 13, 12, 30);
const boundary = Date.UTC(2026, 8, 13, 12) / 1000;
const start = boundary - 86400;
const response = (rows: { timestamp: number; priceUSD: { close: unknown }; denominator?: string }[], next = '') => ({
  edges: rows.map((node) => ({ node })),
  pageInfo: { hasNextPage: !!next, endCursor: next },
});
const row = (timestamp: number, close: unknown) => ({ timestamp, priceUSD: { close } });
const denominator = (value: string) => ({
  query: { denomination: { denominator: async () => ({ toString: () => value }) } },
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  Object.assign(api, { connection: initialConnection });
  Object.assign(initialConnection, { api: initialChain, endpoint: 'wss://sora' });
  Object.assign(initialChain, { isConnected: true, genesisHash: { toString: () => 'sora' } });
  vi.spyOn(Date, 'now').mockReturnValue(now);
  mocks.finalized.mockResolvedValue('final');
  mocks.at.mockResolvedValue(denominator('1'));
  mocks.header.mockResolvedValue({ number: { toNumber: () => 4 } });
  mocks.hash.mockImplementation(async (height) => `hash-${height}`);
  mocks.block.mockImplementation(async (hash) => ({
    block: {
      extrinsics: [
        {
          method: {
            section: 'timestamp',
            method: 'set',
            args: [{ toString: () => String((start + (Number(hash.split('-')[1]) - 1) * 3600) * 1000) }],
          },
        },
      ],
    },
  }));
  mocks.fetch.mockImplementation(async (_query, variables) =>
    response([row(start, variables.filter.assetId.equalTo === 'a' ? '2' : '4')])
  );
});

describe('precision-preserving historical candles', () => {
  it('aligns exact completed buckets and reports missing coverage', async () => {
    const history = await fetchBotHistory(BOT, { days: 1, interval: 'hour' });
    expect(history).toEqual({
      candles: [{ timestamp: (start + 3600) * 1000, close: '2', feeClose: '1' }],
      missing: 23,
      denominationVerified: true,
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls[0][1].filter.timestamp).toEqual({
      greaterThanOrEqualTo: start,
      lessThanOrEqualTo: boundary - 1,
    });
  });
  it('retains fractional decimal detail that a number-based chart would lose', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) =>
      response([row(start, variables.filter.assetId.equalTo === 'a' ? '1' : '1.000000000000000001')])
    );
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).candles[0].close).toBe('1.000000000000000001');
  });
  it('uses the actual last-update timestamps within matching completed buckets', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) =>
      response([row(start + 3590, variables.filter.assetId.equalTo === 'a' ? '2' : '4')])
    );
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).candles[0]).toMatchObject({
      timestamp: (start + 3600) * 1000,
      close: '2',
    });
  });
  it('does not backfill missing observations or include a partial current bucket', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) =>
      response(
        variables.filter.assetId.equalTo === 'a'
          ? [row(start, '2'), row(start + 3600, '2'), row(boundary, '2')]
          : [row(start, '4'), row(start + 7200, '4'), row(boundary, '4')]
      )
    );
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).candles).toHaveLength(1);
  });
  it('excludes numeric prices, zeroes, duplicated timestamps and malformed buckets', async () => {
    mocks.fetch.mockResolvedValue(
      response([
        row(start, 2),
        row(start + 3600, '0'),
        row(start + 7200, '2'),
        row(start + 7200, '3'),
        row(start + 10800.5, '2'),
      ])
    );
    const result = await fetchBotHistory(BOT, { days: 1, interval: 'hour' });
    expect(result.candles).toEqual([]);
    expect(result.denominationVerified).toBe(false);
    expect(mocks.at).not.toHaveBeenCalled();
  });
  it('fetches a separate fee asset and only emits buckets with all valuation prices', async () => {
    const bot = { ...BOT, policy: { ...BOT.policy, feeAsset: { address: 'c' } } } as BotDefinition;
    mocks.fetch.mockImplementation(async (_query, variables) =>
      response([row(start, { a: '2', b: '4', c: '6' }[variables.filter.assetId.equalTo as 'a'])])
    );
    expect((await fetchBotHistory(bot, { days: 1, interval: 'hour' })).candles[0].feeClose).toBe('3');
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
  it('paginates raw queries and rejects repeated cursors', async () => {
    mocks.fetch.mockImplementation(async (_query, variables) =>
      variables.after === '' ? response([row(start, '2')], 'page2') : response([row(start + 3600, '2')])
    );
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).candles).toHaveLength(2);
    mocks.fetch.mockResolvedValue(response([], 'same'));
    await expect(fetchBotHistory(BOT, { days: 1, interval: 'hour' })).rejects.toThrow('bots.errors.history');
  });
  it('respects the public 100-row limit and reads more than twelve pages', async () => {
    const historyStart = boundary - 60 * 86400;
    mocks.fetch.mockImplementation(async (_query, variables) => {
      if (variables.first > 100) throw new Error('first must not exceed 100');
      const offset = variables.after ? Number(variables.after) : 0;
      const remaining = 60 * 24 - offset;
      const count = Math.min(variables.first, remaining);
      return response(
        Array.from({ length: count }, (_, index) =>
          row(historyStart + (offset + index) * 3600, variables.filter.assetId.equalTo === 'a' ? '2' : '4')
        ),
        remaining > count ? String(offset + count) : ''
      );
    });
    const history = await fetchBotHistory(BOT, { days: 60, interval: 'hour' });
    expect(history.candles).toHaveLength(1440);
    expect(history.missing).toBe(0);
    expect(history.denominationVerified).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(30);
    expect(mocks.fetch.mock.calls.every(([, variables]) => variables.first === 100)).toBe(true);
  });
  it('rejects missing continuation cursors and bounds endless empty pages', async () => {
    mocks.fetch.mockResolvedValue({ edges: [], pageInfo: { hasNextPage: true, endCursor: '' } });
    await expect(fetchBotHistory(BOT, { days: 1, interval: 'hour' })).rejects.toThrow('bots.errors.history');
    mocks.fetch.mockClear();
    mocks.fetch.mockImplementation(async (_query, variables) => response([], String(Number(variables.after || 0) + 1)));
    await expect(fetchBotHistory(BOT, { days: 365, interval: 'hour' })).rejects.toThrow('bots.errors.history');
    expect(mocks.fetch).toHaveBeenCalledTimes(200);
  });
  it('rejects responses exceeding the 10,000-observation safety limit', async () => {
    mocks.fetch.mockResolvedValue(response(Array.from({ length: 10001 }, () => row(start, '2'))));
    await expect(fetchBotHistory(BOT, { days: 365, interval: 'hour' })).rejects.toThrow('bots.errors.history');
  });
  it('refuses unavailable data and bounds query duration', async () => {
    mocks.fetch.mockResolvedValue(null);
    await expect(fetchBotHistory(BOT, { days: 1, interval: 'hour' })).rejects.toThrow('bots.errors.history');
    await expect(fetchBotHistory(BOT, { days: 366, interval: 'hour' })).rejects.toThrow('bots.errors.history');
    await expect(fetchBotHistory(BOT, { days: 0.5, interval: 'hour' })).rejects.toThrow('bots.errors.history');
  });
  it('uses day CLOSE completion times instead of claiming that day data was available at open', async () => {
    const dayBoundary = Date.UTC(2026, 8, 13) / 1000;
    mocks.fetch.mockResolvedValue(response([row(dayBoundary - 86400, '2')]));
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'day' })).candles[0].timestamp).toBe(dayBoundary * 1000);
  });
  it('reads the entire March study through the latest completed hour without a rolling-day cutoff', async () => {
    const marchStart = Date.UTC(2026, 2, 1);
    const count = (boundary * 1000 - marchStart) / 3_600_000;
    mocks.fetch.mockImplementation(async (_query, variables) => {
      const offset = Number(variables.after || 0);
      const length = Math.min(variables.first, count - offset);
      return response(
        Array.from({ length }, (_, index) =>
          row(marchStart / 1000 + (offset + index) * 3600 + 3599, variables.filter.assetId.equalTo === 'a' ? '2' : '4')
        ),
        offset + length < count ? String(offset + length) : ''
      );
    });
    const history = await fetchBotHistory(BOT, { days: 7, interval: 'hour', startAt: marchStart });
    expect(count).toBeGreaterThan(90 * 24);
    expect(history.candles).toHaveLength(count);
    expect(history.candles[0].timestamp).toBe(marchStart + 3_600_000);
    expect(history.candles.at(-1)?.timestamp).toBe(boundary * 1000);
    expect(history).toMatchObject({ missing: 0, denominationVerified: true });
    expect(mocks.fetch).toHaveBeenCalledTimes(2 * Math.ceil(count / 100));
    expect(mocks.fetch.mock.calls[0][1].filter.timestamp).toEqual({
      greaterThanOrEqualTo: marchStart / 1000,
      lessThanOrEqualTo: boundary - 1,
    });
  });
  it('aligns partial requested boundaries inward and clamps future ends to completed data', async () => {
    const marchStart = Date.UTC(2026, 2, 1);
    await fetchBotHistory(BOT, {
      interval: 'hour',
      startAt: marchStart + 1,
      endAt: marchStart + 3_600_000 * 3 + 1,
    });
    expect(mocks.fetch.mock.calls[0][1].filter.timestamp).toEqual({
      greaterThanOrEqualTo: marchStart / 1000 + 3600,
      lessThanOrEqualTo: marchStart / 1000 + 3600 * 3 - 1,
    });
    mocks.fetch.mockClear();
    await fetchBotHistory(BOT, { interval: 'hour', startAt: marchStart, endAt: now + 86_400_000 });
    expect(mocks.fetch.mock.calls[0][1].filter.timestamp.lessThanOrEqualTo).toBe(boundary - 1);
  });
  it('preserves missing March buckets instead of carrying September prices backwards', async () => {
    const marchStart = Date.UTC(2026, 2, 1);
    const history = await fetchBotHistory(BOT, { interval: 'hour', startAt: marchStart });
    expect(history.candles).toHaveLength(1);
    expect(history.candles[0].timestamp).toBe((start + 3600) * 1000);
    expect(history.missing).toBe((boundary * 1000 - marchStart) / 3_600_000 - 1);
  });
  it.each([
    { startAt: now },
    { startAt: Date.UTC(2025, 1, 1) },
    { startAt: 1.5 },
    { startAt: -1 },
    { startAt: start * 1000, endAt: start * 1000 },
    { startAt: start * 1000, endAt: Number.NaN },
  ])('rejects invalid or oversized explicit study bounds %j before provider requests', async (range) => {
    await expect(fetchBotHistory(BOT, { interval: 'hour', ...range })).rejects.toThrow('bots.errors.history');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe('historical denomination proof', () => {
  it('rejects live history from a different network before querying prices', async () => {
    await expect(
      fetchBotHistory({ ...BOT, mode: 'live', network: 'other' }, { days: 1, interval: 'hour' })
    ).rejects.toThrow('bots.errors.network');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(['connection', 'chain', 'endpoint', 'genesis', 'disconnected'])(
    'rejects a changed %s while indexed prices are pending',
    async (change) => {
      mocks.fetch.mockImplementationOnce(async () => {
        await Promise.resolve();
        if (change === 'connection') Object.assign(api, { connection: { ...initialConnection } });
        if (change === 'chain') Object.assign(initialConnection, { api: { ...initialChain } });
        if (change === 'endpoint') Object.assign(initialConnection, { endpoint: 'wss://other' });
        if (change === 'genesis') Object.assign(initialChain, { genesisHash: { toString: () => 'other' } });
        if (change === 'disconnected') Object.assign(initialChain, { isConnected: false });
        return response([row(start, '2')]);
      });
      await expect(fetchBotHistory(BOT, { days: 1, interval: 'hour' })).rejects.toThrow('bots.errors.stale');
      expect(mocks.finalized).not.toHaveBeenCalled();
    }
  );
  it('rejects a chain change during denomination proof instead of certifying fetched prices', async () => {
    mocks.at.mockImplementationOnce(async () => {
      Object.assign(initialConnection, { api: { ...initialChain } });
      return denominator('1');
    });
    await expect(fetchBotHistory(BOT, { days: 1, interval: 'hour' })).rejects.toThrow('bots.errors.stale');
  });
  it('uses indexed CLOSE coefficients without archival state and excludes legacy or mismatched buckets', async () => {
    mocks.at.mockResolvedValue(denominator('100'));
    mocks.fetch.mockResolvedValue(
      response([
        { ...row(start, '2'), denominator: '1' },
        { ...row(start + 3600, '2'), denominator: '100' },
        row(start + 7200, '2'),
      ])
    );
    const history = await fetchBotHistory(BOT, { days: 1, interval: 'hour' });
    expect(history.denominationVerified).toBe(true);
    expect(history.candles).toHaveLength(1);
    expect(history.missing).toBe(23);
    expect(mocks.block).not.toHaveBeenCalled();
  });
  it('falls back to the legacy query when the server has not deployed the optional field', async () => {
    mocks.fetch.mockImplementation(async (query) =>
      query.definitions[0].name.value === 'BotClosedPrices' ? null : response([row(start, '2')])
    );
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).denominationVerified).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
  });
  it('accepts identical historical and finalized cumulative denominators', async () => {
    mocks.at.mockResolvedValue(denominator('1000000'));
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).denominationVerified).toBe(true);
    expect(mocks.at).toHaveBeenLastCalledWith('hash-1');
  });
  it('excludes a denomination transition including a transition after the historical window', async () => {
    mocks.at.mockImplementation(async (hash) => denominator(hash === 'final' ? '1000000' : '1'));
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).denominationVerified).toBe(false);
  });
  it('fails closed when archive state is pruned or an RPC cannot prove timestamps', async () => {
    mocks.at.mockImplementation(async (hash) => {
      if (hash === 'final') return denominator('100');
      throw new Error('pruned');
    });
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).denominationVerified).toBe(false);
    mocks.block.mockResolvedValue({ block: { extrinsics: [] } });
    expect((await fetchBotHistory(BOT, { days: 1, interval: 'hour' })).denominationVerified).toBe(false);
  });
});
