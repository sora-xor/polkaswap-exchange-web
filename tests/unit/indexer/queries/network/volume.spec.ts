import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/network/volume';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { SnapshotTypes } from '@/lib/soraneo-wallet/src/services/indexer/types';

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

describe('network volume query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap volume snapshots and parses volumeUSD values', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '88.5', '1000000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(false, 2_000, 1_000, 'DAY' as any);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        fees: false,
        from: 2_000,
        to: 1_000,
        type: 'DAY',
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_700_000);
    expect(result[0]?.value.toString()).toBe('88.5');
  });

  it('requests daily snapshots when monthly network volume history is requested', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await fetchData(false, 2_000, 1_000, SnapshotTypes.MONTH);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        fees: false,
        from: 2_000,
        to: 1_000,
        type: SnapshotTypes.DAY,
      },
      expect.any(Function)
    );
  });


  it('normalizes non-finite volume values to zero', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1900', 'not-a-number', '0')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(false, 3_000, 2_000, 'DAY' as any);

    expect(result[0]?.timestamp).toBe(1_900_000);
    expect(result[0]?.value.toString()).toBe('0');
  });

  it('backfills missing daily fee buckets from non-zero block snapshots', async () => {
    const day = 24 * 60 * 60;
    const from = day * 3;
    const to = 0;

    indexerMocks.fetchAllEntities.mockImplementation(async (_query, variables, parse) => {
      if (variables.type === 'DAY') {
        return [parse(createNetworkSnapshotEntity(String(from - 100), '0', '5000000000000000000'))];
      }

      if (variables.type === 'BLOCK') {
        return [
          parse(createNetworkSnapshotEntity(String(day + 10), '0', '1000000000000000000')),
          parse(createNetworkSnapshotEntity(String(day + 20), '0', '2000000000000000000')),
          parse(createNetworkSnapshotEntity(String(from - 50), '0', '7000000000000000000')),
        ];
      }

      return [];
    });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(true, from, to, 'DAY' as any);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(2);
    expect(indexerMocks.fetchAllEntities).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      {
        from,
        to,
        type: 'BLOCK',
      },
      expect.any(Function)
    );
    expect(result.find((item) => item.timestamp === day * 1000)?.value.toString()).toBe('3');
    expect(result.find((item) => item.timestamp === (from - 100) * 1000)?.value.toString()).toBe('5');
    expect(result.find((item) => item.value.toString() === '7')).toBeUndefined();
  });

  it('does not fetch block backfill when daily aggregate snapshots cover the range', async () => {
    const day = 24 * 60 * 60;
    const from = day * 2;
    const to = 0;

    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity(String(from - 100), '11', '0')),
      parse(createNetworkSnapshotEntity(String(from - day - 100), '22', '0')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(false, from, to, 'DAY' as any);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(1);
    expect(result.map((item) => item.value.toString())).toEqual(['11', '22']);
  });

  it('returns an empty array when the active indexer returns null data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData(false, 2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
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

const createNetworkSnapshotEntity = (timestamp: string, volumeUSD: string, fees: string) => ({
  timestamp,
  volumeUSD,
  fees,
});
