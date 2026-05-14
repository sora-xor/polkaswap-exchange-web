import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { getReferralRewards } from '@/indexer/queries/referrals';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('referral reward queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap referral rewards with an equalTo referrer filter and aggregates duplicate referrals', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([
      createRewardEntity('alice', 1),
      createRewardEntity('bob', 2.5),
      createRewardEntity('alice', 0.5),
    ]);
    indexerMocks.currentIndexer = {
      type: IndexerType.POLKASWAP,
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
    expect(result?.rewards.toString()).toBe('4');
    expect(result?.invitedUserRewards.alice.toString()).toBe('1.5');
    expect(result?.invitedUserRewards.bob.toString()).toBe('2.5');
  });


  it('omits the referrer filter when no referrer is supplied and returns zero totals for empty results', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = {
      type: IndexerType.POLKASWAP,
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


  });

const createRewardEntity = (referral: string, naturalAmount: number) => ({
  referral,
  amount: FPNumber.fromNatural(naturalAmount, XOR.decimals).codec,
});
