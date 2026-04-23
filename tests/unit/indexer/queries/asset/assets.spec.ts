import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchTokensData } from '@/indexer/queries/asset/assets';

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

describe('asset token stats query', () => {
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

  it('fetches SubQuery token stats with asset filters and combines pool/book liquidity', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createAssetEntity('asset-a', '2', '1000000000000000000', '2000000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchTokensData([{ address: 'asset-a' }, { address: 'asset-b' }] as any);

    expect(retryMocks.retryOnEmptyResult).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: {
          or: [{ liquidity: { greaterThan: '0' } }, { liquidityBooks: { greaterThan: '0' } }],
          id: {
            in: ['asset-a', 'asset-b'],
          },
        },
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(result['asset-a']?.priceUSD.toString()).toBe('2');
    expect(result['asset-a']?.tvlUSD.toString()).toBe('6');
    expect(result['asset-a']?.priceChangeDay.toString()).toBe('0.05');
    expect(result['asset-a']?.velocity.toString()).toBe('1.25');
  });

  it('fetches Subsquid token stats without id filters and parses zero fallbacks', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createAssetEntity('asset-c', null, '0', undefined)),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchTokensData([] as any);

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          OR: [{ liquidity_gt: '0' }, { liquidityBooks_gt: '0' }],
        },
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result['asset-c']?.priceUSD.toString()).toBe('0');
    expect(result['asset-c']?.tvlUSD.toString()).toBe('0');
    expect(result['asset-c']?.volumeWeekUSD.toString()).toBe('0');
  });

  it('adds Subsquid id filters when assets are provided', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchTokensData([{ address: 'asset-a' }, { address: 'asset-b' }] as any)).resolves.toEqual({});

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          OR: [{ liquidity_gt: '0' }, { liquidityBooks_gt: '0' }],
          id_in: ['asset-a', 'asset-b'],
        },
      },
      expect.any(Function)
    );
  });

  it('returns an empty map when retry resolves with no token data', async () => {
    retryMocks.retryOnEmptyResult.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchTokensData([{ address: 'asset-a' }] as any)).resolves.toEqual({});
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
  });

  it('returns an empty map for unsupported indexer types without retrying', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchTokensData([{ address: 'asset-a' }] as any)).resolves.toEqual({});
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

const createAssetEntity = (
  id: string,
  priceUSD: string | null,
  liquidity: string,
  liquidityBooks: string | undefined
) => ({
  id,
  priceUSD,
  priceChangeDay: '0.05',
  priceChangeWeek: '0.15',
  volumeDayUSD: '10.5',
  volumeWeekUSD: liquidityBooks === undefined ? null : '70.5',
  liquidity,
  liquidityBooks,
  velocity: '1.25',
});
