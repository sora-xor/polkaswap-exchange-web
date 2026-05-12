import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { VaultEvent } from '@/modules/vault/types';
import type { FetchVariables } from '@/types/indexers';

import type { ConnectionQueryResponse, VaultEventBaseEntity } from '@/lib/soraneo-wallet/src/services/indexer/types';

const PolkaswapVaultDetailsQuery = gql<ConnectionQueryResponse<VaultEventBaseEntity>>`
  query VaultDetailsQuery($first: Int = null, $offset: Int = null, $filter: VaultEventFilter) {
    data: vaultEvents(first: $first, offset: $offset, filter: $filter, orderBy: [TIMESTAMP_DESC, ID_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          id
          amount
          type
          timestamp
        }
      }
    }
  }
`;

const polkaswapVaultEventsFilter = (vaultId: string | number, fromTimestamp?: number) => {
  const filter: any = { vaultId: { equalTo: String(vaultId) } };

  if (fromTimestamp) filter.timestamp = { greaterThan: fromTimestamp };

  return filter;
};

const parseVaultEvents = (event: VaultEventBaseEntity): VaultEvent => {
  return {
    amount: event.amount ? new FPNumber(event.amount) : null,
    timestamp: event.timestamp * 1000,
    type: event.type,
  };
};

export async function fetchVaultEvents(variables: FetchVariables): Promise<{
  totalCount: number;
  items: VaultEvent[];
}> {
  const { id, first, offset, fromTimestamp } = variables;

  let totalCount = 0;
  let items: VaultEvent[] = [];

  if (!id) return { totalCount, items };

  const filter = polkaswapVaultEventsFilter(id, fromTimestamp);
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const response = await polkaswapIndexer.services.explorer.fetchEntities(PolkaswapVaultDetailsQuery, {
    first,
    offset,
    filter,
  });

  if (response) {
    totalCount = response.totalCount;
    items = response.edges.map((edge) => parseVaultEvents(edge.node));
  }

  return { totalCount, items };
}
