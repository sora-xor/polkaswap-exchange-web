import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchOrderBooks } from '@/indexer/queries/orderBook/orderBooks';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  fetchAllEntitiesConnection: vi.fn(),
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
  SubqueryIndexer: class SubqueryIndexer {},
  SubsquidIndexer: class SubsquidIndexer {},
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

  it('fetches SubQuery order books with a base-asset filter and parses FP stats', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createSubqueryOrderBook()),
    ]);
    indexerMocks.currentIndexer = createIndexer('subquery');

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
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
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

  it('fetches SubQuery order books without a filter when assets are omitted', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer('subquery');

    await expect(fetchOrderBooks()).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: undefined,
      },
      expect.any(Function)
    );
  });

  it('fetches Subsquid order books with nested asset ids and parses fallback numeric fields', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createSubsquidOrderBook()),
    ]);
    indexerMocks.currentIndexer = createIndexer('subsquid');

    const result = await fetchOrderBooks([{ address: 'xor' }] as any);

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          baseAsset: {
            id_in: ['xor'],
          },
        },
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result?.[0]?.id).toEqual({
      dexId: 1,
      base: 'xor',
      quote: 'val',
    });
    expect(result?.[0]?.stats.price.toString()).toBe('0');
    expect(result?.[0]?.stats.priceChange.toString()).toBe('0');
    expect(result?.[0]?.stats.volume.toString()).toBe('0');
  });

  it('fetches Subsquid order books without a where clause when assets are empty', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer('subsquid');

    await expect(fetchOrderBooks([] as any)).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: undefined,
      },
      expect.any(Function)
    );
  });

  it('returns null for unsupported indexer types without invoking retry or fetches', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchOrderBooks()).resolves.toBeNull();
    expect(retryMocks.retryOnEmptyResult).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
      fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
    },
  },
});

const createSubqueryOrderBook = () => ({
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

const createSubsquidOrderBook = () => ({
  dexId: 1,
  baseAsset: {
    id: 'xor',
  },
  quoteAsset: {
    id: 'val',
  },
  baseAssetReserves: '0',
  quoteAssetReserves: '0',
  price: null,
  priceChangeDay: null,
  volumeDayUSD: null,
  status: 'PlaceAndCancel',
});
