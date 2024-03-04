import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { ConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryRewardsQuery = gql<ConnectionQueryResponse<number>>`
  query RewardsQuery($address: string) {
    data: historyElements(
      orderBy: id_DESC
      where: { address_eq: $address, method: { equalTo: "rewarded" }, module: { equalTo: "staking" } }
    ) {
      id
      data
    }
  }
`;

const SubsquidRewardsQuery = gql<ConnectionQueryResponse<number>>`
  query RewardsQuery($address: string) {
    data: historyElementsConnection(
      orderBy: id_DESC
      where: { address_eq: $address, method_eq: "rewarded", module_eq: "staking" }
    ) {
      id
      data
    }
  }
`;

export async function fetchData(): Promise<Nullable<number>> {
  const indexer = getCurrentIndexer();
  let data: Nullable<number>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = (await subqueryIndexer.services.explorer.fetchEntities(SubqueryRewardsQuery))?.totalCount;
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = (await subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidRewardsQuery))?.totalCount;
      break;
    }
  }

  return data;
}
