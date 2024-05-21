import { FPNumber } from '@sora-substrate/util';
import { VaultTypes } from '@sora-substrate/util/build/kensetsu/consts';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { IndexerVault, ClosedVault, VaultEvent, IndexerVaultEvent } from '@/modules/vault/types';

import type { ConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const ClosedVaultsQuery = gql<ConnectionQueryResponse<IndexerVault>>`
  query ($account: String, $after: Cursor = "", $first: Int = 100) {
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

const parseVaults = (vault: IndexerVault): ClosedVault => {
  return {
    id: +vault.id,
    vaultType: vault.type === 'Type1' ? VaultTypes.V1 : VaultTypes.V2,
    status: vault.status,
    returned: new FPNumber(vault.collateralAmountReturned),
    lockedAssetId: vault.collateralAssetId,
    debtAssetId: vault.debtAssetId,
  };
};

export async function fetchClosedVaults(account: string): Promise<ClosedVault[]> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const variables = { account };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(ClosedVaultsQuery, variables, parseVaults);
      return items ?? [];
    }
    case IndexerType.SUBSQUID: {
      return [];
    }
  }

  return [];
}

const VaultDetailsQuery = gql<ConnectionQueryResponse<IndexerVaultEvent>>`
  query ($id: String, $after: Cursor = "", $first: Int = 100) {
    data: vaultEvents(first: $first, after: $after, filter: { vaultId: { equalTo: $id } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          amount
          type
          timestamp
        }
      }
    }
  }
`;

const parseVaultEvents = (event: IndexerVaultEvent): VaultEvent => {
  return {
    amount: event.amount ? new FPNumber(event.amount) : null,
    timestamp: event.timestamp * 1000,
    type: event.type,
  };
};

export async function fetchVaultEvents(vaultId: number | string): Promise<VaultEvent[]> {
  const indexer = getCurrentIndexer();
  const id = `${vaultId}`;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const variables = { id };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(
        VaultDetailsQuery,
        variables,
        parseVaultEvents
      );
      // Reverse to show the latest events first, we don't use orderBy to keep the order of events
      return items?.reverse() ?? [];
    }
    case IndexerType.SUBSQUID: {
      return [];
    }
  }

  return [];
}
