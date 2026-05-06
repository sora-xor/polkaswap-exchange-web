import { getCurrentIndexer, SubqueryIndexer, SubsquidIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { gql } from '@urql/core';

import type { ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

const SubqueryNominatorsCountQuery = gql<ConnectionQueryResponse<number>>`
  query NominatorsCountQuery {
    data: stakingStakers(orderBy: ID_DESC) {
      totalCount
    }
  }
`;

const SubsquidNominatorsCountQuery = gql<ConnectionQueryResponse<number>>`
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
