import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { VaultEvent } from '@/modules/vault/types';
import type { FetchVariables } from '@/types/indexers';

import type { SubsquidQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import type {
  ConnectionQueryResponse,
  VaultEventBaseEntity,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryVaultDetailsQuery = gql<ConnectionQueryResponse<VaultEventBaseEntity>>`
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

const SubsquidVaultDetailsQuery = gql<SubsquidQueryResponse<VaultEventBaseEntity>>`
  query VaultDetailsQuery($first: Int = null, $offset: Int = null, $filter: VaultEventWhereInput) {
    info: vaultEventsConnection(first: 0, where: $filter, orderBy: [timestamp_DESC, id_DESC]) {
      totalCount
    }
    nodes: vaultEvents(limit: $first, offset: $offset, where: $filter, orderBy: [timestamp_DESC, id_DESC]) {
      id
      amount
      type
      timestamp
    }
  }
`;

const subqueryVaultEventsFilter = (vaultId: string | number, fromTimestamp?: number) => {
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
  const indexer = getCurrentIndexer();
  const { id, first, offset, fromTimestamp } = variables;

  let totalCount = 0;
  let items: VaultEvent[] = [];

  if (!id) return { totalCount, items };

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryVaultEventsFilter(id, fromTimestamp);
      const variables = { first, offset, filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const response = await subqueryIndexer.services.explorer.fetchEntities(SubqueryVaultDetailsQuery, variables);
      if (response) {
        totalCount = response.totalCount;
        items = response.edges.map((edge) => parseVaultEvents(edge.node));
      }
      break;
    }
    case IndexerType.SUBSQUID: {
      const filter = subqueryVaultEventsFilter(id, fromTimestamp);
      const variables = { first, offset, filter };
      const subsquidIndexer = indexer as SubsquidIndexer;
      const response = await subsquidIndexer.services.explorer.fetchEntities(SubsquidVaultDetailsQuery, variables);
      if (response) {
        totalCount = response.totalCount;
        items = response.nodes.map((edge) => parseVaultEvents(edge));
      }
      break;
    }
  }

  return { totalCount, items };
}
