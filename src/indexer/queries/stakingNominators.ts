import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { SubsquidConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import { gql } from '@urql/core';

import type { SubqueryConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryNominatorsCountQuery = gql<SubqueryConnectionQueryResponse<number>>`
  query NominatorsCountQuery($era: Int) {
    data: stakingEraNominators(orderBy: ID_DESC, filter: { era: { index: { equalTo: $era } } }) {
      totalCount
    }
  }
`;

const SubsquidNominatorsCountQuery = gql<SubsquidConnectionQueryResponse<number>>`
  query NominatorsCountQuery($era: Int) {
    data: stakingEraNominatorsConnection(orderBy: id_DESC, where: { era: { index_eq: $era } }) {
      totalCount
    }
  }
`;

export async function fetchData(era: number): Promise<Nullable<number>> {
  const indexer = getCurrentIndexer();
  let data: Nullable<number>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = (await subqueryIndexer.services.explorer.fetchEntities(SubqueryNominatorsCountQuery, { era }))?.totalCount;
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = (await subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidNominatorsCountQuery, { era }))
        ?.totalCount;
      break;
    }
  }

  return data;
}
