import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchClosedVaults } from '@/indexer/queries/vault/vaults';

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

describe('closed vaults query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery closed vaults and parses flat asset fields', async () => {
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
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    const result = await fetchClosedVaults('account-1');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        account: 'account-1',
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
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

  it('fetches Subsquid closed vaults and parses nested asset fields with zero returned fallback', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse({
        id: '202',
        type: 'Type2',
        status: 'Liquidated',
        collateralAsset: {
          id: 'val',
        },
        debtAsset: {
          id: 'kusd',
        },
        collateralAmountReturned: null,
      }),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchClosedVaults('account-2');

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        account: 'account-2',
      },
      expect.any(Function)
    );
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 202,
      vaultType: VaultTypes.V2,
      status: 'Liquidated',
      lockedAssetId: 'val',
      debtAssetId: 'kusd',
    });
    expect(result[0]?.returned.toString()).toBe('0');
  });

  it('returns an empty list when the active indexer has no closed vaults', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

    await expect(fetchClosedVaults('account-1')).resolves.toEqual([]);
  });

  it('returns an empty list for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchClosedVaults('account-1')).resolves.toEqual([]);
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
