import { requireEntitlements } from './capabilities';
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { ConnectionQueryResponse, ReferrerRewardEntity } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type ReferrerRewards = {
  rewards: FPNumber;
  invitedUserRewards: {
    [key: string]: FPNumber;
  };
};

const PolkaswapReferrerRewardsQuery = gql<ConnectionQueryResponse<ReferrerRewardEntity>>`
  query PolkaswapReferrerRewardsQuery($first: Int = 100, $filter: ReferrerRewardFilter, $after: Cursor = "") {
    data: referrerRewards(first: $first, filter: $filter, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          referral
          amount
        }
      }
    }
  }
`;

/**
 * Get Referral Rewards summarized by referral
 */
export async function getReferralRewards(
  referrer?: string,
  indexer?: PolkaswapIndexer
): Promise<Nullable<ReferrerRewards>> {
  const filter = referrer ? { referrer: { equalTo: referrer } } : undefined;
  const { indexer: polkaswapIndexer } = await requireEntitlements(indexer ?? getCurrentIndexer());
  const result = await polkaswapIndexer.services.explorer.fetchAllEntities(PolkaswapReferrerRewardsQuery, { filter });

  if (!result) return null;
  await requireEntitlements(polkaswapIndexer);

  return result.reduce<ReferrerRewards>(
    (acc, node) => {
      const { referral, amount } = node;
      const value = FPNumber.fromCodecValue(amount, XOR.decimals);

      acc.rewards = acc.rewards.add(value);
      acc.invitedUserRewards[referral] = (acc.invitedUserRewards[referral] ?? FPNumber.ZERO).add(value);

      return acc;
    },
    {
      rewards: FPNumber.ZERO,
      invitedUserRewards: {},
    }
  );
}
