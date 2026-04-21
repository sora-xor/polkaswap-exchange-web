import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { getCurrentIndexer, SubqueryIndexer, SubsquidIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { gql } from '@urql/core';

import type { ConnectionQueryResponse, ReferrerRewardEntity } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type ReferrerRewards = {
  rewards: FPNumber;
  invitedUserRewards: {
    [key: string]: FPNumber;
  };
};

const SubqueryReferrerRewardsQuery = gql<ConnectionQueryResponse<ReferrerRewardEntity>>`
  query SubqueryReferrerRewardsQuery($first: Int = 100, $filter: ReferrerRewardFilter, $after: Cursor = "") {
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

const SubsquidReferrerRewardsQuery = gql<ConnectionQueryResponse<ReferrerRewardEntity>>`
  query SubsquidReferrerRewardsQuery($first: Int = 1000, $filter: ReferrerRewardWhereInput, $after: String = null) {
    data: referrerRewardsConnection(orderBy: id_ASC, first: $first, where: $filter, after: $after) {
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
export async function getReferralRewards(referrer?: string): Promise<Nullable<ReferrerRewards>> {
  const indexer = getCurrentIndexer();

  let result!: Nullable<ReferrerRewardEntity[]>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = referrer ? { referrer: { equalTo: referrer } } : undefined;
      const variables = { filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
      result = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryReferrerRewardsQuery, variables);
      break;
    }
    case IndexerType.SUBSQUID: {
      const filter = referrer ? { referrer_eq: referrer } : undefined;
      const variables = { filter };
      const subsquidIndexer = indexer as SubsquidIndexer;
      result = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidReferrerRewardsQuery,
        variables
      );
      break;
    }
  }

  if (!result) return null;

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
