import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { getReferralRewards } from '@/indexer/queries/referrals';

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

describe('referral reward queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery referral rewards with an equalTo referrer filter and aggregates duplicate referrals', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([
      createRewardEntity('alice', 1),
      createRewardEntity('bob', 2.5),
      createRewardEntity('alice', 0.5),
    ]);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBQUERY,
      services: {
        explorer: {
          fetchAllEntities: indexerMocks.fetchAllEntities,
        },
      },
    };

    const result = await getReferralRewards('referrer-address');

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(expect.any(Object), {
      filter: { referrer: { equalTo: 'referrer-address' } },
    });
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
    expect(result?.rewards.toString()).toBe('4');
    expect(result?.invitedUserRewards.alice.toString()).toBe('1.5');
    expect(result?.invitedUserRewards.bob.toString()).toBe('2.5');
  });

  it('fetches Subsquid referral rewards with an equality referrer filter', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue([createRewardEntity('charlie', 3)]);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBSQUID,
      services: {
        explorer: {
          fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
        },
      },
    };

    const result = await getReferralRewards('referrer-address');

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), {
      filter: { referrer_eq: 'referrer-address' },
    });
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(result?.rewards.toString()).toBe('3');
    expect(result?.invitedUserRewards.charlie.toString()).toBe('3');
  });

  it('omits the referrer filter when no referrer is supplied and returns zero totals for empty results', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBQUERY,
      services: {
        explorer: {
          fetchAllEntities: indexerMocks.fetchAllEntities,
        },
      },
    };

    const result = await getReferralRewards();

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(expect.any(Object), { filter: undefined });
    expect(result?.rewards.toString()).toBe('0');
    expect(result?.invitedUserRewards).toEqual({});
  });

  it('returns null when the active indexer has no referral reward data', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue(null);
    indexerMocks.currentIndexer = {
      type: IndexerType.SUBSQUID,
      services: {
        explorer: {
          fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
        },
      },
    };

    await expect(getReferralRewards()).resolves.toBeNull();
    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(expect.any(Object), { filter: undefined });
  });

  it('returns null for unsupported indexer types without issuing a request', async () => {
    indexerMocks.currentIndexer = {
      type: 'unknown',
      services: {
        explorer: {},
      },
    };

    await expect(getReferralRewards('referrer-address')).resolves.toBeNull();
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
  });
});

const createRewardEntity = (referral: string, naturalAmount: number) => ({
  referral,
  amount: FPNumber.fromNatural(naturalAmount, XOR.decimals).codec,
});
