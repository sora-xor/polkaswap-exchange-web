import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchData } from '@/indexer/queries/staking/nominators';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('staking nominators count query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches the nominators count from Polkaswap', async () => {
    indexerMocks.fetchEntities.mockResolvedValue({ totalCount: 12 });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData()).resolves.toBe(12);

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object));
  });

  
  it('returns undefined when the active indexer returns no count response', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchData()).resolves.toBeUndefined();
  });

  });

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchEntities: indexerMocks.fetchEntities,
    },
  },
});
