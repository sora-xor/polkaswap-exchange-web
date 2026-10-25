import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

const PolkaswapNominatorsCountQuery = gql<ConnectionQueryResponse<number>>`
  query NominatorsCountQuery {
    data: stakingStakers(orderBy: ID_DESC) {
      totalCount
    }
  }
`;

export async function fetchData(): Promise<Nullable<number>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  return (await polkaswapIndexer.services.explorer.fetchEntities(PolkaswapNominatorsCountQuery))?.totalCount;
}
