import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { ConnectionQueryResponse, HistoryElement } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryRewardsQuery = gql<ConnectionQueryResponse<HistoryElement>>`
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

const SubsquidRewardsQuery = gql<ConnectionQueryResponse<HistoryElement>>`
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

export async function fetchData(): Promise<Nullable<HistoryElement[]>> {
  const indexer = getCurrentIndexer();
  let data: Nullable<HistoryElement[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryRewardsQuery);
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidRewardsQuery);
      break;
    }
  }

  return data;
}
