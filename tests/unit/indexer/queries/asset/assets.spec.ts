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
      expect.any(Function),
      { requestPolicy: 'network-only', retryPendingCore: true }
    );
    expect(result['asset-a']?.priceUSD.toString()).toBe('2');
    expect(result['asset-a']?.tvlUSD.toString()).toBe('6');
    expect(result['asset-a']?.priceChangeDay.toString()).toBe('0.05');
    expect(result['asset-a']?.velocity.toString()).toBe('1.25');
  });

  it('keeps token-native precision and distinguishes missing marks from true zero liquidity and exact zero prices', async () => {
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);
    indexerMocks.currentIndexer.services.explorer.supportsExactPrices.mockResolvedValue(true);
    indexerMocks.fetchAllEntities.mockImplementation(async (query, _variables, parse) => {
      expect(JSON.stringify(query.definitions)).toContain('priceUSDExact');
      return [
        parse({ ...createAssetEntity('tiny', '0', '125', '0'), priceUSDExact: '0.000000000340941693' }),
        parse({ ...createAssetEntity('unknown', '0', '1', '2'), priceUSDExact: null }),
        parse({ ...createAssetEntity('empty', '0', '0', '0'), priceUSDExact: null }),
        parse({ ...createAssetEntity('zero', '1', '1', '0'), priceUSDExact: '0' }),
      ];
    });
    const result = await fetchTokensData(
      ['tiny', 'unknown', 'empty', 'zero'].map((address) => ({ address, decimals: 2 })) as never
    );
    expect(result.tiny.priceUSD?.toCodecString()).toBe('340941693');
    expect(result.tiny.tvlUSD?.toString()).toBe('0.00000000042617711625');
    expect(result.unknown.tvlUSD).toBeNull();
    expect(result.unknown.priceUSD).toBeNull();
    expect(result.unknown.volumeDayUSD.toString()).toBe('10.5');
    expect(result.empty.tvlUSD?.toString()).toBe('0');
    expect(result.zero.priceUSD?.toString()).toBe('0');
    expect(result.zero.tvlUSD?.toString()).toBe('0');
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
      supportsExactPrices: vi.fn().mockResolvedValue(false),
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
