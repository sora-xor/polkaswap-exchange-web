import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { SubsquidConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import { gql } from '@urql/core';

import type { SubqueryConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryNominatorsCountQuery = gql<SubqueryConnectionQueryResponse<number>>`
  query NominatorsCountQuery {
    data: stakingStakers(orderBy: ID_DESC) {
      totalCount
    }
  }
`;

const SubsquidNominatorsCountQuery = gql<SubsquidConnectionQueryResponse<number>>`
  query NominatorsCountQuery {
    data: stakingStakersConnection(orderBy: id_DESC) {
      totalCount
    }
  }
`;

export async function fetchData(): Promise<Nullable<number>> {
  const indexer = getCurrentIndexer();
  let data: Nullable<number>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = (await subqueryIndexer.services.explorer.fetchEntities(SubqueryNominatorsCountQuery))?.totalCount;
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = (await subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidNominatorsCountQuery))
        ?.totalCount;
      break;
    }
  }

  return data;
}
