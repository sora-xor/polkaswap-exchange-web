import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOrderBooks } from '@/indexer/queries/orderBook/orderBooks';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
}));

const retryMocks = vi.hoisted(() => ({
  retryOnEmptyResult: vi.fn(async (request: () => Promise<unknown>, isEmpty: (value: unknown) => boolean) => {
    const result = await request();
    isEmpty(result);
    return result;
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

vi.mock('@/indexer/queries/retry', () => ({
  retryOnEmptyResult: retryMocks.retryOnEmptyResult,
}));

describe('order books query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
    retryMocks.retryOnEmptyResult.mockImplementation(
      async (request: () => Promise<unknown>, isEmpty: (value: unknown) => boolean) => {
        const result = await request();
        isEmpty(result);
        return result;
      }
    );
  });

  it('fetches Polkaswap order books with a base-asset filter and parses FP stats', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createPolkaswapOrderBook()),
    ]);
    indexerMocks.currentIndexer = createIndexer('polkaswap');

    const result = await fetchOrderBooks([{ address: 'base-a' }, { address: 'base-b' }] as any);

    expect(retryMocks.retryOnEmptyResult).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: {
          baseAssetId: {
            in: ['base-a', 'base-b'],
          },
        },
      },
      expect.any(Function),
      { requestPolicy: 'network-only', retryPendingCore: true }
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({
      id: {
        dexId: 0,
        base: 'base-a',
        quote: 'quote-a',
      },
      stats: {
        baseAssetReserves: '1000',
        quoteAssetReserves: '2500',
        status: 'Trade',
      },
    });
    expect(result?.[0]?.stats.price.toString()).toBe('2.5');
    expect(result?.[0]?.stats.priceChange.toString()).toBe('-0.15');
    expect(result?.[0]?.stats.volume.toString()).toBe('123.45');
  });

  it('preserves an absent last deal, an observed zero and a positive micro-price separately', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.currentIndexer.services.explorer.supportsExactPrices.mockResolvedValue(true);
    indexerMocks.fetchAllEntities.mockImplementation(async (query, _variables, parse) => {
      expect(JSON.stringify(query.definitions)).toContain('priceExact');
      return [null, '0', '0.0000000000340941693'].map((priceExact) =>
        parse({ ...createPolkaswapOrderBook(), price: '0', priceExact })
      );
    });
    const books = await fetchOrderBooks();
    expect(books?.map((book) => book.stats.price?.toString() ?? null)).toEqual([null, '0', '0.0000000000340941693']);
  });

  it('fetches Polkaswap order books without a filter when assets are omitted', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer('polkaswap');

    await expect(fetchOrderBooks()).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: undefined,
      },
      expect.any(Function),
      { requestPolicy: 'network-only', retryPendingCore: true }
    );
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      supportsExactPrices: vi.fn().mockResolvedValue(false),
      fetchAllEntities: indexerMocks.fetchAllEntities,
    },
  },
});

const createPolkaswapOrderBook = () => ({
  dexId: 0,
  baseAssetId: 'base-a',
  quoteAssetId: 'quote-a',
  baseAssetReserves: '1000',
  quoteAssetReserves: '2500',
  price: '2.5',
  priceChangeDay: '-0.15',
  volumeDayUSD: '123.45',
  status: 'Trade',
});
