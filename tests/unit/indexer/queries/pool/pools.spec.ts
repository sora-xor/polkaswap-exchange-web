import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchPoolsData } from '@/indexer/queries/pool/pools';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  fetchAllEntitiesConnection: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
  SubsquidIndexer: class SubsquidIndexer {},
}));

describe('pool list query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery pools with target asset filters and parses numeric fields', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createSubqueryPool()),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchPoolsData([{ address: 'target-a' }, { address: 'target-b' }] as any);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: {
          baseAssetReserves: {
            greaterThan: '0',
          },
          targetAssetReserves: {
            greaterThan: '0',
          },
          targetAssetId: {
            in: ['target-a', 'target-b'],
          },
        },
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      baseAssetId: 'base-a',
      targetAssetId: 'target-a',
      baseAssetReserves: '1000',
      targetAssetReserves: '2000',
    });
    expect(result[0]?.priceUSD.toString()).toBe('2.5');
    expect(result[0]?.apy.toString()).toBe('12.5');
  });

  it('fetches SubQuery pools without a target asset filter when assets are omitted', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchPoolsData()).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: {
          baseAssetReserves: {
            greaterThan: '0',
          },
          targetAssetReserves: {
            greaterThan: '0',
          },
        },
      },
      expect.any(Function)
    );
  });

  it('fetches Subsquid pools with nested target asset filters and parses fallback numeric fields', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createSubsquidPool()),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchPoolsData([{ address: 'target-c' }] as any);

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          baseAssetReserves_gt: '0',
          targetAssetReserves_gt: '0',
          targetAsset: {
            id_in: ['target-c'],
          },
        },
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      baseAssetId: 'base-c',
      targetAssetId: 'target-c',
      baseAssetReserves: '3000',
      targetAssetReserves: '4000',
    });
    expect(result[0]?.priceUSD.toString()).toBe('0');
    expect(result[0]?.apy.toString()).toBe('0');
  });

  it('fetches Subsquid pools without a target filter when assets are empty', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchPoolsData([] as any)).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          baseAssetReserves_gt: '0',
          targetAssetReserves_gt: '0',
        },
      },
      expect.any(Function)
    );
  });

  it('returns an empty array for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchPoolsData()).resolves.toEqual([]);
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

const createSubqueryPool = () => ({
  baseAssetId: 'base-a',
  targetAssetId: 'target-a',
  baseAssetReserves: '1000',
  targetAssetReserves: '2000',
  priceUSD: '2.5',
  strategicBonusApy: '0.125',
});

const createSubsquidPool = () => ({
  baseAsset: {
    id: 'base-c',
  },
  targetAsset: {
    id: 'target-c',
  },
  baseAssetReserves: '3000',
  targetAssetReserves: '4000',
  priceUSD: null,
  strategicBonusApy: null,
});
