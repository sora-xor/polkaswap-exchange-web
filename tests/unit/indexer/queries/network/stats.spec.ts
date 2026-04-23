import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/network/stats';
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

describe('network stats query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery network snapshots and converts numeric fields to FPNumbers', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1700', '11', '22', '3', '4')),
    ]);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBQUERY,
      services: {
        explorer: {
          fetchAllEntities: indexerMocks.fetchAllEntities,
        },
      },
    };

    const result = await fetchData(2_000, 1_000, 'DAY' as any);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(expect.any(Object), {
      from: 2_000,
      to: 1_000,
      type: 'DAY',
    }, expect.any(Function));
    expect(result).toHaveLength(1);
    expect(result[0]?.timestamp).toBe(1_700_000);
    expect(result[0]?.accounts.toString()).toBe('11');
    expect(result[0]?.transactions.toString()).toBe('22');
    expect(result[0]?.bridgeIncomingTransactions.toString()).toBe('3');
    expect(result[0]?.bridgeOutgoingTransactions.toString()).toBe('4');
  });

  it('fetches Subsquid network snapshots through the connection endpoint', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createNetworkSnapshotEntity('1800', '100.5', '200.25', '7.75', '8.5')),
    ]);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBSQUID,
      services: {
        explorer: {
          fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
        },
      },
    };

    const result = await fetchData(3_000, 2_000, 'HOUR' as any);

    expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), {
      from: 3_000,
      to: 2_000,
      type: 'HOUR',
    }, expect.any(Function));
    expect(result[0]?.timestamp).toBe(1_800_000);
    expect(result[0]?.accounts.toString()).toBe('100.5');
    expect(result[0]?.transactions.toString()).toBe('200.25');
    expect(result[0]?.bridgeIncomingTransactions.toString()).toBe('7.75');
    expect(result[0]?.bridgeOutgoingTransactions.toString()).toBe('8.5');
  });

  it('returns an empty array when the active indexer returns null data', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBQUERY,
      services: {
        explorer: {
          fetchAllEntities: indexerMocks.fetchAllEntities,
        },
      },
    };

    await expect(fetchData(2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
  });

  it('returns an empty array for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = {
      type: 'unknown',
      services: {
        explorer: {},
      },
    };

    await expect(fetchData(2_000, 1_000, 'DAY' as any)).resolves.toEqual([]);
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(retryOnEmptyResult).not.toHaveBeenCalled();
  });
});

const createNetworkSnapshotEntity = (
  timestamp: string,
  accounts: string,
  transactions: string,
  bridgeIncomingTransactions: string,
  bridgeOutgoingTransactions: string
) => ({
  timestamp,
  accounts,
  transactions,
  bridgeIncomingTransactions,
  bridgeOutgoingTransactions,
});
