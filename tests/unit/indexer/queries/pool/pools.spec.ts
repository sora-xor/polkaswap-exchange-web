import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchPoolsData } from '@/indexer/queries/pool/pools';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('pool list query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap pools with target asset filters and parses numeric fields', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createPolkaswapPool()),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

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

  it('fetches Polkaswap pools without a target asset filter when assets are omitted', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

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



  });

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
    },
  },
});

const createPolkaswapPool = () => ({
  baseAssetId: 'base-a',
  targetAssetId: 'target-a',
  baseAssetReserves: '1000',
  targetAssetReserves: '2000',
  priceUSD: '2.5',
  strategicBonusApy: '0.125',
});
