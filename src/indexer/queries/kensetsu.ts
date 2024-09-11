import { FPNumber } from '@sora-substrate/sdk';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { SubsquidQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import { gql } from '@urql/core';

import type { SubqueryVault, SubsquidVault, ClosedVault, VaultEvent, IndexerVaultEvent } from '@/modules/vault/types';
import type { FetchVariables } from '@/types/indexers';

import type { ConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const SubqueryClosedVaultsQuery = gql<ConnectionQueryResponse<SubqueryVault>>`
  query ClosedVaultsQuery($account: String, $after: Cursor = "", $first: Int = 100) {
    data: vaults(
      first: $first
      after: $after
      filter: { ownerId: { equalTo: $account }, status: { in: [Closed, Liquidated] } }
      orderBy: UPDATED_AT_BLOCK_DESC
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          type
          status
          collateralAssetId
          debtAssetId
          collateralAmountReturned
        }
      }
    }
  }
`;

const SubsquidClosedVaultsQuery = gql<ConnectionQueryResponse<SubsquidVault>>`
  query ClosedVaultsQuery($account: String, $after: String = null, $first: Int = 100) {
    data: vaultsConnection(
      first: $first
      after: $after
      where: { AND: [{ owner: { id_eq: $account } }, { status_in: [Closed, Liquidated] }] }
      orderBy: updatedAtBlock_DESC
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          type
          status
          collateralAsset {
            id
          }
          debtAsset {
            id
          }
          collateralAmountReturned
        }
      }
    }
  }
`;

const parseSubqueryVault = (vault: SubqueryVault): ClosedVault => {
  return {
    id: +vault.id,
    vaultType: vault.type === 'Type1' ? VaultTypes.V1 : VaultTypes.V2,
    status: vault.status,
    returned: new FPNumber(vault.collateralAmountReturned),
    lockedAssetId: vault.collateralAssetId,
    debtAssetId: vault.debtAssetId,
  };
};

const parseSubsquidVault = (vault: SubsquidVault): ClosedVault => {
  return {
    id: +vault.id,
    vaultType: vault.type === 'Type1' ? VaultTypes.V1 : VaultTypes.V2,
    status: vault.status,
    returned: new FPNumber(vault.collateralAmountReturned),
    lockedAssetId: vault.collateralAsset.id,
    debtAssetId: vault.debtAsset.id,
  };
};

export async function fetchClosedVaults(account: string): Promise<ClosedVault[]> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const variables = { account };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryClosedVaultsQuery,
        variables,
        parseSubqueryVault
      );
      return items ?? [];
    }
    case IndexerType.SUBSQUID: {
      const variables = { account };
      const subsquidIndexer = indexer as SubsquidIndexer;
      const items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidClosedVaultsQuery,
        variables,
        parseSubsquidVault
      );
      return items ?? [];
    }
  }

  return [];
}

const SubqueryVaultDetailsQuery = gql<ConnectionQueryResponse<IndexerVaultEvent>>`
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

const SubsquidVaultDetailsQuery = gql<SubsquidQueryResponse<IndexerVaultEvent>>`
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

const parseVaultEvents = (event: IndexerVaultEvent): VaultEvent => {
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
