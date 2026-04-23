import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/staking/nominators';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
  fetchEntitiesConnection: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
  SubsquidIndexer: class SubsquidIndexer {},
}));

describe('staking nominators count query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches the nominators count from SubQuery', async () => {
    indexerMocks.fetchEntities.mockResolvedValue({ totalCount: 12 });
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchData()).resolves.toBe(12);

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object));
    expect(indexerMocks.fetchEntitiesConnection).not.toHaveBeenCalled();
  });

  it('fetches the nominators count from Subsquid', async () => {
    indexerMocks.fetchEntitiesConnection.mockResolvedValue({ totalCount: 34 });
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchData()).resolves.toBe(34);

    expect(indexerMocks.fetchEntitiesConnection).toHaveBeenCalledWith(expect.any(Object));
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it('returns undefined when the active indexer returns no count response', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchData()).resolves.toBeUndefined();
  });

  it('returns undefined for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchData()).resolves.toBeUndefined();
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchEntitiesConnection).not.toHaveBeenCalled();
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchEntities: indexerMocks.fetchEntities,
      fetchEntitiesConnection: indexerMocks.fetchEntitiesConnection,
    },
  },
});
