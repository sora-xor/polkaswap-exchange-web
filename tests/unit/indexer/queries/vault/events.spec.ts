import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchVaultEvents } from '@/indexer/queries/vault/events';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('vault events query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('returns an empty response without calling the indexer when vault id is missing', async () => {
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchVaultEvents({ id: '', first: 10, offset: 0 })).resolves.toEqual({
      totalCount: 0,
      items: [],
    });
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it('fetches Polkaswap vault events and parses amount and timestamp values', async () => {
    indexerMocks.fetchEntities.mockResolvedValue({
      totalCount: 2,
      edges: [
        { node: createVaultEvent('1', '12.5', 'Deposit', 1_700_000_001) },
        { node: createVaultEvent('2', null, 'Liquidated', 1_700_000_002) },
      ],
    });
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchVaultEvents({ id: 42, first: 25, offset: 50, fromTimestamp: 1_700_000_000 });

    expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
      first: 25,
      offset: 50,
      filter: {
        vaultId: {
          equalTo: '42',
        },
        timestamp: {
          greaterThan: 1_700_000_000,
        },
      },
    });
    expect(result.totalCount).toBe(2);
    expect(result.items[0]?.amount?.toString()).toBe('12.5');
    expect(result.items[0]?.timestamp).toBe(1_700_000_001_000);
    expect(result.items[0]?.type).toBe('Deposit');
    expect(result.items[1]?.amount).toBeNull();
  });


  it('returns an empty response when the indexer returns no vault event data', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchVaultEvents({ id: 42, first: 10, offset: 0 })).resolves.toEqual({
      totalCount: 0,
      items: [],
    });
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

const createVaultEvent = (id: string, amount: string | null, type: string, timestamp: number) => ({
  id,
  amount,
  type,
  timestamp,
});
