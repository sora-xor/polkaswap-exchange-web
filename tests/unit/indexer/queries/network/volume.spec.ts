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

  it('fetches precomputed Polkaswap volume snapshots and parses volumeUSD values', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '88.5', '0')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(false, 2_000, 1_000, SnapshotTypes.DAY);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        from: 2_000,
        to: 1_000,
        type: SnapshotTypes.DAY,
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_700_000);
    expect(result[0]?.value.toString()).toBe('88.5');
  });

  it('normalizes invalid and negative snapshot volume instead of propagating unsafe values', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1900', 'not-a-number', '0')),
      parse(createNetworkSnapshotEntity('1800', '-1', '0')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(false, 3_000, 2_000, SnapshotTypes.MONTH);

    expect(result.map((item) => item.value.toString())).toEqual(['0', '0']);
  });

  it('fetches Polkaswap fee snapshots and parses codec fee values', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '88.5', '1000000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(true, 2_000, 1_000, 'DAY' as any);

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
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_700_000);
    expect(result[0]?.value.toString()).toBe('1');
  });

  it('requests daily fee snapshots when monthly network fee history is requested', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await fetchData(true, 2_000, 1_000, SnapshotTypes.MONTH);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        from: 2_000,
        to: 1_000,
        type: SnapshotTypes.DAY,
      },
      expect.any(Function)
    );
  });

  it('requests daily volume snapshots when monthly network volume history is requested', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await fetchData(false, 2_000, 1_000, SnapshotTypes.MONTH);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        from: 2_000,
        to: 1_000,
        type: SnapshotTypes.DAY,
      },
      expect.any(Function)
    );
  });

  it('backfills missing daily volume buckets from non-zero BLOCK snapshots', async () => {
    const day = 24 * 60 * 60;
    const from = day * 3;
    const to = 0;

    indexerMocks.fetchAllEntities.mockImplementation(async (_query, variables, parse) => {
      if (variables.type === SnapshotTypes.DAY) {
        return [parse(createNetworkSnapshotEntity(String(from - 100), '5', '0'))];
      }

      if (variables.type === SnapshotTypes.BLOCK) {
        return [
          parse(createNetworkSnapshotEntity(String(day + 10), '1.25', '0')),
          parse(createNetworkSnapshotEntity(String(day + 20), '2.75', '0')),
          parse(createNetworkSnapshotEntity(String(from - 50), '7', '0')),
        ];
      }

      return [];
    });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(false, from, to, SnapshotTypes.DAY);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(2);
    expect(indexerMocks.fetchAllEntities).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      {
        from,
        to,
        type: SnapshotTypes.BLOCK,
      },
      expect.any(Function)
    );
    expect(result.find((item) => item.timestamp === day * 1000)?.value.toString()).toBe('4');
    expect(result.find((item) => item.timestamp === (from - 100) * 1000)?.value.toString()).toBe('5');
    expect(result.find((item) => item.value.toString() === '7')).toBeUndefined();
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

  it('does not fetch block backfill when daily aggregate fee snapshots cover the range', async () => {
    const day = 24 * 60 * 60;
    const from = day * 2;
    const to = 0;

    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity(String(from - 100), '0', '11000000000000000000')),
      parse(createNetworkSnapshotEntity(String(from - day - 100), '0', '22000000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchData(true, from, to, 'DAY' as any);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledTimes(1);
    expect(result.map((item) => item.value.toString())).toEqual(['11', '22']);
  });

  it('returns an empty array when the active indexer returns null snapshot data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData(false, 2_000, 1_000, SnapshotTypes.HOUR)).resolves.toEqual([]);
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
