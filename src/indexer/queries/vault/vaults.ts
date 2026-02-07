import { FPNumber } from '@sora-substrate/sdk';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { getCurrentIndexer } from '@wallet';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { SubqueryIndexer, SubsquidIndexer } from '@wallet/lib/services/indexer';
import { gql } from '@urql/core';

import type { ClosedVault } from '@/modules/vault/types';

import type { SubqueryVaultEntity } from '@wallet/lib/services/indexer/subquery/types';
import type { SubsquidVaultEntity } from '@wallet/lib/services/indexer/subsquid/types';
import type { ConnectionQueryResponse } from '@wallet/lib/services/indexer/types';

const SubqueryClosedVaultsQuery = gql<ConnectionQueryResponse<SubqueryVaultEntity>>`
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

const SubsquidClosedVaultsQuery = gql<ConnectionQueryResponse<SubsquidVaultEntity>>`
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

const parseSubqueryVault = (vault: SubqueryVaultEntity): ClosedVault => {
  return {
    id: +vault.id,
    vaultType: vault.type === 'Type1' ? VaultTypes.V1 : VaultTypes.V2,
    status: vault.status,
    returned: new FPNumber(vault.collateralAmountReturned ?? 0),
    lockedAssetId: vault.collateralAssetId,
    debtAssetId: vault.debtAssetId,
  };
};

const parseSubsquidVault = (vault: SubsquidVaultEntity): ClosedVault => {
  return {
    id: +vault.id,
    vaultType: vault.type === 'Type1' ? VaultTypes.V1 : VaultTypes.V2,
    status: vault.status,
    returned: new FPNumber(vault.collateralAmountReturned ?? 0),
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
