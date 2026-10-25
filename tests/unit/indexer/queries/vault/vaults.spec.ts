import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchClosedVaults } from '@/indexer/queries/vault/vaults';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('closed vaults query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap closed vaults and parses flat asset fields', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse({
        id: '101',
        type: 'Type1',
        status: 'Closed',
        collateralAssetId: 'xor',
        debtAssetId: 'kusd',
        collateralAmountReturned: '45.25',
      }),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchClosedVaults('account-1');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        account: 'account-1',
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 101,
      vaultType: VaultTypes.V1,
      status: 'Closed',
      lockedAssetId: 'xor',
      debtAssetId: 'kusd',
    });
    expect(result[0]?.returned.toString()).toBe('45.25');
  });


  it('returns an empty list when the active indexer has no closed vaults', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchClosedVaults('account-1')).resolves.toEqual([]);
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
