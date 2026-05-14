import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/network/tvl';
import { retryOnEmptyResult } from '@/indexer/queries/retry';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

vi.mock('@/indexer/queries/retry', () => ({
  retryOnEmptyResult: vi.fn(async (request, isEmpty) => {
    const result = await request();
    isEmpty(result);
    return result;
  }),
}));

describe('network tvl query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap tvl snapshots and parses finite liquidity values', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '123.45')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(2_000, 1_000, 'DAY' as any);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        from: 2_000,
        to: 1_000,
        type: 'DAY',
      },
      expect.any(Function)
    );
    expect(result).toEqual([
      {
        timestamp: 1_700_000,
        value: 123.45,
      },
    ]);
  });


  it('normalizes non-finite liquidity values to zero', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1900', 'not-a-number')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData(3_000, 2_000, 'DAY' as any)).resolves.toEqual([
      {
        timestamp: 1_900_000,
        value: 0,
      },
    ]);
  });

  it('returns an empty array when the active indexer returns null data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData(2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
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

const createNetworkSnapshotEntity = (timestamp: string, liquidityUSD: string) => ({
  timestamp,
  liquidityUSD,
});
