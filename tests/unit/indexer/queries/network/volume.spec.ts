import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/network/volume';
import { retryOnEmptyResult } from '@/indexer/queries/retry';

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

  it('fetches SubQuery volume snapshots and parses volumeUSD values', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '88.5', '1000000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

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
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_700_000);
    expect(result[0]?.value.toString()).toBe('88.5');
  });

  it('fetches Subsquid fee snapshots and parses codec fee values', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1800', '10', '2500000000000000000')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchData(true, 3_000, 2_000, 'HOUR' as any);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        fees: true,
        from: 3_000,
        to: 2_000,
        type: 'HOUR',
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_800_000);
    expect(result[0]?.value.toString()).toBe('2.5');
  });

  it('normalizes non-finite volume values to zero', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1900', 'not-a-number', '0')),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchData(false, 3_000, 2_000, 'DAY' as any);

    expect(result[0]?.timestamp).toBe(1_900_000);
    expect(result[0]?.value.toString()).toBe('0');
  });

  it('returns an empty array when the active indexer returns null data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchData(false, 2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
  });

  it('returns an empty array for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchData(false, 2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
    expect(retryOnEmptyResult).not.toHaveBeenCalled();
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

const createNetworkSnapshotEntity = (timestamp: string, volumeUSD: string, fees: string) => ({
  timestamp,
  volumeUSD,
  fees,
});
