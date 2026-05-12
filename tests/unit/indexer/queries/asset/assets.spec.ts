import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchTokensData } from '@/indexer/queries/asset/assets';

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

  it('fetches Polkaswap token stats with asset filters and combines pool/book liquidity', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createAssetEntity('asset-a', '2', '1000000000000000000', '2000000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

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
    expect(result['asset-a']?.priceUSD.toString()).toBe('2');
    expect(result['asset-a']?.tvlUSD.toString()).toBe('6');
    expect(result['asset-a']?.priceChangeDay.toString()).toBe('0.05');
    expect(result['asset-a']?.velocity.toString()).toBe('1.25');
  });

  
  
  it('returns an empty map when retry resolves with no token data', async () => {
    retryMocks.retryOnEmptyResult.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchTokensData([{ address: 'asset-a' }] as any)).resolves.toEqual({});
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
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
